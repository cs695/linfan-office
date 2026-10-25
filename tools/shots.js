// node shots.js "query" name1:"js to eval" name2:"..."  -> shots/<name>.png (single browser session)
const p = require('/workspace/linfan/node_modules/puppeteer-core');
(async () => {
  const q = process.argv[2] || '';
  const jobs = process.argv.slice(3).map(a => { const i = a.indexOf(':'); return [a.slice(0, i), a.slice(i + 1)]; });
  const W = +(process.env.W || 1920), H = +(process.env.H || 1080);
  const b = await p.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-dev-shm-usage', `--window-size=${W},${H}`] });
  const pg = await b.newPage();
  pg.on('console', m => { const t = m.text(); if (!/GPU stall|swiftshader|404/i.test(t)) console.log('[console]', m.type(), t); });
  pg.on('pageerror', e => console.log('[pageerror]', e.message));
  await pg.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await pg.goto('http://127.0.0.1:8765/index.html?pr=1&shot=1&' + q, { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready===true', { timeout: 90000 }).catch(e => console.log('not ready'));
  for (const [name, js] of jobs) {
    const wait = +(process.env.WAIT || 3000);
    let out = null;
    if (js) out = await pg.evaluate(js);
    await new Promise(r => setTimeout(r, wait));
    await pg.screenshot({ path: `shots/${name}.png` });
    console.log(name, out === null || out === undefined ? '' : JSON.stringify(out));
  }
  await b.close();
})();
