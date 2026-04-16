# n8n-nodes-file-extractor

An extended version of n8n's built-in **Extract from File** node — adds native support for **DOCX** and **XLSX** file types that the original node does not handle.

## Features

Includes all original operations plus:

| Operation | Description |
|---|---|
| Extract From PDF | Extracts text content and metadata from PDF files |
| Extract From DOCX | Extracts plain text from Word documents (.docx) |
| Extract From CSV | Transform a CSV file into output items |
| Extract From JSON | Transform a JSON file into output items |
| Extract From XML | Transform a XML file into output items |
| Extract From HTML | Transform a HTML file into output items |
| Extract From RTF | Transform a RTF file into output items |
| Extract From ODS | Transform an ODS file into output items |
| Extract From ICS | Transform an ICS file into output items |
| Extract From Text File | Extracts the content of a plain text file |

## Installation

### Docker (recommended)

```bash
docker exec -it n8n sh -c "
  cd /home/node/.n8n &&
  mkdir -p custom &&
  cd custom &&
  npm install github:atwinn/n8n-nodes-file-extractor
"
docker restart n8n
```

### Update to latest version

```bash
docker exec -it n8n sh -c "
  cd /home/node/.n8n/custom &&
  npm update n8n-nodes-file-extractor
"
docker restart n8n
```

### npm / n8n Desktop

```bash
npm install -g n8n-nodes-file-extractor
```

## Usage

After installation, search for **"Extract from File"** in the n8n node panel.
The node works identically to the built-in version — select your operation and set the **Input Binary Field** to match your binary data field name (default: `data`).

### DOCX example

Input Binary Field: data
Operation:          Extract From DOCX
Output:             $json.text  →  plain text content of the Word document

### XLSX example

Input Binary Field: data
Operation:          Extract From XLSX
Output:             $json.text   →  CSV-formatted sheet content
$json.sheets →  array of sheet names

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| mammoth | 1.12.0 | DOCX text extraction |
| pdf-parse | 2.4.5 | PDF text extraction |
| xlsx | 0.18.5 | Excel file parsing |

## Compatibility

- n8n version: 1.0.0+
- Node.js: 18+
- Docker: works with standard `n8nio/n8n` image

## License

MIT
