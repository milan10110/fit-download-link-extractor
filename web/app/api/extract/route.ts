import puppeteer from 'puppeteer';
import { NextResponse } from 'next/server';

// Queue generic processor
async function processQueue(items: string[], concurrency: number, workerFn: (item: string, index: number) => Promise<{ url?: string; filename?: string; error?: string }>) {
    let index = 0;
    const results: ({ url?: string; filename?: string; error?: string })[] = [];
    const activeWorkers: Promise<void>[] = [];

    const next = (): Promise<void> => {
        if (index >= items.length) return Promise.resolve();

        const currentIndex = index++;
        const item = items[currentIndex];
        
        const workerPromise = workerFn(item, currentIndex)
            .then(res => {
                results[currentIndex] = res;
            })
            .catch(err => {
                console.error(`Worker error: ${err.message}`);
                results[currentIndex] = { error: err.message };
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

export async function POST(req: Request) {
    try {
        const body = await req.json();
        let { links, limit, concurrency } = body;

        // Use body parameters, fallback to environment variables, then fallback to defaults:
        const envLimit = process.env.EXTRACTOR_LIMIT ? parseInt(process.env.EXTRACTOR_LIMIT, 10) : -1;
        const envConcurrency = process.env.EXTRACTOR_CONCURRENCY ? parseInt(process.env.EXTRACTOR_CONCURRENCY, 10) : 1;

        limit = limit !== undefined ? limit : envLimit;
        concurrency = concurrency !== undefined ? concurrency : envConcurrency;

        if (!links || links.length === 0) {
            return NextResponse.json({ message: 'No links found to process.', data: [] }, { status: 400 });
        }

        if (limit > 0) {
            console.log(`Limiting to first ${limit} links for testing.`);
            links = links.slice(0, limit);
        }

        console.log(`Found ${links.length} links to process. Concurrency: ${concurrency}`);
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        // Worker function for each link
        const worker = async (link: string, i: number): Promise<{ url?: string; filename?: string; error?: string }> => {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // Set timeouts aggressively to avoid hanging
            page.setDefaultNavigationTimeout(60000); 

            let resultUrl: string | null = null;
            let resultFilename: string | null = null;
            let errorMsg: string | null = null;

            let expectedFilename: string | null = null;

            try {
                const linkTrimmed = link.trim();
                const hashIndex = linkTrimmed.lastIndexOf('#');
                if (hashIndex !== -1) {
                    expectedFilename = decodeURIComponent(linkTrimmed.substring(hashIndex + 1));
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
                        errorMsg = `Not found for ${linkTrimmed}`;
                     }
                }
                
                resultFilename = expectedFilename;

            } catch (error: any) {
                console.error(`  [${i+1}] ERROR processing ${link}:`, error.message);
                errorMsg = `Exception: ${error.message} for ${link}`;
            } finally {
                await page.close();
            }

            if (errorMsg) {
              return { error: errorMsg };
            }

            return { url: resultUrl || "", filename: resultFilename || "" };
        };

        const results = await processQueue(links, concurrency, worker);
        await browser.close();

        const validResults = results.filter(r => r !== null && r !== undefined);
        
        return NextResponse.json({
            message: 'Extraction complete',
            data: validResults
        }, { status: 200 });

    } catch (error: any) {
        console.error('Error in /api/extract:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
