// Automated screenshot generator for README.
// Usage:
//   1. docker compose up -d
//   2. In one terminal: npx next dev -p 3042
//   3. In another: npm run capture:screenshots
//
// Seeds a few demo topics + ~20 calc messages, then saves 8 PNGs to
// docs/screenshots/. Safe to re-run — it reuses existing topics.

import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';

const BASE = process.env.CAPTURE_BASE_URL ?? 'http://localhost:3042';
const OUT = path.resolve('docs/screenshots');
const DEMO_TOPICS = [
  { name: 'orders', partitions: 6, rf: 3 },
  { name: 'clicks', partitions: 3, rf: 3 },
  { name: 'payments', partitions: 4, rf: 2 },
];

async function api(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: false, error: text }; }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function ensureTopic(name, partitions, rf) {
  const data = await api('/api/topics?internal=false');
  const names = (data.topics ?? []).map(t => t.name);
  if (names.includes(name)) return;
  await api('/api/topics', {
    method: 'POST',
    body: JSON.stringify({ name, numPartitions: partitions, replicationFactor: rf }),
  });
  await sleep(1500);
}

async function publish(topic, numbers, operator, key = '') {
  await api('/api/calc/produce', {
    method: 'POST',
    body: JSON.stringify({ topic, numbers, operator, key }),
  });
}

async function shotElement(page, selector, filename, padding = 16) {
  const el = await page.$(selector);
  if (!el) throw new Error(`element not found: ${selector}`);
  const box = await el.boundingBox();
  if (!box) throw new Error(`no bounding box: ${selector}`);
  await page.screenshot({
    path: path.join(OUT, filename),
    clip: {
      x: Math.max(0, box.x - padding),
      y: Math.max(0, box.y - padding),
      width: box.width + padding * 2,
      height: box.height + padding * 2,
    },
  });
  console.log(`✓ ${filename}  (${Math.round(box.width)}x${Math.round(box.height)})`);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  console.log(`→ target: ${BASE}`);
  console.log('→ seeding demo topics...');
  for (const t of DEMO_TOPICS) await ensureTopic(t.name, t.partitions, t.rf);

  console.log('→ seeding demo messages...');
  const ops = ['+', '-', '*', '/'];
  for (let i = 0; i < 20; i++) {
    const topic = DEMO_TOPICS[i % DEMO_TOPICS.length].name;
    const op = ops[i % ops.length];
    await publish(topic, [1 + i, 2 + i, 3 + i], op, i % 3 === 0 ? `user-${i}` : '');
    await sleep(60);
  }

  console.log('→ waiting for consumers to catch up...');
  await sleep(2500);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1800, height: 1600 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await sleep(2000);
  await page.waitForSelector('main', { state: 'visible' });
  await sleep(1500);

  await page.screenshot({ path: path.join(OUT, '00-overview.png'), fullPage: true });
  console.log('✓ 00-overview.png  (full page)');

  await shotElement(page, 'section:nth-of-type(1)', '01-create-topic.png');
  await shotElement(page, 'section:nth-of-type(2)', '02-topic-list.png');
  await shotElement(page, 'section:nth-of-type(3)', '03-producer.png');
  await shotElement(page, 'section:nth-of-type(4)', '04-consumer-result.png');
  await shotElement(page, 'section:nth-of-type(5)', '05-stats-panel.png');
  await shotElement(page, 'section:nth-of-type(6)', '06-broker-grid.png');

  console.log('→ opening partition viewer for 07...');
  const partitionBtn = await page.$('section:nth-of-type(6) button[title*="Partition"]');
  if (partitionBtn) {
    await partitionBtn.click();
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT, '07-partition-viewer.png'), fullPage: false });
    console.log('✓ 07-partition-viewer.png');
  } else {
    console.warn('× no partition button found — skipped 07');
  }

  await browser.close();
  console.log(`\n✅ Saved to ${OUT}`);
}

main().catch((err) => {
  console.error('✗ capture failed:', err);
  process.exit(1);
});
