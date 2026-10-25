// node shot.js <out.png> [query] [waitMs] [width] [height]
const p = require('/workspace/linfan/node_modules/puppeteer-core');
(async () => {
  const [out, q = '', wait = '6000', W = '1920', H = '1080'] = process.argv.slice(2);
  const b = await p.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-dev-shm-usage', `--window-size=${W},${H}`] });
  const pg = await b.newPage();
  pg.on('console', m => { const t = m.text(); if (!/GPU stall|swiftshader/i.test(t)) console.log('[console]', m.type(), t); });
  pg.on('pageerror', e => console.log('[pageerror]', e.message));
  await pg.setViewport({ width: +W, height: +H, deviceScaleFactor: 1 });
  await pg.goto('http://127.0.0.1:8765/index.html?pr=1&shot=1&' + q, { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready===true', { timeout: 60000 }).catch(e => console.log('not ready'));
  if (process.env.EVAL) await pg.evaluate(process.env.EVAL);
  await new Promise(r => setTimeout(r, +wait));
  if (process.env.DUMP) console.log(JSON.stringify(await pg.evaluate(process.env.DUMP)));
  await pg.screenshot({ path: out });
  await b.close();
})();
