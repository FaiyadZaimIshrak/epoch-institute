'use strict';
// Run once to generate data/history.json
// Usage: node scripts/scrape-history.js
// Takes ~30 minutes (500ms delay × 366 days).

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAYS_IN_MONTH = [31,29,31,30,31,30,31,31,30,31,30,31];

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'EpochInstituteHistoryScraper/1.0 (build script; research@the-epoch-institute.org)',
        'Accept': 'application/json'
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function cleanText(t) {
  return (t || '')
    .replace(/\[[\d\w,\s]+\]/g, '')  // remove [1], [a], [note 1], etc.
    .replace(/\s+/g, ' ')
    .trim();
}

function makeTitle(text) {
  let t = text.replace(/^(The |A |An )/i, '');
  // Cut at first comma, em dash, or en dash
  const cut = t.search(/,|\s[—–]\s/);
  if (cut > 4 && cut < 80) t = t.slice(0, cut).trim();
  // Limit to 9 words
  const words = t.split(/\s+/);
  if (words.length > 9) t = words.slice(0, 9).join(' ');
  return t.trim().replace(/[,;.]$/, '');
}

function makeDescription(text) {
  const clean = cleanText(text);
  // Take first sentence
  const m = clean.match(/^(.+?[.!?])(?:\s|$)/);
  let desc = m ? m[1] : clean;
  // Truncate if too long (> 22 words)
  const words = desc.split(/\s+/);
  if (words.length > 22) desc = words.slice(0, 20).join(' ') + '.';
  return desc.trim();
}

function formatYearDisplay(year) {
  if (typeof year !== 'number') return String(year);
  return year < 0 ? `${Math.abs(year)} BCE` : String(year);
}

async function scrapeDay(month, day) {
  const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`;
  try {
    const { status, body } = await get(url);
    if (status !== 200) {
      console.warn(`  HTTP ${status} for ${MONTHS[month - 1]} ${day}`);
      return [];
    }
    const data = JSON.parse(body);
    const events = Array.isArray(data.events) ? data.events : [];
    return events
      .filter(ev => typeof ev.year === 'number' && ev.text)
      .map(ev => {
        const cleaned = cleanText(ev.text);
        return {
          year:        ev.year,
          yearDisplay: formatYearDisplay(ev.year),
          title:       makeTitle(cleaned),
          description: makeDescription(ev.text)
        };
      })
      .filter(ev => ev.title.length > 3 && ev.description.length > 10)
      .sort((a, b) => a.year - b.year);
  } catch (err) {
    console.warn(`  Error on ${MONTHS[month - 1]} ${day}: ${err.message}`);
    return [];
  }
}

async function main() {
  const output = {};
  let total = 0;
  const start = Date.now();

  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= DAYS_IN_MONTH[m - 1]; d++) {
      const key    = String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const events = await scrapeDay(m, d);
      output[key]  = events;
      total       += events.length;
      console.log(`Scraped ${MONTHS[m - 1]} ${String(d).padStart(2)} — ${events.length} events`);
      await delay(500);
    }
  }

  const outDir  = path.resolve(__dirname, '..', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'history.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  const mins = ((Date.now() - start) / 60000).toFixed(1);
  console.log(`\nDone — ${total} events across 366 days in ${mins} min`);
  console.log(`Saved to ${outPath}`);
  console.log(`\nNext steps:`);
  console.log(`  git add data/history.json`);
  console.log(`  git commit -m "Add scraped history data"`);
  console.log(`  git push && deploy via cPanel`);
}

main().catch(err => { console.error(err); process.exit(1); });
