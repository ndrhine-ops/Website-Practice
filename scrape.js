const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const TARGET = 'https://rhinehartcompany.com/';
const IMG_DIR = path.join(__dirname, 'scraped_assets', 'images');

fs.mkdirSync(IMG_DIR, { recursive: true });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(dest); });
    }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
  });
}

function slugify(str) {
  return str.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase().slice(0, 60);
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');

  console.log('Navigating to', TARGET);
  await page.goto(TARGET, { waitUntil: 'networkidle2', timeout: 30000 });

  // Scroll through the full page to trigger lazy-loading
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let y = 0;
      const step = () => {
        window.scrollBy(0, 300);
        y += 300;
        if (y < document.body.scrollHeight) setTimeout(step, 80);
        else { window.scrollTo(0, 0); resolve(); }
      };
      step();
    });
  });
  await new Promise(r => setTimeout(r, 1500));

  // ── Extract structured content ───────────────────────────────────
  const data = await page.evaluate(() => {
    const text = el => el ? el.innerText.trim() : '';
    const attr = (el, a) => el ? el.getAttribute(a) : '';

    // All visible headings
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(h => ({
      tag: h.tagName,
      text: h.innerText.trim(),
    })).filter(h => h.text.length > 0);

    // All meaningful paragraphs (>30 chars)
    const paragraphs = Array.from(document.querySelectorAll('p')).map(p => p.innerText.trim())
      .filter(t => t.length > 30);

    // Nav / menu links
    const navLinks = Array.from(document.querySelectorAll('nav a, header a')).map(a => ({
      text: a.innerText.trim(),
      href: a.href,
    })).filter(l => l.text.length > 0);

    // All images with src and alt
    const images = Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.currentSrc || img.src,
      alt: img.alt || '',
      width: img.naturalWidth,
      height: img.naturalHeight,
    })).filter(i => i.src && i.width > 50 && i.height > 50);

    // Background images from inline styles and CSS
    const bgImages = Array.from(document.querySelectorAll('*')).reduce((acc, el) => {
      const style = window.getComputedStyle(el).backgroundImage;
      if (style && style !== 'none' && style.includes('url(')) {
        const match = style.match(/url\(["']?([^"')]+)["']?\)/);
        if (match) acc.push(match[1]);
      }
      return acc;
    }, []);

    // Phone / email / address
    const bodyText = document.body.innerText;
    const phone   = bodyText.match(/\(?\d{3}\)?[\s\-\.]\d{3}[\s\-\.]\d{4}/)?.[0] || '';
    const email   = bodyText.match(/[\w.-]+@[\w.-]+\.\w{2,}/)?.[0] || '';
    const address = bodyText.match(/\d+\s[\w\s]+(?:St|Ave|Blvd|Dr|Rd|Way|Ln|Ct|Hwy)[^\n]*/i)?.[0] || '';

    // Services / feature cards
    const cards = Array.from(document.querySelectorAll(
      '[class*="service"], [class*="card"], [class*="feature"], [class*="work"], [class*="project"]'
    )).slice(0, 12).map(c => ({
      heading: c.querySelector('h2,h3,h4,h5')?.innerText.trim() || '',
      body:    c.querySelector('p')?.innerText.trim() || '',
    })).filter(c => c.heading || c.body);

    // Page title and meta
    const title = document.title;
    const metaDesc = document.querySelector('meta[name="description"]')?.content || '';

    return { headings, paragraphs, navLinks, images, bgImages, phone, email, address, cards, title, metaDesc };
  });

  // ── Download all images ──────────────────────────────────────────
  const downloaded = [];
  const allImgUrls = [
    ...data.images.map(i => i.src),
    ...data.bgImages,
  ].filter((u, i, a) => u && a.indexOf(u) === i); // dedupe

  console.log(`\nFound ${data.images.length} <img> tags, ${data.bgImages.length} background images`);
  console.log(`Downloading up to ${Math.min(allImgUrls.length, 30)} images...\n`);

  for (const url of allImgUrls.slice(0, 30)) {
    try {
      const parsed = new URL(url, TARGET);
      const ext  = path.extname(parsed.pathname).split('?')[0] || '.jpg';
      const name = slugify(parsed.pathname) + ext;
      const dest = path.join(IMG_DIR, name);
      await download(parsed.href, dest);
      downloaded.push({ url: parsed.href, local: `scraped_assets/images/${name}` });
      process.stdout.write(`  ✓ ${name}\n`);
    } catch (e) {
      process.stdout.write(`  ✗ ${e.message.slice(0, 60)}\n`);
    }
  }

  // ── Full-page screenshot ─────────────────────────────────────────
  fs.mkdirSync(path.join(__dirname, 'scraped_assets'), { recursive: true });
  await page.screenshot({ path: path.join(__dirname, 'scraped_assets', 'full-page.png'), fullPage: true });
  console.log('\n✓ Full-page screenshot saved');

  await browser.close();

  // ── Save structured data ─────────────────────────────────────────
  const result = { ...data, downloaded };
  fs.writeFileSync(
    path.join(__dirname, 'scraped_assets', 'content.json'),
    JSON.stringify(result, null, 2)
  );

  // ── Pretty-print summary ─────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('SCRAPED CONTENT SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`Title:    ${data.title}`);
  console.log(`Phone:    ${data.phone || '(not found)'}`);
  console.log(`Email:    ${data.email || '(not found)'}`);
  console.log(`Address:  ${data.address || '(not found)'}`);
  console.log(`\nHeadings (${data.headings.length}):`);
  data.headings.slice(0, 15).forEach(h => console.log(`  [${h.tag}] ${h.text}`));
  console.log(`\nParagraphs (${data.paragraphs.length} found, first 5):`);
  data.paragraphs.slice(0, 5).forEach(p => console.log(`  "${p.slice(0, 100)}..."`));
  console.log(`\nImages downloaded: ${downloaded.length}`);
  console.log(`\nFull data → scraped_assets/content.json`);
})();
