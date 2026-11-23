// The year the linker reads beside a name (no browser): ENC_FN.near at the foot of encyclopedia-links.js, which the
// profiles and the scans use, and EncNear in scripts/lib/enc-fn.ps1, which the builder uses. The two must agree.
// (From 23 Nov 2026: the first year of "408–407 BCE" was read as 408 CE, so a dated event named beside such a range
// stood "next to a contradicting year" and lost its link.)
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process'), R = process.argv[2];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
// [sentence with NAME where the entry's name stands, the year read for it]
const CASES = [
  ['The city was founded anew in 408–407 BCE, during the NAME, by the three towns.', -407],
  ['NAME (c. 1275–1274 BCE) was fought on the Orontes.', -1275],
  ['From 1200 to 1150 BCE the NAME shook the eastern Mediterranean.', -1150],
  ['The NAME lasted from 1200 to 1150 BCE in the east.', -1200],
  ['Between 480 and 479 BCE the NAME was decided.', -479],
  ['NAME took place between 1274 and 1269 BCE according to the low chronology.', -1274],
  ['The NAME, in 1200/1199 BCE, is known from one tablet.', -1200],
  ['The NAME of 431-404 BC ruined Athens.', -404],
  ['NAME, fought around 490 BCE, ended the first invasion.', -490],
  ['He reigned from 1479 to 1425 BCE; the NAME came early in the reign.', -1425],
  ['The NAME was fought in 31 BCE off the western coast.', -31],
  ['In 753–716 BCE, by tradition, Romulus ruled; the NAME is placed then.', -716],
  ['It lasted until 539 BCE, when the NAME ended it.', -539],
  // years of the common era stay as they are
  ['In 1066 the NAME changed England.', 1066],
  ['After NAME in 1757 and 1764 the Company ruled Bengal.', 1757],
  ['The NAME (1618–1648) ended at Westphalia.', 1618],
  ['The treaty of 1259 and the NAME of 1265 followed.', 1265],
  ['NAME was rebuilt in 1200 and 44 BCE is long past.', 1200],   // "and" joins a range only after "between"
  ['The NAME has no year beside it.', null],
];
const { ENC_FN } = new Function(fs.readFileSync(path.join(R, 'encyclopedia-links.js'), 'utf8') + ';return {ENC_FN}')();
const js = CASES.map(c => { const s = c[0].indexOf('NAME'), r = ENC_FN.near(c[0], s, s + 4); return r ? r.y : null; });
const badJs = CASES.map((c, i) => (js[i] === c[1] ? null : [c[0], c[1], js[i]])).filter(Boolean);
ok('the page’s reader gives each sentence its year', !badJs.length, badJs.slice(0, 3));
ok('the first year of a BCE range is BCE', js[1] === -1275 && js[3] === -1200 && js[5] === -1274 && js[6] === -1200, [js[1], js[3], js[5], js[6]]);
// the builder's port
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'epoch-years-')), cf = path.join(tmp, 'cases.json'), pf = path.join(tmp, 'run.ps1'), of = path.join(tmp, 'out.txt');
fs.writeFileSync(cf, JSON.stringify(CASES.map(c => c[0])));
fs.writeFileSync(pf, '﻿' + [
  'param([string]$Lib, [string]$Cases, [string]$Out)',
  '. $Lib',
  'Add-Type -AssemblyName System.Web.Extensions',
  '$j = (New-Object Web.Script.Serialization.JavaScriptSerializer).DeserializeObject([IO.File]::ReadAllText($Cases, [Text.Encoding]::UTF8))',
  '$o = New-Object Collections.Generic.List[string]',
  "foreach ($c in $j) { $s = $c.IndexOf('NAME'); $r = EncNear $c $s ($s + 4); if ($r) { $o.Add([string]$r.y) } else { $o.Add('-') } }",
  '[IO.File]::WriteAllLines($Out, $o)',
].join('\r\n'));
const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', pf, '-Lib', path.join(R, 'scripts', 'lib', 'enc-fn.ps1'), '-Cases', cf, '-Out', of], { encoding: 'utf8', timeout: 120000 });
if (r.error || !fs.existsSync(of)) console.log('note the builder’s port was not run (no Windows PowerShell here)' + (r.stderr ? ': ' + r.stderr.slice(0, 200) : ''));
else {
  const ps = fs.readFileSync(of, 'utf8').split(/\r?\n/).filter(Boolean).map(x => (x === '-' ? null : +x));
  const diff = CASES.map((c, i) => (ps[i] === js[i] ? null : [c[0], js[i], ps[i]])).filter(Boolean);
  ok('the builder’s reader agrees with the page’s on every sentence', ps.length === CASES.length && !diff.length, diff.slice(0, 3));
}
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
