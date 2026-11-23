// The editor's changes after reading every draft's facts, takeaways, events and summary against its article:
//   node ../battles/apply-fixes.js fix-life1.js out      (run in the lives4 folder)
module.exports = {
 'augustine-of-hippo': [['the Confessions, the first Western autobiography;', 'the Confessions, often called the first Western autobiography;'], ['heavily Romanized and speaking only Latin', 'heavily Romanised and speaking only Latin']],
 'benito-juarez': [['for one term;Minister of Justice', 'for one term; Minister of Justice']],
 // the birth year is disputed, as the facts say
 'jose-de-san-martin': [['an Argentine general born in 1778 in Yapeyú,', 'an Argentine general born in Yapeyú in 1777 or 1778,']],
 'juana-ines-de-la-cruz': [['she was reprimanded, and she died of plague in 1695.', 'she was reprimanded, and she died in 1695 after nursing nuns stricken in a plague.']],
 // the article's own unattributed praise
 'kangxi-emperor': [['<p>Kangxi is considered one of China\'s greatest emperors. He completed the conquest,', '<p>Kangxi completed the conquest,']],
 'menelik-ii': [['19 August 1844 in Ankober, Shewa (the opening of the source gives 17 August), as Sahle Maryam', '19 August 1844 (or 17 August) in Ankober, Shewa, as Sahle Maryam'],
  ['Menelik dies after years of paralysis and the question of the succession', 'Menelik dies after years of paralysis'],
  ['Menelik and his wife Taytu Betul personally owned 70,000 slaves.', 'Menelik and his wife Taytu Betul are reported to have owned 70,000 slaves.']],
 // the article's lead says "in any category"; its own body names Theodore Roosevelt as the first non-European laureate
 'rabindranath-tagore': [['the first Indian and first non-European to win a Nobel Prize, who wrote', 'the first Indian, and the first non-European, to win the Nobel Prize in Literature, who wrote']],
 'rani-of-jhansi': [['(born Manikarnika Tambe, 1827 to 1830 or 1835 to 1858)', '(born Manikarnika Tambe between 1827 and 1835, died 1858)']],
 'sitting-bull': [['Sitting Bull (c. 1831-37 to 1890)', 'Sitting Bull (born between 1831 and 1837, died 1890)'], ['c. 1831-37', 'c. 1831'], ['exile in Canada (1877-1881)', 'exile in Canada (1877–1881)'], ['had been baptized into the Catholic Church', 'had been baptised into the Catholic Church']],
 _set: {
  // the earliest year of the range the article gives, as the encyclopedia's entry has it ("c. 1831")
  'sitting-bull': { start: 1831, circa: true },
 },
 _ev: {
  // regnal years become years BCE, counted from the accession the article gives first (c. 1353 BCE); the text says which regnal year
  'akhenaten': [
   ['c. 1363 BCE', 'Amenhotep IV is born, according to Donald Redford\'s dating, a younger son of Amenhotep III and Tiye'],
   ['c. 1353 BCE', 'He takes the throne as Amenhotep IV, in 1353 or 1351 BCE, most likely crowned at Thebes, and begins temples to the Aten at Karnak and elsewhere'],
   ['c. 1352 BCE', 'In his second regnal year he gives a speech, preserved on a pylon at Karnak, saying that the gods had ceased their appearances except the god who gave birth to himself'],
   ['c. 1349 BCE', 'In his fifth regnal year he changes his name to Akhenaten and decrees a new capital, Akhetaten, now called Amarna'],
   ['c. 1345 BCE', 'In about his ninth regnal year he declares the Aten the only worshipable god and orders the defacing of Amun\'s temples throughout Egypt'],
   ['c. 1342 BCE', 'In his twelfth regnal year the royal family receives tribute from Nubia, Punt, Syria, the Mediterranean islands and Libya at Akhetaten'],
   ['c. 1335 BCE', 'Akhenaten dies and is buried in a tomb in the Royal Wadi east of Akhetaten'],
   ['c. 1332 BCE', 'Tutankhaten changes his name to Tutankhamun and abandons Akhetaten, and Egypt returns gradually to its traditional religion'],
  ],
  // a label is one year; the ranges are told in the text
  'chandragupta-maurya': [
   ['c. 326 BCE', 'Alexander the Great ends his Indian campaign in 326 to 325 BCE; Plutarch later claims that Chandragupta, as a young man, saw him'],
   ['323 BCE', 'Alexander dies in Babylon and war breaks out between his generals, leaving unrest in the Indian territories he had assigned to Greek governors'],
   ['c. 322 BCE', 'Chandragupta\'s conquest of Magadha and the defeat of the Nandas is generally dated between 322 and 319 BCE, though a later chronology places it c. 311–305 BCE'],
   ['c. 317 BCE', 'Jansari dates Chandragupta\'s arrival in the Punjab here, in line with the chronology of Greek history'],
   ['c. 305 BCE', 'Chandragupta and Seleucus I Nicator confront each other and then, by about 303 BCE, form a dynastic marriage alliance'],
   ['c. 298 BCE', 'According to Roy, Chandragupta\'s abdication may be dated here'],
   ['c. 297 BCE', 'According to Roy, Chandragupta dies at some point between 297 and 293 BCE'],
  ],
  // the trial and the death were two events with one label
  'socrates': [
   ['c. 470 BCE', 'Born in the Athenian deme of Alopece to Sophroniscus and Phaenarete, in 470 or 469 BCE'],
   ['404 BCE', 'The Thirty Tyrants begin to rule Athens; under them Socrates and four others are told to arrest Leon the Salaminian, and Socrates alone refuses, according to Plato\'s Apology'],
   ['403 BCE', 'An amnesty is granted to Athenian citizens to prevent civil war after the fall of the Thirty'],
   ['399 BCE', 'Accused by Meletus, Anytus and Lycon of impiety and corrupting the youth, he is tried before a jury of hundreds of citizens, sentenced to death, and drinks hemlock after refusing an escape offered by his friends'],
   ['1818', 'Friedrich Schleiermacher\'s essay on the worth of Socrates as a philosopher attacks Xenophon\'s accounts, and the attack is widely accepted'],
   ['1872', 'Nietzsche\'s The Birth of Tragedy holds Socrates responsible for the deterioration of ancient Greek civilisation'],
  ],
 },
};
