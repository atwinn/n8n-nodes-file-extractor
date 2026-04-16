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
const path = __importStar(require("path"));
class ExtractFromFile {
    constructor() {
        this.description = {
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
    }
    async execute() {
        var _a;
        const items = this.getInputData();
        const results = [];
        // Dynamic import pdfjs — ESM module, phải dùng import() thay vì require()
        const pdfjsLib = await Promise.resolve().then(() => __importStar(require('pdfjs-dist/legacy/build/pdf.mjs')));
        // Disable worker — Node.js không cần worker thread
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
        // Standard fonts path — tránh warning font missing
        const standardFontDataUrl = path.join(__dirname, '../../../node_modules/pdfjs-dist/standard_fonts/');
        for (let i = 0; i < items.length; i++) {
            const operation = this.getNodeParameter('operation', i);
            const binaryField = this.getNodeParameter('binaryField', i);
            // Check binary TRƯỚC
            const binary = (_a = items[i].binary) === null || _a === void 0 ? void 0 : _a[binaryField];
            if (!binary) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `No binary data found in field "${binaryField}"`, { itemIndex: i });
            }
            // Lấy buffer qua n8n helper
            const buffer = await this.helpers.getBinaryDataBuffer(i, binaryField);
            try {
                if (operation === 'pdf') {
                    const uint8Array = new Uint8Array(buffer);
                    const loadingTask = pdfjsLib.getDocument({
                        data: uint8Array,
                        standardFontDataUrl,
                        disableFontFace: true,
                        useWorkerFetch: false,
                        isEvalSupported: false,
                        useSystemFonts: false,
                    });
                    const pdf = await loadingTask.promise;
                    let fullText = '';
                    for (let p = 1; p <= pdf.numPages; p++) {
                        const page = await pdf.getPage(p);
                        const content = await page.getTextContent();
                        const pageText = content.items
                            .map((item) => item.str)
                            .join(' ');
                        fullText += pageText + '\n';
                    }
                    // Cleanup
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
                }
                else if (operation === 'docx') {
                    const result = await mammoth.extractRawText({ buffer });
                    results.push({
                        json: {
                            text: result.value,
                            fileName: binary.fileName || binaryField,
                            mimeType: binary.mimeType,
                        },
                        binary: items[i].binary,
                    });
                }
                else if (operation === 'html') {
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
            }
            catch (err) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to extract from "${binary.fileName}": ${err.message}`, { itemIndex: i });
            }
        }
        return [results];
    }
}
exports.ExtractFromFile = ExtractFromFile;
