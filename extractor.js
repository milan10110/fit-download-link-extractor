const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const INPUT_FILE = 'page-links.txt';
const OUTPUT_FILE = 'download-links.txt';

// Parse command line arguments
const args = process.argv.slice(2);
let limit = -1;
let concurrency = 1;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
        limit = parseInt(args[i + 1], 10);
        i++;
    } else if (args[i] === '--concurrency' && args[i + 1]) {
        concurrency = parseInt(args[i + 1], 10);
        i++;
    }
}

if (args.includes('--help')) {
    console.log('Usage: node extractor.js [--limit N] [--concurrency N]');
    process.exit(0);
}

// Queue generic processor
async function processQueue(items, concurrency, workerFn) {
    let index = 0;
    const results = [];
    const activeWorkers = [];

    const next = () => {
        if (index >= items.length) return Promise.resolve();

        const currentIndex = index++;
        const item = items[currentIndex];
        
        const workerPromise = workerFn(item, currentIndex)
            .then(res => {
                results[currentIndex] = res;
            })
            .catch(err => {
                console.error(`Worker error: ${err.message}`);
                results[currentIndex] = null;
            })
            .then(() => next()); // Chain next item

        return workerPromise;
    };

    // Start initial batch of workers
    for (let i = 0; i < concurrency && i < items.length; i++) {
        activeWorkers.push(next());
    }

    await Promise.all(activeWorkers);
    return results;
}

async function run() {
    console.log('Starting Download Link Extractor...');
    console.log(`Concurrency: ${concurrency}`);

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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    // Worker function for each link
    const worker = async (link, i) => {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
         // Set timeouts aggressively to avoid hanging
        page.setDefaultNavigationTimeout(60000); 

        let resultUrl = null;

        try {
            // Extract filename from hash if present
            const linkTrimmed = link.trim();
            const hashIndex = linkTrimmed.lastIndexOf('#');
            let expectedFilename = "";
            
            if (hashIndex !== -1) {
                expectedFilename = linkTrimmed.substring(hashIndex + 1);
            }

            console.log(`[${i + 1}/${links.length}] Processing: ${linkTrimmed}`);

            await page.goto(linkTrimmed, { waitUntil: 'domcontentloaded' });
            
            // Strategy: Extract from the JS function download() in the page source
            const content = await page.content();
            const downloadLinkMatch = content.match(/window\.open\("((https:\/\/fuckingfast\.co\/dl\/[^"]+))"\)/);
            
            if (downloadLinkMatch && downloadLinkMatch[1]) {
                resultUrl = downloadLinkMatch[1];
                console.log(`  [${i+1}] SUCCESS: Found link -> ${resultUrl}`);
            } else {
                 // Fallback
                 const fallbackMatch = content.match(/https:\/\/fuckingfast\.co\/dl\/[a-zA-Z0-9_\-]+/);
                 if (fallbackMatch) {
                    resultUrl = fallbackMatch[0];
                    console.log(`  [${i+1}] SUCCESS: Found link (fallback) -> ${resultUrl}`);
                 } else {
                    console.warn(`  [${i+1}] FAILED: Could not find download link on ${linkTrimmed}`);
                    resultUrl = `ERROR: Not found for ${linkTrimmed}`;
                 }
            }

        } catch (error) {
            console.error(`  [${i+1}] ERROR processing ${link}:`, error.message);
            resultUrl = `ERROR: Exception for ${link}`;
        } finally {
            await page.close();
        }

        return resultUrl;
    };

    const results = await processQueue(links, concurrency, worker);
    await browser.close();

    // Write output
    try {
        // Filter out nulls if any
        const validResults = results.filter(r => r !== null);
        const outputPath = path.resolve(OUTPUT_FILE);
        fs.writeFileSync(outputPath, validResults.join('\n'), 'utf-8');
        console.log(`\nExtraction complete. Saved to ${OUTPUT_FILE}`);
    } catch (err) {
        console.error(`Error writing output file:`, err.message);
    }
}

run();
