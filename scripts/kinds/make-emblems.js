// Emblems of the profiles of the other kinds, in the house style of logos-src/ (Oct 2026): a gold ring (#C9A84C, 7 px at
// radius 228.5) and a thin inner ring (the same gold at two-thirds, 2 px at 206.5) on a transparent 480 px square, with a
// sign of the culture where one is well attested (a script's letter or character, the Đông Sơn drums' central star, a
// dolmen) in #E8C97A, otherwise its initial in Crimson Pro bold. Drawn on a canvas in headless Edge (real script shaping
// and the system's fonts for CJK, Hangul and Cyrillic); writes logos-src/<name>.png, then run scripts/resize-logos.ps1.
//   node scripts/kinds/make-emblems.js [--sheet=file.png] [name …]   (no names: every row of EMBLEMS)
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..');
const EMBLEMS = [
  // [profile name, glyph or a drawing, font (default Crimson Pro bold), size]
  ['Mehrgarh culture', 'M'], ['Vedic civilisation', 'V'], ['Painted Grey Ware culture', 'P'],
  ['South Indian megalithic culture', '#dolmen'], ['Sangam-age Tamilakam', '\u{11022}', 'Noto Sans Brahmi', 230],   // Tamil-Brahmi ta
  ['Jōmon culture', '縄', 'serif-cjk', 220], ['Yayoi culture', '弥', 'serif-cjk', 220], ['Yangshao culture', '仰', 'serif-cjk', 220],
  ['Liangzhu culture', '良', 'serif-cjk', 220], ['Sanxingdui culture', '三', 'serif-cjk', 220], ['Mumun culture', '무', 'Batang, "Malgun Gothic", serif', 220],
  ['Dong Son culture', '#star'], ['Ban Chiang culture', 'B'], ['Oxus civilisation', 'O'], ['Ainu', 'A'],
  ['Natufians', 'N'], ['Ubaid culture', 'U'], ['Yamnaya culture', 'Я'], ['Bell Beaker culture', 'B'], ['Thracians', 'Θ'],
  ['Sámi', 'S'], ['Igbo-Ukwu culture', 'I'], ['Kerma culture', 'K'], ['Nazca culture', 'N'], ['Hopewell culture', 'H'],
  ['Taíno', 'T'], ['Thule people', 'T'], ['Mapuche', 'M'], ['Caral–Supe civilisation', 'C'], ['Māori', 'M'],
  // A2, 3 Nov 2026: a letter of the people's own script where one is in use (the Tifinagh yaz for the Tuareg, not ⵜ, which reads as a cross; Inuktitut syllabics
  // for the Inuit), a character of the Chinese site name for the Chinese cultures (Erlitou: 里, as 二 reads as a sign), otherwise the initial
  ['San people', 'S'], ['Khoekhoe', 'K'], ['Tuareg', 'ⵣ', 'Ebrima, "Noto Sans Tifinagh", sans-serif', 220], ['Aboriginal Australians', 'A'],
  ['Kalinago', 'K'], ['Inuit', 'ᐃ', 'Gadugi, Euphemia, "Noto Sans Canadian Aboriginal", sans-serif', 220], ['Navajo', 'N'], ['Lakota people', 'L'],
  ['Clovis culture', 'C'], ['Paracas culture', 'P'], ['La Tène culture', 'L'], ['Hallstatt culture', 'H'], ['Cucuteni–Trypillia culture', 'C'],
  ['Nuragic civilisation', 'N'], ['Iberians', 'I'], ['Tocharians', 'T'], ['Longshan culture', '龍', 'serif-cjk', 220],
  ['Hongshan culture', '紅', 'serif-cjk', 220], ['Erlitou culture', '里', 'serif-cjk', 220], ['Hoabinhian', 'H'],
  // A3 and A4, 3 Nov 2026: each language a letter of its own script (Sinhala for Pali, the script of the Sri Lankan canon;
  // Glagolitic zhivete for Old Church Slavonic, as its A reads as a cross; Inscriptional Pahlavi; Gothic; Coptic shai; Ge'ez gi; Phoenician aleph), the
  // Latin-written ones a letter of their own (Æ) or the initial; religions the initial, Bon a Tibetan ba (its yungdrung
  // is a swastika, never drawn) and Chinese folk religion 神 ("spirit, god"); no sacred symbol of a living faith
  ['Pali', 'ප', 'Nirmala UI, "Iskoola Pota", sans-serif', 220], ['Old English', 'Æ'], ['Tamil', 'த', 'Nirmala UI, Latha, sans-serif', 220],
  ['Malay', 'M'], ['Armenian', 'Ա', 'Sylfaen, "Segoe UI", serif', 230], ['Mongolian', 'M'], ['Ottoman Turkish', 'O'],
  ['Middle Persian', '\u{10B6F}', '"Segoe UI Historic", sans-serif', 230], ['Old Church Slavonic', 'Ⰶ', '"Segoe UI Historic", sans-serif', 230],
  ['Gothic', '\u{10332}', '"Segoe UI Historic", sans-serif', 230], ['Guarani', 'G'], ['Georgian', 'ქ', 'Sylfaen, "Segoe UI", serif', 230],
  ['Coptic', 'Ϣ', '"Segoe UI Historic", "Segoe UI", sans-serif', 230], ["Ge'ez", 'ግ', 'Ebrima, Nyala, sans-serif', 230], ['Hawaiian', 'H'],
  ['Phoenician', '\u{10900}', '"Segoe UI Historic", sans-serif', 230],
  ['Mesopotamian religion', 'M'], ['Canaanite religion', 'C'], ['Roman religion', 'R'], ['Celtic religion', 'C'], ['Slavic paganism', 'S'],
  ['Mithraism', 'M'], ['Tengrism', 'T'], ['Bon', 'བ', '"Microsoft Himalaya", serif', 260], ['Chinese folk religion', '神', 'serif-cjk', 220],
  ['Druze faith', 'D'], ['Yazidism', 'Y'], ['Haitian Vodou', 'V'],
  ["El Perú-Waka'", 'W'],   // the Maya city's own name, not the Spanish "Perú"
];
const argv = process.argv.slice(2), sheet = (argv.find(a => a.startsWith('--sheet=')) || '').slice(8);
// --initial: a name not in EMBLEMS gets the monogram of its first distinctive word (the Kingdom of Kano: K), as the
// state profiles without a flag or arms have had since Oct 2026
const initial = argv.includes('--initial'), GEN = /^(kingdom|empire|of|the|sultanate|republic|duchy|county|principality|emirate|khanate|dynasty|state|city|confederation|federation|union|commonwealth|grand|holy|free|first|second|new|and|united|states|province|colony|protectorate|mandate|territory|north|south|east|west|upper|lower|great|ancient|old|later|early|northern|southern|eastern|western|el|la|de|al|colonial|mandatory|socialist|federal|oriental|islamic|hellenic)$/i;
const only = argv.filter(a => !a.startsWith('--')), rows = only.length ? only.map(n => EMBLEMS.find(r => r[0] === n) || (initial ? [n, (n.split(/[\s(-]+/).find(w => w && !GEN.test(w)) || n)[0].toUpperCase()] : null)) : EMBLEMS;
if (rows.some(r => !r)) { console.error('unknown name among: ' + only.join(', ') + ' (pass --initial for a monogram)'); process.exit(1); }
const font64 = f => fs.readFileSync(path.join(R, 'fonts', f)).toString('base64');
const PAGE = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:'Crimson Pro';font-weight:200 900;src:url(data:font/woff2;base64,${font64('crimson-pro-normal-latin.woff2')}) format('woff2')}
@font-face{font-family:'Crimson Pro X';font-weight:200 900;src:url(data:font/woff2;base64,${font64('crimson-pro-normal-latin-ext.woff2')}) format('woff2')}
@font-face{font-family:'Noto Sans Brahmi';src:url(data:font/woff2;base64,${font64('noto-sans-brahmi.woff2')}) format('woff2')}
</style><body>`;
function launch(pw) {   // as scripts/make-posters.js: Edge 156 closes Playwright's pipe, so a debugging port when needed
  return (async () => {
    try { return await pw.chromium.launch({ channel: 'msedge' }); } catch (e) {}
    const exe = path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe');
    const port = 9400 + Math.floor(Math.random() * 500), ud = path.join(require('os').tmpdir(), 'emblems-edge-' + port);
    require('child_process').spawn(exe, ['--headless', '--no-first-run', '--disable-sync', '--remote-debugging-port=' + port, '--user-data-dir=' + ud, 'about:blank'], { stdio: 'ignore' });
    for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 250)); try { const b = await pw.chromium.connectOverCDP('http://127.0.0.1:' + port), close = b.close.bind(b);
      b.close = async () => { try { await (await b.newBrowserCDPSession()).send('Browser.close'); } catch (e) {} try { await close(); } catch (e) {} await new Promise(r => setTimeout(r, 500)); try { fs.rmSync(ud, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }); } catch (e) {} };
      return b; } catch (e) {} }
    throw new Error('no Edge');
  })();
}
(async () => {
  // playwright-core: npm install --prefix scripts playwright-core, or a folder that has it in EPOCH_PW
  const pw = require(require.resolve('playwright-core', { paths: [path.join(R, 'scripts'), process.env.EPOCH_PW || R] }));
  const browser = await launch(pw), pg = await (browser.contexts()[0] || await browser.newContext()).newPage();
  await pg.setContent(PAGE);
  await pg.evaluate(() => document.fonts.load('700 100px "Crimson Pro"').then(() => document.fonts.load('700 100px "Crimson Pro X"')).then(() => document.fonts.load('100px "Noto Sans Brahmi"')));
  const out = await pg.evaluate(rows => {
    const G = '#E8C97A', RING = '#C9A84C';
    const draw = r => {
      const c = document.createElement('canvas'); c.width = c.height = 480; const g = c.getContext('2d');
      g.strokeStyle = RING; g.lineWidth = 7; g.beginPath(); g.arc(240, 240, 228.5, 0, 2 * Math.PI); g.stroke();
      g.globalAlpha = 0.67; g.lineWidth = 2; g.beginPath(); g.arc(240, 240, 206.5, 0, 2 * Math.PI); g.stroke(); g.globalAlpha = 1;
      g.fillStyle = G; g.strokeStyle = G;
      if (r[1] === '#star') {   // the central star of a Đông Sơn drum's tympanum: a disc with long rays, here twelve
        const n = 12; g.beginPath();
        for (let i = 0; i < 2 * n; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? 46 : 128; g.lineTo(240 + rr * Math.cos(a), 240 + rr * Math.sin(a)); }
        g.closePath(); g.fill();
        g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(240, 240, 30, 0, 2 * Math.PI); g.fill(); g.globalCompositeOperation = 'source-over';
        g.beginPath(); g.arc(240, 240, 18, 0, 2 * Math.PI); g.fill();
        g.lineWidth = 3; g.beginPath(); g.arc(240, 240, 150, 0, 2 * Math.PI); g.stroke();
      } else if (r[1] === '#dolmen') {   // a dolmen: two uprights under a capstone, on the ground line
        g.beginPath(); g.moveTo(140, 196); g.quadraticCurveTo(240, 150, 342, 188); g.lineTo(346, 222); g.quadraticCurveTo(240, 206, 136, 228); g.closePath(); g.fill();
        g.fillRect(166, 232, 34, 86); g.fillRect(282, 228, 34, 90);
        g.fillRect(126, 322, 228, 8);
      } else {
        const fam = r[2] === 'serif-cjk' ? '"Yu Mincho", "MS Mincho", SimSun, "Noto Serif CJK JP", serif' : r[2] || '"Crimson Pro", "Crimson Pro X", Georgia, serif';
        const size = r[3] || 250; g.font = (r[2] ? '' : '700 ') + size + 'px ' + fam; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        const m = g.measureText(r[1]), h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
        const x = 240 + (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2, y = 240 + h / 2 - m.actualBoundingBoxDescent;
        g.fillText(r[1], x, y);
        // the CJK, Hangul and Brahmi faces are hairline beside the bold letters: a stroke gives them the same weight
        if (r[2]) { g.lineWidth = 9; g.lineJoin = 'round'; g.strokeText(r[1], x, y); }
      }
      return c;
    };
    const res = rows.map(r => [r[0], draw(r).toDataURL('image/png')]);
    // a contact sheet: every emblem on the dark and the light page colour, with its name
    const cols = 6, cw = 180, ch = 200, sh = document.createElement('canvas'); sh.width = cols * cw; sh.height = Math.ceil(rows.length / cols) * ch * 2;
    const s = sh.getContext('2d');
    rows.forEach((r, i) => { const c = draw(r); for (const [k, bg, fg] of [[0, '#0b0c10', '#ddd'], [1, '#f4efe4', '#333']]) {
      const x = (i % cols) * cw, y = (Math.floor(i / cols) * 2 + k) * ch; s.fillStyle = bg; s.fillRect(x, y, cw, ch); s.drawImage(c, x + 20, y + 10, 140, 140);
      s.fillStyle = fg; s.font = '13px sans-serif'; s.textAlign = 'center'; s.fillText(r[0].slice(0, 26), x + cw / 2, y + 180); } });
    return { res, sheet: sh.toDataURL('image/png') };
  }, rows);
  for (const [name, url] of out.res) fs.writeFileSync(path.join(R, 'logos-src', name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  if (sheet) fs.writeFileSync(sheet, Buffer.from(out.sheet.split(',')[1], 'base64'));
  await browser.close();
  console.log(out.res.length + ' emblems written to logos-src/' + (sheet ? '; sheet ' + sheet : ''));
})().catch(e => { console.error(e); process.exit(1); });
