# Journeys, second wave: the ledger (23 Nov 2026). JOB-JOURNEY.md is the writers' brief; minimum six stops.
skip: ten-thousand, zhang-qian, ennin, yijing, ibn-fadlan, orellana (too few placed stops in the article)
journey: dias 9, da-gama 8 (years inferred: set null), carpini 8 (order of Wroclaw/Kaniv inferred; two camps at one point),
  hannibal-alps 11 (Alpine stops follow Dodge only, attributed), nikitin 14 (placeholder years), rubruck 8 (Talas and
  the return Sarai inferred: weak), benjamin-of-tudela 14 (thin: almost no events), ibn-jubayr 8 (Mecca not a stop,
  order of Acre inferred: HOLD), cabeza-de-vaca 8, bar-sauma 17 (placeholder years on the pilgrimage), cartier 12,
  cortes 16, cabral 19, de-soto 12 (1543 inferred), first-crusade 18
again with six: faxian, jianzhen
EDITOR'S RULE: an inferred or placeholder year becomes null (the stop shows no date); an inferred order means the
stop goes or the journey is held.
more journeys: faxian 7, jianzhen 7, legazpi 11, drake 16, hasekura 16 (Manila inferred), tasman 11 (several dates inferred;
  Cook Strait stop uses a cape), bering 7, bougainville 8 (1768 inferred x6), cook-second 24 (many years inferred),
  cook-third 23, la-perouse 17 (4 years inferred), first-fleet 7, bounty 17, macartney 17, humboldt 19, mungo-park 14,
  caillie 9, livingstone 16, speke 10, emin-relief 12 (years inferred where only day and month), great-trek 10,
  trail-of-tears 10, long-walk 6 (borderline; Fort Canby's place inferred), sherman 8
more skips: barth
still writing (23 Nov ~16:00): burke-wills, nez-perce, mormon-trail, oregon-trail, napoleon-russia, iwakura, franklin,
  fram, amundsen, terra-nova, endurance, salt-march, everest-1953, kon-tiki, hokulea, selma, tibet-1904

## State at 23 Nov, ~16:15
- out/ = 51 journeys ready (read stop by stop; jfix1..5.js applied with jfix.js; years.js and dateyear.js applied; points.tsv
  complete, all stops have a point: wp titles tested with titles-test.js). rows.tsv = their lines for journeys.tsv.
- skipped/ = 8 (article gives no route): barth, ennin, ibn-fadlan, kon-tiki, orellana, ten-thousand, yijing, zhang-qian.
- held/ = 4 (thin or inferred): benjamin-of-tudela, ibn-jubayr, oregon-trail, emin-relief (the meeting with Emin has no place).
- Still to do: copy out/*.json to scripts/journeys/<slug>.json and src (wp/, out/, points.tsv, the jfix files, JOB-JOURNEY.md),
  add rows.tsv to journeys.tsv in order of time, check make-journeys.js handles 65 journeys (the picker), Kids flags,
  freeze.js if it is part of the pipeline, test scripts/tests/journeys.js, CLAUDE.md, whats-new.
