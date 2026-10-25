// node tools/headshots.js  -> assets/portraits/<id>.jpg (256x341) rendered from the 3D cartoon heads
const p = require('/workspace/linfan/node_modules/puppeteer-core');
(async () => {
  const b = await p.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=512,682'] });
  for (const id of ['scarlett', 'tatum', 'luke', 'jaylen', 'jennifer']) {
    const pg = await b.newPage(); await pg.setViewport({ width: 512, height: 682, deviceScaleFactor: 1 });
    pg.on('pageerror', e => console.log('[pageerror]', e.message));
    await pg.goto(`http://127.0.0.1:8765/index.html?pr=1&shot=1&fx=low&auto=0&headshot=${id}`, { waitUntil: 'load' });
    await pg.waitForFunction('window.__ready===true', { timeout: 90000 });
    await new Promise(r => setTimeout(r, 2500));
    await pg.screenshot({ path: `/workspace/linfan/office3d/assets/portraits/${id}_big.png` }); await pg.close(); console.log(id);
  }
  await b.close();
})();
