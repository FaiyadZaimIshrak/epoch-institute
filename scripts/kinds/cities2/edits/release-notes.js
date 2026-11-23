// The release's notes: two rows at the head of scripts/whats-new.tsv and a block in CLAUDE.md after the battles' second wave.
//   node notes.js <repo>
const fs = require('fs'), path = require('path'), R = process.argv[2];
const put = (f, fn) => { const p = path.join(R, f); let t = fs.readFileSync(p, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n'); const u = fn(t); if (u === t) throw new Error('nothing changed in ' + f); fs.writeFileSync(p, crlf ? u.replace(/\n/g, '\r\n') : u); console.log('ok ' + f); };
const once = (t, a) => { if (t.split(a).length !== 2) throw new Error((t.split(a).length - 1) + ' x ' + a.slice(0, 70)); };

put('scripts/whats-new.tsv', t => { const a = '2026-11-23\tMenus by subject\t'; once(t, a); if (t.includes('\tNinety more cities\t')) throw new Error('rows there already');
  const rows = [
    ['2026-11-23', 'Ninety more cities', 'The cities now number 110. New among them: Moscow, Berlin, Vienna, Lisbon, Prague, Kyiv, Florence, Granada, Damascus, Aleppo, Medina, Bukhara, Herat, Persepolis, Nineveh, Lahore, Varanasi, Angkor, Malacca, Nanjing, Hangzhou, Seoul, Lhasa, Karakorum, Djenné, Benin City, Kumasi, Meroë, Mexico City, Potosí, Havana, Boston, Sydney and Honolulu. Each profile tells the city’s origins, its great ages, who ruled it, life in the city, its sieges and disasters, and what it left.', 'Cities|/profiles?kind=city ; Moscow|/city/moscow ; Angkor|/city/angkor ; Benin City|/city/benin-city', 'feature'],
    ['2026-11-23', 'Fifty-one more journeys on the globe', 'Journeys on the Globe now follows 65 journeys stop by stop, 864 stops in all. New among them: Hannibal over the Alps, Faxian, the First Crusade, Rabban Bar Sauma, William of Rubruck, Vasco da Gama, Cortés, Drake, Tasman, Bering, Cook’s second and third voyages, the First Fleet, Humboldt, Mungo Park, Livingstone, the Trail of Tears, the Great Trek, Burke and Wills, the Iwakura Mission, Nansen’s Fram, Amundsen and Scott, Shackleton’s Endurance, the Salt March, Everest in 1953 and Hōkūleʻa. Choose an age first, then a journey.', 'Journeys on the Globe|/journeys', 'feature'],
  ];
  return t.replace(a, () => rows.map(r => r.join('\t')).join('\n') + '\n' + a); });

put('CLAUDE.md', t => { const a = '  - Seen and left: the encyclopedia has two entries for Francis I of France (francis-i, without a picture, and\n    francis-i-of-france).\n'; once(t, a);
  const block = [
'- **The second wave of cities, 90 (23 Nov 2026; 110 in all; scripts/kinds/cities2/):**',
'  - **The list** (list.tsv, names.tsv with each region by hand): every region and age, among them ruined cities (Persepolis,',
'    Nineveh, Palmyra, Susa, Ctesiphon, Pompeii, Mohenjo-daro, Taxila, Pataliputra, Angkor, Karakorum, Merv, Meroë, Copán,',
'    Palenque, Chan Chan). A ruined city has an end year; a living one none.',
'  - **Each city:** one Sonnet writer with CITIES-GUIDE.md and JOB-CITY.md from the saved article (wp/<slug>.txt, and',
'    wp/<slug>-history.txt where the city has a history article of its own), check-drafts.js, the editor\'s read and',
'    exact-pair fixes (edits/fix-city1..8.js through apply-fixes.js). Six were revised from a second saved article where',
'    the city\'s own said too little of a hard chapter (Malacca City; Huế in 1968; Addis Ababa in February 1937; Honolulu',
'    in 1893; Nanjing in 1937; Santo Domingo\'s Taíno and enslaved people). Dates set by hand: Shanghai starts in 1074 (the',
'    market town, not the first settlement of the region), Pataliputra ends c. 637, Palmyra 1932.',
'  - **References** from each article\'s own book list (picks.tsv, refs.js): 51 cities have books, 39 none.',
'  - **Emblems** (emblems.txt, "Name|entry slug"): the city\'s own entry picture cropped square, or a landmark\'s where the',
'    entry shows a skyline, a map or a flag (the Kremlin for Moscow, Dublin Castle, the Arg of Karim Khan for Shiraz); a',
'    letter for Antioch, Ctesiphon, Pataliputra and Addis Ababa.',
'  - **Links:** 89 exclusions (excl1-3.tsv through add-excl.js, which checks every profile and entry before it appends:',
'    the Sydney Gazette as Sydney in Nova Scotia, John Cotton as the fibre, Homer Plessy as the poet, the Bronze Horseman',
'    as bronze, Timur Shah as Timur, the Hindu Shahis as Hinduism, the Liu Song as the Song dynasty, "present-day Benin"',
'    as the Benin Empire, the Syriac Orthodox Church as the Eastern Orthodox, King Denis of Portugal as a king of Gabon,',
'    the emperor Titus as the saint, Seoul\'s Five Grand Palaces as Bangkok\'s, Aleppo\'s Great Umayyad Mosque as',
'    Damascus\'s); four profile-only forms (forms.js: Afonso I and King Denis on Lisbon, Sviatoslav on Karakorum, Titus on',
'    Pompeii); two sentences reworded where the entry is right elsewhere on the page ("Batu-Möngke Dayan Khan" linked',
'    Möngke, "Emperor Taizu of Liang" the Song founder). A form whose row exists for another profile is not inserted by',
'    forms.js: add the profile to that row by hand.',
'  - **The pictures find wrong links the audits miss.** link-audit.js reads links whose text is not the entry\'s own name;',
'    a namesake linked by its exact name ("the Hagia Sophia" of Thessaloniki, "the Red Fort" of Agra, "The Prince of',
'    Płock" as Machiavelli\'s book) shows only when its picture stands on the sheet. Read the sheets for that too.',
'  - **Section pictures** (pictures/city-propose.js, newsheet.js, city-picks.js; refuse.txt): per section the first',
'    pictured entry it links, a monument first, then a site or object, a person, a text, an event; never the city\'s own',
'    entry, no picture twice in a profile. Looked at on sheets over five rounds (243 refused; a refusal holds for every',
'    section of that profile): no maps, flags, arms, logos, modern city views, modern statues and busts, later imagined',
'    portraits, generic terms (bishop, sultan, madrasa), or a picture of another place than the one meant (the Apadana of',
'    Persepolis for Susa\'s mound). 368 pictures on 89 cities; Anuradhapura has none.',
'  - Regions are uneven in the older data too (Bukhara, Herat, Merv and Kabul stand with the Islamic Middle East as the',
'    Seljuks do, Samarkand with Central Asia as the Timurids do): left.',
'- **The second wave of journeys, 51 (23 Nov 2026; 65 journeys, 864 stops; scripts/journeys/src/wave2/):**',
'  - **Each journey:** one saved article, a Sonnet writer with JOURNEYS-GUIDE.md and JOB-JOURNEY.md, check-journeys.js.',
'    A journey needs six stops the article places (the first wave had asked eight; the Hijra has four). ledger.md has',
'    every candidate: 63 tried, 51 kept, 8 skipped because the article gives no route (Barth, Ennin, Ibn Fadlan, Kon-Tiki,',
'    Orellana, the Ten Thousand, Yijing, Zhang Qian: skipped/), 4 held as thin or inferred (Benjamin of Tudela, Ibn',
'    Jubayr, the Oregon Trail, the Emin Pasha relief expedition: held/).',
'  - **The editor\'s rule for dates:** a year the writer inferred or set as a placeholder becomes null (the stop shows no',
'    date); a year the section\'s heading or the sentence before gives is kept (years.js, dateyear.js). An inferred ORDER',
'    of stops means the stop goes or the journey is held.',
'  - **Points:** as before, the entry\'s point or Wikidata\'s for the article named in "wp". About sixty stops had none or',
'    a wrong one (a disambiguation page, a namesake: Kamalia in Pakistan for the town in Mali, a cape for a strait):',
'    titles-test.js tries a title before it is written in; a place whose site is unknown (Mabila) is told in the',
'    journey\'s ending, not drawn. jfix.js with jfix1..6.js holds the changes.',
'  - **The picker by age** (make-journeys.js ERAS and eraOf, journeys.js setEra, .jr-eras): five buttons (Before 1500,',
'    1500 to 1699, 1700 to 1799, 1800 to 1899, Since 1900) with their counts; only the chosen age\'s journeys are offered,',
'    on phones in one row that scrolls sideways; the age of the journey in the address is set before the first paint.',
'    Without scripts every journey is listed. journeys.tsv is in order of time. A stop\'s text is 12 to 50 words (the',
'    test checks it).',
'  - Kids mode leaves out 33 journeys of war, conquest, removal and enslavement (data-kids="0").',
''].join('\n');
  return t.replace(a, () => a + block); });
