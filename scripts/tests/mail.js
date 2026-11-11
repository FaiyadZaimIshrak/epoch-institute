// send.php after S2: the limits count only messages that pass, CF-Connecting-IP is not believed from a direct peer, csv cells
const { spawn, execFileSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const R = process.argv[2], PHP = process.argv[3], port = +process.argv[4] || 8931;
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); if (!c) fails++; };
(async () => {
  // ip_in on its own: the function's text, run by PHP
  const src = fs.readFileSync(path.join(R, 'send.php'), 'utf8'), fn = src.slice(src.indexOf('function ip_in('), src.indexOf('function client_ip('));
  const t = path.join(os.tmpdir(), 'ipin-' + port + '.php');
  fs.writeFileSync(t, '<?php ' + fn + ' echo json_encode([ip_in("104.16.0.1","104.16.0.0/13"), ip_in("104.23.255.255","104.16.0.0/13"), ip_in("104.24.0.0","104.16.0.0/13"), ip_in("127.0.0.1","104.16.0.0/13"), ip_in("2606:4700::1","2606:4700::/32"), ip_in("2606:4701::1","2606:4700::/32"), ip_in("2a06:98c7::1","2a06:98c0::/29"), ip_in("2a06:98c8::1","2a06:98c0::/29"), ip_in("::1","104.16.0.0/13"), ip_in("junk","104.16.0.0/13")]);');
  const r = execFileSync(PHP, [t]).toString(); ok('ip_in', r === '[true,true,false,false,true,false,true,false,false,false]', r);
  for (const round of ['a', 'b', 'c']) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mail-s2-'));
    const srv = spawn(PHP, ['-S', 'localhost:' + port, '-t', R], { env: Object.assign({}, process.env, { EPOCH_MAIL_TEST: dir }), stdio: 'ignore' });
    await new Promise(r => setTimeout(r, 1200));
    const post = (o, h) => fetch('http://localhost:' + port + '/send.php', { method: 'POST', headers: Object.assign({ Origin: 'http://localhost:' + port, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, h || {}), body: new URLSearchParams(o).toString() }).then(r => r.status);
    const good = i => ({ kind: 'contact', topic: 'other', name: 'Test Reader', email: 'reader' + i + '@example.org', message: 'A message of the test, number ' + i + '.' });
    try {
      if (round === 'a') {
        const bad = []; for (let i = 0; i < 8; i++) bad.push(await post({ kind: 'contact', topic: 'other', name: 'Test', email: 'not-an-address', message: '' }));
        const then = await post(good(0)); ok('eight refused forms use up no limit', bad.every(s => s === 400) && then === 200, [bad, then]);
        const more = []; for (let i = 1; i <= 5; i++) more.push(await post(good(i))); ok('the sixth message in ten minutes is refused', more.join() === '200,200,200,200,429', more);
      } else if (round === 'b') {
        const st = []; for (let i = 0; i < 6; i++) st.push(await post(good(i), { 'CF-Connecting-IP': '203.0.113.' + (i + 1) })); ok('a made-up CF-Connecting-IP from a direct peer does not escape the limit', st.join() === '200,200,200,200,200,429', st);
      } else {
        const s1 = await post({ kind: 'newsletter', email: '=cmd@example.org', source: '=HYPERLINK("http://x")' }), s2 = await post({ kind: 'newsletter', email: '=cmd@example.org', source: 'again' }), s3 = await post({ kind: 'newsletter', email: 'plain@example.org', source: 'home' });
        const csv = fs.readFileSync(path.join(dir, 'private', 'subscribers.csv'), 'utf8').trim().split(/\r?\n/);
        ok('newsletter cells never start a formula, and no address twice', s1 === 200 && s2 === 200 && s3 === 200 && csv.length === 3 && /,'=cmd@example\.org,"'=HYPERLINK/.test(csv[1]) && /,plain@example\.org,home$/.test(csv[2]), csv);
      }
    } finally { srv.kill(); await new Promise(r => setTimeout(r, 400)); }
  }
  console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
