// Wave ms2 (22 Nov 2026): the First French Empire, which the register lacked (France had nothing on record between
// the First Republic, to 1804, and the Bourbon Restoration, from 1814; Belgium, Luxembourg and the Netherlands
// nothing for the years of French rule). Format as scripts/states/ms1/register.js; "followed-by" names an existing
// state that succeeded the new one. The present-day countries are those whose land lay inside the empire's own
// departments (not its client kingdoms).
module.exports = [
  ['first-french-empire', 'First French Empire', 'empire', 1804, 1815, 'Paris', ['France', 'Belgium', 'Netherlands', 'Luxembourg', 'Germany', 'Italy'], ['Napoleonic Empire', 'French Empire (1804–1815)'],
    [['successor-of', 'french-first-republic', 1804], ['followed-by', 'bourbon-restoration', 1814]], 'french-first-republic', 'First French Empire']
];
