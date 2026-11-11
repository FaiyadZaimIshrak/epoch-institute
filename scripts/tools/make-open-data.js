// More open data (winter round W6, Nov 2026): four tables beside the states register and the power curves, written
// as root files and listed in /dataset's build:open-data-more block. build-pages.ps1 runs it after its own open data.
//   node scripts/tools/make-open-data.js
//   epoch-institute-people.csv        the dated people of the encyclopedia (people-data.js), with their Wikidata item
//                                     (scripts/entry-wikidata.tsv, scope same) and places of birth and death
//                                     (scripts/entry-places.tsv)
//   epoch-institute-songs.csv         Songs in History (scripts/songs/songs.json): what each song is, never its words
//   epoch-institute-inventions.csv    the inventions tree (scripts/inventions.tsv)
//   epoch-institute-encyclopedia-wikidata.csv   every entry matched to its Wikipedia article and Wikidata item
// Only the Institute's own tables and Wikidata's facts (CC0): no description of an entry (those are derived from
// Wikipedia), no picture, no song text. Years are negative for BCE.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), R = path.join(__dirname, '..', '..'), SITE = 'https://the-epoch-institute.org';
const read = f => fs.readFileSync(path.join(R, f), 'utf8'), tsv = f => fs.existsSync(path.join(R, f)) ? read(f).split(/\r?\n/).filter(l => l && l[0] !== '#').map(l => l.split('\t')) : [];
const csv = v => { const s = v === null || v === undefined ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const table = (head, rows) => head.join(',') + '\r\n' + rows.map(r => r.map(csv).join(',')).join('\r\n') + '\r\n';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nf = n => n.toLocaleString('en-GB');
const out = {};
// people
const box = {}; vm.runInNewContext(read('people-data.js'), box);
const KIND = ['lifespan', 'reign', 'active', 'died', 'born', 'century'];
const wd = {}; for (const r of tsv('scripts/entry-wikidata.tsv')) wd[r[0]] = r;
const pl = {}; for (const r of tsv('scripts/entry-places.tsv')) (pl[r[0]] = pl[r[0]] || {})[r[1]] = r;
const people = box.PEOPLE.map(p => { const w = wd[p[0]], same = w && w[4] === 'same', b = (pl[p[0]] || {}).b, d = (pl[p[0]] || {}).d;
  return [p[0], p[1], p[2], p[3], p[4], KIND[p[5]] || '', p[6] >= 0 ? box.PEOPLE_REGIONS[p[6]] : '', same ? w[2] : '', b ? b[3] : '', b ? b[4] : '', b ? b[5] : '', b ? b[6] : '', d ? d[3] : '', d ? d[4] : '', d ? d[5] : '', d ? d[6] : '', SITE + '/encyclopedia/' + p[0]]; });
out['epoch-institute-people.csv'] = table(['id', 'name', 'dates_as_written', 'first_year', 'last_year', 'dates_are', 'region', 'wikidata_item', 'birth_place', 'birth_latitude', 'birth_longitude', 'birth_country', 'death_place', 'death_latitude', 'death_longitude', 'death_country', 'page_url'], people);
const nBorn = people.filter(p => p[8]).length;
// songs
const songs = JSON.parse(read('scripts/songs/songs.json')).slice().sort((a, b) => a.year - b.year || a.slug.localeCompare(b.slug));
out['epoch-institute-songs.csv'] = table(['id', 'title', 'own_title', 'year', 'date_as_written', 'culture', 'languages', 'place', 'region', 'types', 'words_status', 'words_on_the_page', 'page_url'],
  songs.map(s => [s.slug, s.title, (s.local || '').replace(/^not known$/i, ''), s.year, s.undated ? 'date unknown' : s.date, s.culture, (s.langs || []).map(l => l.name).join('; '), s.place, s.region, (s.types || []).join('; '), s.pd ? 'public domain' : 'in copyright', s.text && s.text.parts && (s.text.parts.orig || s.text.parts.en) ? 'yes' : 'no', SITE + '/songs/' + s.slug]));
// inventions
const inv = tsv('scripts/inventions.tsv');
out['epoch-institute-inventions.csv'] = table(['id', 'name', 'lane', 'year', 'approximate', 'date_as_written', 'place', 'credited_to', 'people', 'independent_origins', 'built_on', 'note', 'page_url'],
  inv.map(r => [r[0], r[1], r[2], r[3], r[4] === '1' ? 'yes' : 'no', r[5], r[6], (r[7] || '').replace(/;/g, '; '), (r[8] || '').replace(/=/g, '').replace(/;/g, '; '), (r[9] || '').replace(/\|/g, ' ').replace(/;/g, '; '), (r[10] || '').replace(/,/g, '; '), r[11] || '', SITE + '/encyclopedia/' + r[0]]));
// the entries and Wikidata
const IDX = new Function(read('search-index.js') + '; return SEARCH_INDEX;')(), meta = {}; for (const r of IDX) meta[r[0]] = r;
const ew = Object.values(wd).filter(r => meta[r[0]] && /^Q\d+$/.test(r[2] || '')).sort((a, b) => a[0].localeCompare(b[0]));
out['epoch-institute-encyclopedia-wikidata.csv'] = table(['id', 'name', 'kind', 'wikipedia_article', 'wikidata_item', 'match', 'page_url'],
  ew.map(r => [r[0], meta[r[0]][1], meta[r[0]][2], r[1], r[4] === 'same' ? r[2] : '', r[4] === 'same' ? 'the same subject' : r[4] === 'section' ? 'a section of a broader article' : 'a broader or related article', SITE + '/encyclopedia/' + r[0]]));
const size = {}; for (const [f, s] of Object.entries(out)) { const p = path.join(R, f); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== s) fs.writeFileSync(p, s); size[f] = Buffer.byteLength(s); }
const fsz = f => size[f] >= 1048576 ? (size[f] / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(size[f] / 1024)) + ' KB';
const dl = (f, label) => '<a class="od-dl-btn" href="/' + f + '" download>' + label + ' <span>' + fsz(f) + '</span></a>';
const ORG = { '@type': 'Organization', name: 'The Epoch Institute', url: SITE + '/' };
const ld = (id, name, desc, f, vars) => ({ '@type': 'Dataset', '@id': SITE + '/dataset#' + id, name, description: desc, url: SITE + '/dataset', license: 'https://creativecommons.org/licenses/by/4.0/', isAccessibleForFree: true, creator: ORG, publisher: ORG, variableMeasured: vars, distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: SITE + '/' + f }] });
const sets = [
  ['people', 'Dataset 3', 'People', 'The dated people of the encyclopedia: who they were is on each page; this table has when and where. Dates are as the entry writes them, with the first and last year read from them and what those years are (a lifespan, a reign, years of activity). The region is the Institute&#8217;s: where a life&#8217;s significance lies. Places of birth and death come from Wikidata, for the people whose record the Institute has matched.',
    ['<b>' + nf(people.length) + '</b> people', '<b>' + nf(people.filter(p => p[7]).length) + '</b> with a Wikidata item', '<b>' + nf(nBorn) + '</b> with a birthplace'], 'epoch-institute-people.csv', 'People, CSV',
    'id (as in /encyclopedia/&lt;id&gt;), name, dates_as_written, first_year and last_year (negative = BCE), dates_are (lifespan, reign, active, died, born, century), region, wikidata_item, birth_place with its latitude, longitude and present-day country (the id of its country history), the same four for the place of death, page_url.',
    'Explore it on the site: <a href="/people/">People in History</a>', ld('people', 'The Epoch Institute People', 'The dated people of The Epoch Institute’s encyclopedia with their years, region, Wikidata item and places of birth and death.', 'epoch-institute-people.csv', ['first year', 'last year', 'region', 'place of birth', 'place of death'])],
  ['songs', 'Dataset 4', 'Songs in History', 'Every song of Songs in History: its title and its own name, date, culture, languages, place, region and kinds, and whether its words are in the public domain and printed on its page. The words themselves are not in the table.',
    ['<b>' + nf(songs.length) + '</b> songs', '<b>' + nf(new Set(songs.flatMap(s => (s.langs || []).map(l => l.name))).size) + '</b> languages'], 'epoch-institute-songs.csv', 'Songs, CSV',
    'id (as in /songs/&lt;id&gt;), title, own_title, year (negative = BCE; the year the song is filed under), date_as_written, culture, languages, place, region, types, words_status (public domain or in copyright), words_on_the_page, page_url.',
    'Explore it on the site: <a href="/songs/">Songs in History</a>', ld('songs', 'The Epoch Institute Songs in History', 'The songs of Songs in History with their dates, cultures, languages, places and kinds. The words of the songs are not included.', 'epoch-institute-songs.csv', ['year', 'culture', 'language', 'place', 'kind of song'])],
  ['inventions', 'Dataset 5', 'Inventions and Discoveries', 'The inventions tree as a table: each invention or discovery with the date of the earliest firm evidence its source accepts, where it appeared, to whom it is credited, where else it arose on its own, and the earlier inventions it built on.',
    ['<b>' + nf(inv.length) + '</b> inventions', '<b>' + nf(inv.reduce((n, r) => n + (r[10] ? r[10].split(',').length : 0), 0)) + '</b> &#8220;built on&#8221; links'], 'epoch-institute-inventions.csv', 'Inventions, CSV',
    'id (as in /encyclopedia/&lt;id&gt;), name, lane, year (negative = BCE), approximate, date_as_written, place, credited_to, people, independent_origins, built_on (ids, separated by &#8220;; &#8221;), note, page_url.',
    'Explore it on the site: <a href="/inventions">the Inventions Tree</a>', ld('inventions', 'The Epoch Institute Inventions and Discoveries', 'Inventions and discoveries with the date and place of their earliest firm evidence and the earlier inventions each built on.', 'epoch-institute-inventions.csv', ['year', 'place', 'credited to', 'built on'])],
  ['wikidata', 'Dataset 6', 'Encyclopedia entries and Wikidata', 'The encyclopedia&#8217;s entries matched to their Wikipedia article and Wikidata item, for joining the Institute&#8217;s pages with other collections. A match was kept only where something besides the name agrees: the picture, the years or the text. The item is given only where the article is about the same subject.',
    ['<b>' + nf(ew.length) + '</b> entries matched', '<b>' + nf(ew.filter(r => r[4] === 'same').length) + '</b> to the same subject'], 'epoch-institute-encyclopedia-wikidata.csv', 'Entries, CSV',
    'id (as in /encyclopedia/&lt;id&gt;), name, kind, wikipedia_article (English Wikipedia), wikidata_item, match (the same subject, a section of a broader article, a broader or related article), page_url.',
    'Explore it on the site: <a href="/encyclopedia/">the Encyclopedia</a>', ld('wikidata', 'The Epoch Institute Encyclopedia and Wikidata', 'The entries of The Epoch Institute’s encyclopedia matched to English Wikipedia articles and Wikidata items.', 'epoch-institute-encyclopedia-wikidata.csv', ['Wikipedia article', 'Wikidata item'])]
];
const html = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': sets.map(s => s[9]) }) + '</script>\n' +
  sets.map(s => '<section class="od-set" id="' + s[0] + '" aria-labelledby="od-' + s[0] + '"><p class="od-kicker">' + s[1] + '</p><h2 class="od-title" id="od-' + s[0] + '">' + s[2] + '</h2><p class="od-desc">' + s[3] + '</p><ul class="od-facts">' + s[4].map(x => '<li>' + x + '</li>').join('') + '</ul><div class="od-dl">' + dl(s[5], s[6]) + '</div><details class="od-cols"><summary>The columns</summary><dl><dt>CSV</dt><dd>' + s[7] + '</dd></dl></details><p class="od-explore">' + s[8] + '</p></section>').join('\n');
const dp = path.join(R, 'dataset'), d0 = fs.readFileSync(dp, 'utf8'), a = d0.indexOf('<!-- build:open-data-more -->'), b = d0.indexOf('<!-- /build:open-data-more -->');
if (a < 0 || b < a) throw new Error('/dataset has no build:open-data-more block');
const d1 = d0.slice(0, a) + '<!-- build:open-data-more -->\n' + html + '\n' + d0.slice(b); if (d1 !== d0) fs.writeFileSync(dp, d1);
console.log('open data: ' + nf(people.length) + ' people (' + nf(nBorn) + ' with a birthplace), ' + songs.length + ' songs, ' + inv.length + ' inventions, ' + nf(ew.length) + ' entries matched to Wikidata; ' + Object.keys(out).map(f => f.replace('epoch-institute-', '') + ' ' + fsz(f)).join(', '));
