// The editor's changes to the writers' revised plans (24 Nov 2026).   node edit-more.js   (in the work folder)
const fs = require('fs'); const rep = (s, a, b) => { const f = 'out/' + s + '.json'; let t = fs.readFileSync(f, 'utf8'); if (t.split(a).length !== 2) throw new Error(s + ': ' + a.slice(0, 50)); t = t.replace(a, () => b); JSON.parse(t); fs.writeFileSync(f, t); };
rep('battle-of-gettysburg', "Ewell's attacks on Culp's Hill and East Cemetery Hill on 2 July, Hood's fight at Little Round Top and the cavalry action southwest of town are left out.", "Ewell's attacks on Culp's Hill and East Cemetery Hill on 2 July and the cavalry action southwest of town are left out.");
rep('battle-of-okinawa', ', to the southeast of Itoman, where the Marines of the 1st Division pressed them.', ', to the southeast of Itoman.');
console.log('ok');
