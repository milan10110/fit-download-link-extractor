/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js from bundling native binary packages into serverless functions
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],
};

export default nextConfig;

