const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const INPUT_FILE = 'page-links.txt';
const OUTPUT_FILE = 'download-links.txt'; // in root dir as requested

// Parse command line arguments
const args = process.argv.slice(2);
let limit = -1;
const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1], 10);
}

async function run() {
    console.log('Starting Download Link Extractor...');

    // Read input file
    let links = [];
    try {
        const fileContent = fs.readFileSync(INPUT_FILE, 'utf-8');
        links = fileContent.split(/\r?\n/).filter(line => line.trim().startsWith('http'));
    } catch (err) {
        console.error(`Error reading ${INPUT_FILE}:`, err.message);
        process.exit(1);
    }

    if (links.length === 0) {
        console.log('No links found to process.');
        return;
    }

    if (limit > 0) {
        console.log(`Limiting to first ${limit} links for testing.`);
        links = links.slice(0, limit);
    }

    console.log(`Found ${links.length} links to process.`);

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let extractedLinks = [];

    for (let i = 0; i < links.length; i++) {
        const link = links[i].trim();
        // Extract filename from hash if present
        const hashIndex = link.lastIndexOf('#');
        let expectedFilename = "";
        
        if (hashIndex !== -1) {
            expectedFilename = link.substring(hashIndex + 1);
        }

        console.log(`[${i + 1}/${links.length}] Processing: ${link}`);
        if(expectedFilename) console.log(`  Looking for file: ${expectedFilename}`);

        try {
            await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Wait a bit for any JS redirects or loads
            // Using a race condition check: wait for selector OR timeout
            // We look for a link that ends with .rar or contains the expected filename
            
            // Strategy: Extract from the JS function download() in the page source
            const content = await page.content();
            const downloadLinkMatch = content.match(/window\.open\("((https:\/\/fuckingfast\.co\/dl\/[^"]+))"\)/);
            
            if (downloadLinkMatch && downloadLinkMatch[1]) {
                const downloadUrl = downloadLinkMatch[1];
                console.log(`  SUCCESS: Found link -> ${downloadUrl}`);
                extractedLinks.push(downloadUrl);
            } else {
                 // Fallback: try to find any link matching the pattern in the whole text
                 const fallbackMatch = content.match(/https:\/\/fuckingfast\.co\/dl\/[a-zA-Z0-9_\-]+/);
                 if (fallbackMatch) {
                    const downloadUrl = fallbackMatch[0];
                    console.log(`  SUCCESS: Found link (fallback) -> ${downloadUrl}`);
                    extractedLinks.push(downloadUrl);
                 } else {
                    console.warn(`  FAILED: Could not find download link on ${link}`);
                    extractedLinks.push(`ERROR: Not found for ${link}`);
                 }
            }

        } catch (error) {
            console.error(`  ERROR processing ${link}:`, error.message);
            extractedLinks.push(`ERROR: Exception for ${link}`);
        }
        
        // Small pause to be polite
        await new Promise(r => setTimeout(r, 1000));
    }

    await browser.close();

    // Write output
    try {
        const outputPath = path.resolve(OUTPUT_FILE);
        fs.writeFileSync(outputPath, extractedLinks.join('\n'), 'utf-8');
        console.log(`\nExtraction complete. Saved to ${OUTPUT_FILE}`);
    } catch (err) {
        console.error(`Error writing output file:`, err.message);
    }
}

run();
