import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';

import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
const pdfParse = require('pdf-parse') as (
    buffer: Buffer
) => Promise<{ text: string; numpages: number; info: any }>;

export class ExtractFromFile implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Extract from File (Extended)',
        name: 'extractFromFileExtended',
        icon: 'fa:file-import',
        group: ['transform'],
        version: 1,
        description: 'Extract text from PDF, DOCX, XLSX, CSV, JSON, and more',
        defaults: { name: 'Extract from File' },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    // ── n8n gốc đã có ──────────────────────────
                    {
                        name: 'Extract From CSV',
                        value: 'csv',
                        description: 'Transform a CSV file into output items',
                        action: 'Extract from CSV file',
                    },
                    {
                        name: 'Extract From HTML',
                        value: 'html',
                        description: 'Transform a HTML file into output items',
                        action: 'Extract from HTML file',
                    },
                    {
                        name: 'Extract From ICS',
                        value: 'ics',
                        description: 'Transform a ICS file into output items',
                        action: 'Extract from ICS file',
                    },
                    {
                        name: 'Extract From JSON',
                        value: 'json',
                        description: 'Transform a JSON file into output items',
                        action: 'Extract from JSON file',
                    },
                    {
                        name: 'Extract From ODS',
                        value: 'ods',
                        description: 'Transform an ODS file into output items',
                        action: 'Extract from ODS file',
                    },
                    {
                        name: 'Extract From PDF',
                        value: 'pdf',
                        description: 'Extracts the content and metadata from a PDF file',
                        action: 'Extract from PDF file',
                    },
                    {
                        name: 'Extract From RTF',
                        value: 'rtf',
                        description: 'Transform a RTF file into output items',
                        action: 'Extract from RTF file',
                    },
                    {
                        name: 'Extract From Text File',
                        value: 'text',
                        description: 'Extracts the content of a text file',
                        action: 'Extract from text file',
                    },
                    {
                        name: 'Extract From XML',
                        value: 'xml',
                        description: 'Transform a XML file into output items',
                        action: 'Extract from XML file',
                    },
                    // ── Thêm mới ───────────────────────────────
                    {
                        name: 'Extract From DOCX',
                        value: 'docx',
                        description: 'Extracts the text content from a Word document (.docx)',
                        action: 'Extract from DOCX file',
                    },
                    {
                        name: 'Extract From XLSX',
                        value: 'xlsx',
                        description: 'Extracts sheet content from an Excel file (.xlsx) as CSV text',
                        action: 'Extract from XLSX file',
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
            // Option: XLSX join sheets
            {
                displayName: 'Join Sheets With',
                name: 'sheetSeparator',
                type: 'string',
                default: '\n\n',
                displayOptions: {
                    show: { operation: ['xlsx', 'ods'] },
                },
                description: 'String used to separate multiple sheets in the output text',
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

            const buffer = Buffer.from(binary.data, 'base64');

            try {
                // ── DOCX (mới) ─────────────────────────────
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

                    // ── XLSX (mới) ─────────────────────────────
                } else if (operation === 'xlsx') {
                    const separator = this.getNodeParameter('sheetSeparator', i) as string;
                    const workbook = XLSX.read(buffer, { type: 'buffer' });
                    const parts: string[] = [];

                    workbook.SheetNames.forEach(sheetName => {
                        const sheet = workbook.Sheets[sheetName];
                        parts.push(`=== Sheet: ${sheetName} ===\n${XLSX.utils.sheet_to_csv(sheet)}`);
                    });

                    results.push({
                        json: {
                            text: parts.join(separator),
                            sheets: workbook.SheetNames,
                            fileName: binary.fileName || binaryField,
                            mimeType: binary.mimeType,
                        },
                        binary: items[i].binary,
                    });

                    // ── PDF (override n8n gốc, dùng pdf-parse) ─
                } else if (operation === 'pdf') {
                    const pdf = await pdfParse(buffer);
                    results.push({
                        json: {
                            text: pdf.text,
                            numpages: pdf.numpages,
                            info: pdf.info,
                            fileName: binary.fileName || binaryField,
                            mimeType: binary.mimeType,
                        },
                        binary: items[i].binary,
                    });

                    // ── Các operation khác: pass-through ───────
                } else {
                    // Fallback: trả về text utf8 như Extract From Text File
                    results.push({
                        json: {
                            text: buffer.toString('utf8'),
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