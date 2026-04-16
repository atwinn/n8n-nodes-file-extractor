import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';

import * as mammoth from 'mammoth';

export class ExtractFromFile implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Extract from File (Extended)',
        name: 'extractFromFileExtended',
        icon: 'fa:file-import',
        group: ['transform'],
        version: 1,
        description: 'Extract text from PDF, DOCX, and HTML files',
        defaults: { name: 'Extract from File (Extended)' },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Extract From PDF',
                        value: 'pdf',
                        description: 'Extracts text content and metadata from a PDF file',
                        action: 'Extract from PDF file',
                    },
                    {
                        name: 'Extract From DOCX',
                        value: 'docx',
                        description: 'Extracts plain text from a Word document (.docx)',
                        action: 'Extract from DOCX file',
                    },
                    {
                        name: 'Extract From HTML',
                        value: 'html',
                        description: 'Extracts plain text from an HTML file',
                        action: 'Extract from HTML file',
                    },
                ],
                default: 'pdf',
            },
            {
                displayName: 'Input Binary Field',
                name: 'binaryField',
                type: 'string',
                default: 'data',
                required: true,
                description: 'Name of the binary field containing the file to extract',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const results: INodeExecutionData[] = [];

        // Dynamic import pdfjs — ESM, phải dùng import() không dùng require()
        const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');

        // Fix workerSrc — import worker vào main thread thay vì spawn thread riêng
        // Đây là cách duy nhất hoạt động trong Node.js/n8n VM context
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker as any;

        for (let i = 0; i < items.length; i++) {
            const operation = this.getNodeParameter('operation', i) as string;
            const binaryField = this.getNodeParameter('binaryField', i) as string;

            // Check binary TRƯỚC khi gọi helper
            const binary = items[i].binary?.[binaryField];
            if (!binary) {
                throw new NodeOperationError(
                    this.getNode(),
                    `No binary data found in field "${binaryField}"`,
                    { itemIndex: i }
                );
            }

            // Lấy buffer qua n8n helper
            const buffer = await this.helpers.getBinaryDataBuffer(i, binaryField);

            try {
                if (operation === 'pdf') {
                    const uint8Array = new Uint8Array(buffer);
                    const loadingTask = pdfjsLib.getDocument({
                        data: uint8Array,
                        disableFontFace: true,
                        useSystemFonts: true,
                    });

                    const pdf = await loadingTask.promise;
                    let fullText = '';

                    for (let p = 1; p <= pdf.numPages; p++) {
                        const page = await pdf.getPage(p);
                        const content = await page.getTextContent();
                        const pageText = content.items
                            .map((item: any) => item.str)
                            .join(' ');
                        fullText += pageText + '\n';
                    }

                    await pdf.destroy();

                    results.push({
                        json: {
                            text: fullText.trim(),
                            numpages: pdf.numPages,
                            fileName: binary.fileName || binaryField,
                            mimeType: binary.mimeType,
                        },
                        binary: items[i].binary,
                    });

                } else if (operation === 'docx') {
                    const result = await mammoth.extractRawText({ buffer });
                    results.push({
                        json: {
                            text: result.value,
                            fileName: binary.fileName || binaryField,
                            mimeType: binary.mimeType,
                        },
                        binary: items[i].binary,
                    });

                } else if (operation === 'html') {
                    const raw = buffer.toString('utf8');
                    const text = raw
                        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/\s{2,}/g, ' ')
                        .trim();
                    results.push({
                        json: {
                            text,
                            fileName: binary.fileName || binaryField,
                            mimeType: binary.mimeType,
                        },
                        binary: items[i].binary,
                    });
                }

            } catch (err: any) {
                throw new NodeOperationError(
                    this.getNode(),
                    `Failed to extract from "${binary.fileName}": ${err.message}`,
                    { itemIndex: i }
                );
            }
        }

        return [results];
    }
}