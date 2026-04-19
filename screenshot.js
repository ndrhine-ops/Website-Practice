const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const OUT_DIR  = path.join(__dirname, 'screenshots');

const SHOTS = [
  { name: 'hero',        selector: '#hero',        scroll: 0 },
  { name: 'stats',       selector: '#stats',       scroll: null },
  { name: 'about',       selector: '#about',       scroll: null },
  { name: 'services',    selector: '#services',    scroll: null },
  { name: 'process',     selector: '#process',     scroll: null },
  { name: 'gallery',     selector: '#gallery',     scroll: null },
  { name: 'testimonial', selector: '#testimonial', scroll: null },
  { name: 'contact',     selector: '#contact',     scroll: null },
  { name: 'footer',      selector: 'footer',       scroll: null },
];

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'tablet',  width: 768,  height: 1024 },
  { label: 'mobile',  width: 390,  height: 844 },
];

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

  const browser = await puppeteer.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const vpDir = path.join(OUT_DIR, vp.label);
    if (!fs.existsSync(vpDir)) fs.mkdirSync(vpDir);

    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    // Full-page screenshot
    await page.screenshot({
      path: path.join(vpDir, 'full-page.png'),
      fullPage: true,
    });
    console.log(`✓ ${vp.label} — full-page`);

    // Per-section screenshots
    for (const shot of SHOTS) {
      try {
        const el = await page.$(shot.selector);
        if (!el) { console.warn(`  skip: ${shot.selector} not found`); continue; }

        await el.scrollIntoView();
        // Brief pause for scroll animations to settle
        await new Promise(r => setTimeout(r, 400));

        await el.screenshot({ path: path.join(vpDir, `${shot.name}.png`) });
        console.log(`✓ ${vp.label} — ${shot.name}`);
      } catch (err) {
        console.warn(`  error on ${shot.name}:`, err.message);
      }
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nAll screenshots saved to: ${OUT_DIR}`);
})();
