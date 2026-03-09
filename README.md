# FitGirl Download Link Extractor

A modern Web App and Node.js script to extract direct download links from redirect pages (e.g. fuckingfast.co) typically found on FitGirl Repack sites.

## Prerequisites

- Node.js installed
- NPM installed

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Ensure you have your list of redirect URLs in `page-links.txt` in the root directory. The file should contain one URL per line.

   > **Tip:** You can use [Fitgirl-Easy-Downloader](https://github.com/JoyNath1337/Fitgirl-Easy-Downloader?tab=readme-ov-file#get-direct-download-links) to generate this list of links in the correct format.

## Usage

Run the extractor script:

```bash
node extractor.js
```

The script will:
1. Launch a headless browser.
2. Visit each link in `page-links.txt`.
3. Extract the direct download link from the page's source code.
4. Save the found links to `download-links.txt`.

### Options

Limit the number of links to process (useful for testing):
```bash
node extractor.js --limit 10
```

Set concurrency (parallel pages, default 1):
```bash
node extractor.js --concurrency 5
```
Combine options:
```bash
node extractor.js --limit 20 --concurrency 5
```

## Troubleshooting

If a link is not found, the script will:
- Log a warning.
- Save a debug screenshot (`debug-<index>.png`).
- Save the page HTML (`debug-<index>.html`).

You can check these files to understand why the extraction failed (e.g., CAPTCHA, layout change).
