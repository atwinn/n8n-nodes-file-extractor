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
        description: 'Extract text from DOCX and HTML files',
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
                default: 'docx',
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

        for (let i = 0; i < items.length; i++) {
            const operation = this.getNodeParameter('operation', i) as string;
            const binaryField = this.getNodeParameter('binaryField', i) as string;

            const binary = items[i].binary?.[binaryField];
            if (!binary) {
                throw new NodeOperationError(
                    this.getNode(),
                    `No binary data found in field "${binaryField}"`,
                    { itemIndex: i }
                );
            }

            const buffer = await this.helpers.getBinaryDataBuffer(i, binaryField);

            try {
                if (operation === 'docx') {
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