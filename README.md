# n8n-nodes-file-extractor

Extended **Extract from File** node for n8n — adds native **DOCX** support and a lightweight **HTML** text stripper.

## Supported operations

| Operation | Output fields | Notes |
|---|---|---|
| Extract From DOCX | `text`, `fileName`, `mimeType` | Uses `mammoth` |
| Extract From HTML | `text`, `fileName`, `mimeType` | Strips tags and decodes entities |

## Installation

### Docker — Linux / macOS (SSH server)

```bash
docker exec n8n npm install \
  --prefix /home/node/.n8n/custom \
  github:atwinn/n8n-nodes-file-extractor

docker restart n8n
```

### Docker — Windows (PowerShell + Docker Desktop)

```powershell
docker exec n8n npm install --prefix /home/node/.n8n/custom github:atwinn/n8n-nodes-file-extractor

docker restart n8n
```

## Update to latest version

### Linux / macOS

```bash
docker exec n8n npm install \
  --prefix /home/node/.n8n/custom \
  github:atwinn/n8n-nodes-file-extractor

docker restart n8n
```

### Windows (PowerShell)

```powershell
docker exec n8n npm install --prefix /home/node/.n8n/custom github:atwinn/n8n-nodes-file-extractor

docker restart n8n
```

## Usage

After installation, search for **"Extract from File (Extended)"** in the n8n node panel.

Set **Input Binary Field** to match your binary field name (default: `data`).

### DOCX

Input Binary Field: data
Operation:          Extract From DOCX
Output:             $json.text

### HTML

Input Binary Field: data
Operation:          Extract From HTML
Output:             $json.text  (tags stripped, entities decoded)

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| mammoth | 1.12.0 | DOCX text extraction |

## Compatibility

- n8n: 1.0.0+
- Node.js: 18+
- Docker image: `n8nio/n8n` (Alpine Linux)

## License

MIT