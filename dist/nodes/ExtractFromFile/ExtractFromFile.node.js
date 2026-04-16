"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractFromFile = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const mammoth = __importStar(require("mammoth"));
const XLSX = __importStar(require("xlsx"));
const pdfParse = require('pdf-parse');
class ExtractFromFile {
    constructor() {
        this.description = {
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
    }
    async execute() {
        var _a;
        const items = this.getInputData();
        const results = [];
        for (let i = 0; i < items.length; i++) {
            const operation = this.getNodeParameter('operation', i);
            const binaryField = this.getNodeParameter('binaryField', i);
            const binary = (_a = items[i].binary) === null || _a === void 0 ? void 0 : _a[binaryField];
            if (!binary) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `No binary data found in field "${binaryField}"`, { itemIndex: i });
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
                }
                else if (operation === 'xlsx') {
                    const separator = this.getNodeParameter('sheetSeparator', i);
                    const workbook = XLSX.read(buffer, { type: 'buffer' });
                    const parts = [];
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
                }
                else if (operation === 'pdf') {
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
                }
                else {
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
            }
            catch (err) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to extract from "${binary.fileName}": ${err.message}`, { itemIndex: i });
            }
        }
        return [results];
    }
}
exports.ExtractFromFile = ExtractFromFile;
