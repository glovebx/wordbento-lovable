import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');
// const BASE_URL = 'https://word.metaerp.ai';
const BASE_URL = 'http://127.0.0.1:8787';
const WORDS_PER_SITEMAP = 5000;

async function fetchAllSlugs() {
  let allSlugs = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await axios.get(`${BASE_URL}/api/word/slugs`, {
        params: { limit: WORDS_PER_SITEMAP, offset },
      });
      const slugs = response.data;
      if (slugs.length > 0) {
        allSlugs.push(...slugs);
        offset += slugs.length;
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(`Error fetching slugs at offset ${offset}:`, error);
      hasMore = false; // Stop on error
    }
  }
  return allSlugs;
}

function writeSitemapFile(filename, urls) {
  const sitemapContent = `
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls.map(url => `
        <url>
          <loc>${url.loc}</loc>
          <lastmod>${url.lastmod}</lastmod>
          <changefreq>${url.changefreq}</changefreq>
          <priority>${url.priority}</priority>
        </url>
      `).join('')}
    </urlset>
  `.trim();
  fs.writeFileSync(path.join(PUBLIC_DIR, filename), sitemapContent);
  console.log(`Generated ${filename}`);
}

function writeSitemapIndexFile(sitemapFiles) {
  const sitemapIndexContent = `
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${sitemapFiles.map(file => `
        <sitemap>
          <loc>${BASE_URL}/${file}</loc>
        </sitemap>
      `).join('')}
    </sitemapindex>
  `.trim();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapIndexContent);
  console.log(`Generated sitemap.xml (index)`);
}

async function generateSitemap() {
  console.log('Generating sitemaps...');
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  const today = new Date().toISOString().split('T')[0];
  const sitemapFiles = [];

  // 1. Generate sitemap for static pages
  const staticUrls = [
    { loc: `${BASE_URL}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: `${BASE_URL}/dashboard`, lastmod: today, changefreq: 'monthly', priority: '0.5' },
  ];
  writeSitemapFile('sitemap-static.xml', staticUrls);
  sitemapFiles.push('sitemap-static.xml');

  // 2. Generate sitemaps for dynamic word pages
  const allSlugs = await fetchAllSlugs();
  for (let i = 0; i < allSlugs.length; i += WORDS_PER_SITEMAP) {
    const chunk = allSlugs.slice(i, i + WORDS_PER_SITEMAP);
    const wordUrls = chunk.map(slug => ({
      loc: `${BASE_URL}/word/${slug}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
    }));
    const sitemapFile = `sitemap-words-${Math.floor(i / WORDS_PER_SITEMAP) + 1}.xml`;
    writeSitemapFile(sitemapFile, wordUrls);
    sitemapFiles.push(sitemapFile);
  }

  // 3. Generate the main sitemap index file
  writeSitemapIndexFile(sitemapFiles);

  console.log('Sitemap generation complete.');
}

generateSitemap().catch(error => {
  console.error('An unexpected error occurred during sitemap generation:', error);
  process.exit(1);
});
