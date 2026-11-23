// The editor's changes after reading every draft's facts, takeaways and events: node ../battles/apply-fixes.js fix-city7.js out
module.exports = {
 'manila': [
  ['existed on the site by 1258, according to genealogical research cited in the articles; the Spanish', 'existed on the site by 1258, according to genealogical research; the Spanish'],
  ['The articles give earlier overlords: Majapahit texts list', 'Earlier overlords are recorded: Majapahit texts list'],
  ['and the articles describe the city, with Mexico City and Madrid, as part of the world’s original set of global cities.', 'and the city, with Mexico City and Madrid, has been counted among the world’s original set of global cities.'],
 ],
 'madurai': [['No founding is recorded. The city', 'The city']],
 'medina': [['approximately the 9th century BCE; no founder is named.', 'approximately the 9th century BCE.']],
 'moscow': [['Sviatoslav Olgovich; the chronicles give no founding. Its first prince', 'Sviatoslav Olgovich. Its first prince']],
 // "the second largest city in the world, after London" cannot be right for 1600 (Beijing, Constantinople, Paris)
 'potosi': [['grew to a population that eventually exceeded 200,000, so that around 1600 it was the second largest city in the world, after London.', 'grew to a population that eventually exceeded 200,000.']],
 'milan': [['A Celtic settlement named Medhelanon, taken by the Romans in 222 BCE, Mediolanum became an imperial seat under Maximian, and the Edict of Milan was issued from it in 313.', 'The Celtic settlement of Medhelanon was taken by the Romans in 222 BCE; as Mediolanum it became an imperial seat under Maximian, and the Edict of Milan was issued from it in 313.']],
 _set: { 'pataliputra': { end: 637, endCirca: true }, 'palmyra': { end: 1932 } },
 _ev: {
  'moscow': [["1147", "Moscow is first mentioned in the chronicles, as a meeting place of two princes"], ["1238", "The Mongols burn the city during their invasion of Rus"], ["1326", "The foundation of the Dormition Cathedral, the first stone church of Moscow, is laid"], ["1380", "Dmitry Donskoy leads a united Russian army to victory over the Mongols at Kulikovo"], ["1571", "The Crimean Tatars burn Moscow"], ["1613", "The Zemsky Sobor elects Michael Romanov as tsar"], ["1812", "Napoleon's army occupies Moscow, and a fire ruins much of the city"], ["1918", "Lenin moves the capital back to Moscow on 12 March"]],
  'persepolis': [["c. 519 BCE", "Construction of the broad stairway of the terrace begins"], ["515 BCE", "Date of the earliest remains and of the coin hoard laid under the foundation boxes of the Apadana"], ["486 BCE", "Darius I dies, and Xerxes I completes the Tachara palace"], ["330 BCE", "Alexander the Great takes Persepolis, and a fire destroys its palaces"], ["316 BCE", "Persepolis is still the capital of Persia as a province of the Macedonian Empire"], ["311 CE", "The Sasanian prince Shapur Sakanshah leaves an inscription naming the site Sad-stun"], ["1618", "García de Silva Figueroa links Chehel Minar with the Persepolis of the classical authors"], ["1930", "Ernst Herzfeld and Erich Schmidt begin the first scientific excavations"]],
 },
};
