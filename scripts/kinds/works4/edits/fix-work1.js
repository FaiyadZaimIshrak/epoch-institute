// The editor's changes after reading every draft's facts, takeaways, events and summary against its article:
//   node ../battles/apply-fixes.js fix-work1.js out      (run in the works4 folder)
module.exports = {
 // the year of the first lift is not in the article beside the day
 'abu-simbel': [
  ['to Egyptianize them.', 'to Egyptianise them.'], ['to Egyptianize the people of Nubia.', 'to Egyptianise the people of Nubia.'],
  ['was lifted by crane on 16 October 1965.', 'was lifted by crane.'],
 ],
 // "according to Spink and others" is the article's attribution for the harm done by varnish and cleaning
 'ajanta-caves': [['Griffiths\'s cheap varnish and recent cleaning by the Archaeological Survey of India also harmed the murals.', 'according to Spink and others, Griffiths\'s cheap varnish and recent cleaning by the Archaeological Survey of India also harmed the murals.']],
 'behistun-inscription': [[' Kosmin put forward the hypothesis in 2018 that it served as an imperial calendar, and Rüdiger Schmitt published an edition of the Old Persian inscriptions of the Achaemenids in 2023.', '']],
 'benin-bronzes': [['1735–1750', 'c. 1735'], ['The second golden age is believed to have come in the reign of Oba Eresoyen', 'The second golden age is believed to have come in the reign of Oba Eresoyen, from 1735 to 1750'],
  ['Edo artists began to produce the sculptures, some of the most dramatic of which date to this century', 'Edo artists began to produce the sculptures, some of which date to this century']],
 'book-of-kells': [['with ten full-page miniatures and ornament of unmatched elaboration.', 'with ten full-page miniatures and ornament more lavish than in any other surviving Insular Gospel book.']],
 'dream-of-the-red-chamber': [['A 2014 stylistic study concluded that two different authors wrote', 'A 2014 stylistic study argued that two different authors wrote']],
 'dresden-codex': [['and, according to the Ruggles and Thompson views above, copies an earlier text.', 'and is thought to copy an earlier text.']],
 'grand-canal-of-china': [['By the year 735 about 149,685,400 kilograms of grain were recorded', 'By the year 735 about 150 million kilograms of grain were recorded'], ['using 165,000 laborers in Shandong', 'using 165,000 labourers in Shandong']],
 'himeji-castle': [['<p>The castle has appeared in Japanese and foreign films, including Akira Kurosawa\'s Kagemusha and Ran, and in the television miniseries Shōgun it stood in for Osaka Castle of the feudal era. ', '<p>'], ['built a three-story keep', 'built a three-storey keep']],
 'karnak': [['Hatshepsut had twin obelisks, then the tallest in the world, erected at the entrance to the temple; one still stands as the second-tallest ancient obelisk still standing on Earth, and the other has toppled and is broken.', 'Hatshepsut had twin obelisks erected at the entrance to the temple; one still stands, and the other has toppled and is broken.']],
 'kebra-nagast': [[' Another reading holds that the Ag\'azyan period likely describes the arrival of the Ethio-Semites in the Horn of Africa and the origin of Dʿmt.', '']],
 'moai': [[' The Unicode moai emoji of 2010 in fact depicts the moyai statue near Shibuya Station in Tokyo, a gift from the people of Nii-jima inspired by the Easter Island moai.', '']],
 'mogao-caves': [['removed manuscripts and paintings in 1907-1914,', 'removed manuscripts and paintings from 1907 to 1914,']],
 'muqaddimah': [['the figures reported by historians would be found to amount to a tenth of what those people were said to have.', 'the true figures would be found to amount to a tenth of what those people had said.']],
 'on-the-origin-of-species': [[' In a survey by academic booksellers, publishers and librarians in advance of Academic Book Week in the United Kingdom, it was voted the most influential academic book ever written.', ''],
  ['Read in printed editions and translations, with the first and sixth editions on Wikisource and all six British editions at The Complete Works of Charles Darwin Online', 'Read in printed editions and translations; all six British editions are available at The Complete Works of Charles Darwin Online']],
 'panchatantra': [['and has been translated more than almost any Indian work.', 'and has been called the most frequently translated literary product of India.']],
 'principia': [['He wrote in the tradition of Copernicus', 'The work followed Copernicus']],
 'romance-of-the-three-kingdoms': [[' Yi Mun-yol\'s Korean version of 1988 has sold over 20 million copies.', '']],
 'sistine-chapel-ceiling': [['Michelangelo is considered the greatest master of cangiante, the use', 'Michelangelo is considered a master of cangiante, the use']],
 // the article's "Kai Wen" for the first commentator matches no commentator known under that name: the name is left out
 'the-art-of-war': [['written by the warlord Kai Wen in the early 3rd century, comes with a preface admitting that he edited the book', 'written by a strategist and warlord in the early 3rd century, comes with a preface admitting that he edited the book'],
  ['Kai Wen writes the earliest known commentary and edits the text', 'A strategist and warlord writes the earliest known commentary and edits the text'],
  ['The strategist and warlord Kai Wen wrote the earliest known commentary in the early 3rd century.', 'A strategist and warlord wrote the earliest known commentary in the early 3rd century.'],
  ['500–430 BCE', '5th century BCE'], ['The earlier text of The Art of War is now generally accepted as completed in this span', 'The earlier text of The Art of War is now generally accepted as completed between 500 and 430 BCE'],
  ['134–118 BCE', '2nd century BCE'], ['Two Han tombs near Linyi in Shandong are sealed with bamboo slips', 'Two Han tombs near Linyi in Shandong are sealed between 134 and 118 BCE with bamboo slips']],
 'the-canon-of-medicine': [['The last of fourteen further Latin editions of the 16th century is published', 'Latin editions, fourteen of them in the 16th century, continue until this year']],
 'the-prince': [[' Digital editions are available from Standard Ebooks and Project Gutenberg, and a public domain audiobook from LibriVox.', '']],
 'the-republic': [['Benjamin Jowett publishes his translation, later an e-text at Project Gutenberg', 'Benjamin Jowett publishes his translation']],
 'todai-ji': [['<p>The Great Buddha Hall houses the world\'s largest bronze statue of the Buddha Vairocana, and until 1998 the Great Buddha Hall was the world\'s largest wooden building.', '<p>The Great Buddha Hall houses a bronze statue of the Buddha Vairocana that is counted the largest in the world, and until 1998 the hall was counted the world\'s largest wooden building.']],
 'united-states-declaration-of-independence': [['Most delegates sign the engrossed copy on 2 August, and John Dunlap\'s broadsides are read in public on 8 July in Philadelphia, Trenton and Easton', 'John Dunlap\'s broadsides are read in public on 8 July in Philadelphia, Trenton and Easton, and most delegates sign the engrossed copy on 2 August']],
 'st-peters-basilica': [['319–333', '4th century'], ['The emperor Constantine the Great began the old basilica over the shrine', 'Between 319 and 333 the emperor Constantine the Great began the old basilica over the shrine']],
 'records-of-the-grand-historian': [['960–1279', '10th century'], ['The earliest surviving woodblock printed editions are produced in the Song dynasty', 'The earliest surviving woodblock printed editions are produced in the Song dynasty (960–1279)']],
 'journey-to-the-west': [['1127–1279', '12th century'], ['During the Southern Song dynasty, embellished stories', 'During the Southern Song dynasty (1127–1279), embellished stories'],
  ['1977–1983', '1977'], ['Anthony C. Yu publishes the first complete English translation to render the poems and songs', 'Anthony C. Yu begins publishing the first complete English translation to render the poems and songs, finished in 1983']],
 _set: {
  // nothing in the Histories can be dated later than 430 BCE (the author's own article, added as a second source)
  'histories-of-herodotus': { start: -430, circa: true },
  // the tomb was used at the king's death, the end of the reign the article's lead gives (c. 1332–1323 BCE)
  'tomb-of-tutankhamun': { start: -1323, circa: true },
 },
 _ev: {
  'histories-of-herodotus': [
   ['c. 430 BCE', 'Nothing in the Histories can be dated with certainty later than this year, and Herodotus is generally assumed to have died not long afterwards'],
   ['425 BCE', 'Aristophanes\' comedy The Acharnians blames the Peloponnesian War on the abduction of some prostitutes, a mocking reference to the opening of the Histories'],
   ['Early 2nd century', 'Papyrus Oxyrhynchus 2099 preserves a fragment of Book VIII'],
   ['9th century', 'The oldest extant manuscripts of the Histories, including the Codex Laurentianus A, date from the 9th and 10th centuries, in the Byzantine period'],
   ['1975', 'Gelonus, the Scythian city Herodotus described, is rediscovered'],
  ],
  // an event of the work, not of Columba's life
  'book-of-kells': [
   ['c. 800', 'The Book of Kells was created in a Columban monastery in Ireland or Scotland'],
   ['814', 'The church of the Abbey of Kells was consecrated after building had begun in 807'],
   ['1007', 'The great Gospel of Columba was stolen from the western sacristy at Kells and later recovered under a sod, without its golden cover'],
   ['1654', 'The governor of Kells sent the book to Dublin for safekeeping when Cromwell\'s cavalry was quartered in the church'],
   ['1661', 'Henry Jones presented the manuscript to Trinity College Dublin'],
   ['1953', 'Roger Powell rebound the manuscript in four volumes'],
   ['2011', 'UNESCO added the book to its Memory of the World International Register'],
  ],
  // events of the text; Solomon's century and the dynasty's founding are told in the sections
  'kebra-nagast': [
   ['1225', 'The Arabic translation named in the colophon is dated to this year'],
   ['1314', 'The start of the period 1314 to 1321–1322 that Conti Rossini, Littmann and Cerulli marked off for the composition of the book'],
   ['1620s', 'Pedro Páez completes his História da Ethiópia, with a detailed translation of the Kebra Nagast through Menelek\'s return to Aksum'],
   ['1813', 'The third edition of James Bruce\'s Travels describes the contents of the manuscript he brought from Gondar'],
   ['1905', 'Carl Bezold publishes the entire text with commentary'],
   ['1922', 'E. A. Wallis Budge\'s English translation appears, in the first of two editions'],
  ],
  // a label needs a year or a century: the dynasties are told in the first two events' text
  'karnak': [
   ['20th century BCE', 'Construction at the complex began during the reign of Senusret I (1971–1926 BCE) in the Middle Kingdom; Thebes later became the capital of the unified country, and almost every pharaoh of the Eighteenth Dynasty added something to the site'],
   ['356', 'Constantius II ordered the closing of pagan temples throughout the Roman Empire, and Karnak, by then mostly abandoned, received Christian churches among its ruins'],
   ['1589', 'An unknown Venetian wrote the first European description of the temple complex, without giving it a name'],
   ['1668', 'Two Capuchin missionary brothers travelled through the area, and the name Karnak is first attested as a village name and the name of the complex'],
   ['1704', 'Paul Lucas published the first drawing of Karnak, which is rather inaccurate'],
   ['1979', 'Karnak was added to the UNESCO World Heritage List along with the rest of the city of Thebes'],
  ],
 },
};
