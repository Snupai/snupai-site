import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path') ?? '/';
    
    // Get the base URL from environment or request
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";
    
    const url = `${baseUrl}${path}`;

    // Launch headless browser
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        width: 1200,
        height: 630,
        deviceScaleFactor: 2, // For better quality
      },
      executablePath: await chromium.executablePath,
      headless: true,
    });

    // Create new page and navigate
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 90,
    });

    await browser.close();

    // Return the screenshot
    return new Response(screenshot, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(`Failed to generate the image: ${e.message}`, {
      status: 500,
    });
  }
}