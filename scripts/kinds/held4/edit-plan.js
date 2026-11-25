// The editor's changes to the Kalka plan (25 Nov 2026): Lutsk and Kursk stand in the centre beside the Volhynians, where
// the account puts their princes, not on the flanks; the Russian forms of the names for the checker.
const fs = require('fs'); const [src, dst] = process.argv.slice(2); let t = fs.readFileSync(src, 'utf8');
const R = [
  ['"luts": [58, 46, 90],', '"luts": [56, 37, 90],'],
  ['"kur": [58, 12, 90]', '"kur": [56, 31, 90]'],
  ['"quote": "Помочь им попытались сначала Мстислав Луцкий, а потом и Олег Курский"},\n  {"id": "kur"', '"quote": "событиях в центре сражения, где действовал Даниил, его двоюродный дядя, князь луцкий Мстислав Ярославич Немой, и Олег Курский"},\n  {"id": "kur"'],
  ['The Smolensk host and the flight to the Dnieper are left off.', 'The Lutsk and Kursk hosts are drawn in the centre, where the account puts their princes. The Smolensk host and the flight to the Dnieper are left off.'],
  ['"field": {"north": null},', '"field": {"north": null},\n "alias": {"Volhynians": "волынской дружиной", "Volhynian": "волынский отряд", "Galicians": "галичан", "Chernigovians": "черниговцы", "Lutsk": "Луцкий", "Oleg": "Олег Курский", "Tsugir": "Тсугира", "Teshi": "Теши"},'],
];
for (const [a, b] of R) { if (t.split(a).length !== 2) throw new Error(a.slice(0, 60)); t = t.replace(a, () => b); }
JSON.parse(t); fs.writeFileSync(dst, t); console.log('ok');
