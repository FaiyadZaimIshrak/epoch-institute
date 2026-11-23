// The editor's changes after reading every movement draft's facts, takeaways, events and summary (and the hardest
// sections) against its article:   node ../battles/apply-fixes.js fix-move1.js out      (run in the moves3 folder)
module.exports = {
 // a label is one year
 'hundred-days-reform': [['1839–1842', '1839'], ['1894–1895', '1894'],
  ['The First Opium War, the first of two defeats that started', 'The First Opium War begins, the first of two defeats that started'],
  ['China is defeated by Meiji Japan in the First Sino-Japanese War, and the Treaty of Shimonoseki cedes', 'The First Sino-Japanese War begins; China is defeated by Meiji Japan in 1895, and the Treaty of Shimonoseki cedes']],
 'puritans': [['clergy of New England;John Milton', 'clergy of New England; John Milton']],
 'quakers': [['and today number an estimated 377,557 adults in 2017, mostly in Africa', 'and numbered an estimated 377,557 adults in 2017, most of them in Africa']],
 'donghak-peasant-revolution': [['other other figures', 'other figures']],
 'wahhabism': [['military conflicts with rival tribal chiefs, and that Ibn Abd al-Wahhab advised the emir', 'military conflicts with rival tribal chiefs; Ibn Abd al-Wahhab advised the emir'],
  ['was destroyed in the Wahhabi Wars of 1818', 'was destroyed in 1818, at the end of the Wahhabi Wars']],
 'march-first-movement': [['Organizers chose nonviolence', 'Organisers chose nonviolence']],
 _set: {
  // the first dated act the article gives is the pact of 1744; "early 18th century" stays in the period fact
  'wahhabism': { start: 1744, circa: false },
 },
};
