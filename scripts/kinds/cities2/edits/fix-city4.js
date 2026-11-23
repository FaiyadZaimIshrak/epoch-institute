// The editor's changes after the scans of all ninety drafts: node ../battles/apply-fixes.js fix-city4.js out
module.exports = {
 'benin-city': [['No founding date is given. According to tradition', 'According to tradition']],
 'meroe': [['No founding date is given for the city. King Aspelta', 'King Aspelta']],
 'mumbai': [
  ['No founding date is given. People lived', 'People lived'],
  ['more than 160 people died and 308 were injured', '164 people died and 308 were injured'],
 ],
 'shanghai': [['No founding date is given. The earliest', 'The earliest']],
 'copan': [['By AD 800 the Sepulturas', 'By 800 CE the Sepulturas']],
 'anuradhapura': [['is described as the oldest still-living', 'is held to be the oldest still-living']],
 'chan-chan': [['and is described as the largest adobe city', 'and has been called the largest adobe city']],
 'havana': [['Contemporary Havana is described as three cities in one', 'Contemporary Havana is three cities in one']],
 'hong-kong': [["the territory's culture is described as a hybrid", "the territory's culture is a hybrid"]],
 // Shanghai as a town begins with the market town of 1074; the Neolithic settlements stay in the text
 _set: { 'shanghai': { start: 1074, circa: false } },
};
