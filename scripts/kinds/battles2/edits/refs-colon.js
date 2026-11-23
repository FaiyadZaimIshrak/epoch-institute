// A title's colon is followed by a space: "The Ardennes:Battle of the Bulge" as the article's template had it.
const fs = require('fs'); for (const d of ['battles2', 'battles3', 'battles4']) { const f = d + '/refs.js'; let t = fs.readFileSync(f, 'utf8'); const a = ".replace(/ : /g, ': ')";
  if (t.includes(".replace(/:(?=[A-Z])/g, ': ')")) continue; if (t.split(a).length !== 2) throw new Error(f); fs.writeFileSync(f, t.replace(a, () => a + ".replace(/:(?=[A-Z])/g, ': ')")); }
console.log('ok');
