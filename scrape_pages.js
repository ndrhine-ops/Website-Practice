const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const PAGES = [
  { name: 'home',        url: 'https://rhinehartcompany.com/' },
  { name: 'residential', url: 'https://rhinehartcompany.com/Residential-Projects' },
  { name: 'commercial',  url: 'https://rhinehartcompany.com/Commercial-Projects' },
  { name: 'testimonials',url: 'https://rhinehartcompany.com/Testimonials' },
  { name: 'contact',     url: 'https://rhinehartcompany.com/Contact-Us' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const all = {};

  for (const pg of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');
    console.log(`Scraping: ${pg.url}`);

    try {
      await page.goto(pg.url, { waitUntil: 'networkidle2', timeout: 20000 });

      // Screenshot each page
      await page.screenshot({
        path: path.join(__dirname, 'scraped_assets', `page-${pg.name}.png`),
        fullPage: true,
      });

      // Extract all visible text blocks
      const content = await page.evaluate(() => {
        // Get inner text of main content area - try common selectors
        const main = document.querySelector('main, #main, #content, .content, [role="main"], body');
        const rawText = main ? main.innerText : document.body.innerText;

        // Split into lines, filter blanks/noise
        const lines = rawText.split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 5 && !/^[\s\|•·]+$/.test(l));

        // All <img> src on this page
        const imgs = Array.from(document.querySelectorAll('img'))
          .map(i => ({ src: i.currentSrc || i.src, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight }))
          .filter(i => i.w > 80);

        return { lines, imgs };
      });

      all[pg.name] = content;
      console.log(`  → ${content.lines.length} text lines, ${content.imgs.length} images`);
    } catch (e) {
      console.log(`  ✗ Failed: ${e.message}`);
      all[pg.name] = { lines: [], imgs: [] };
    }

    await page.close();
  }

  await browser.close();

  fs.writeFileSync(
    path.join(__dirname, 'scraped_assets', 'all-pages.json'),
    JSON.stringify(all, null, 2)
  );

  // Print full text of each page
  for (const [name, data] of Object.entries(all)) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`PAGE: ${name.toUpperCase()}`);
    console.log('═'.repeat(50));
    data.lines.forEach(l => console.log(l));
  }
})();
