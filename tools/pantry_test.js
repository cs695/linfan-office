const p = require('/workspace/linfan/node_modules/puppeteer-core');
(async () => {
  const b = await p.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1920,1080'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1920, height: 1080 });
  pg.on('pageerror', e => console.log('[pageerror]', e.message));
  await pg.goto('http://127.0.0.1:8765/index.html?pr=1&shot=1&auto=0&speed=6', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready===true', { timeout: 90000 });
  const want = [['machine', 'p_machine'], ['sip', 'p_sip']];
  let wi = 0; const t0 = Date.now();
  const cam = { pos: [2.6, 2.0, 9.4], tgt: [4.0, 1.2, 5.6] };
  await pg.evaluate(`window.__dbg.setCam(${JSON.stringify(cam)})`);
  while (wi < want.length && Date.now() - t0 < 240000) {
    const st = await pg.evaluate(`(()=>{const a=window.__dbg.agents.luke;return [a.anim.mode,a.anim.w.reach.toFixed(2),a.anim.w.drink.toFixed(2),a.anim.sipAmt.toFixed(2),a.x.toFixed(1),a.z.toFixed(1)]})()`);
    const [mode, reach, drink, sip] = st;
    if (wi === 0 && mode === 'machine' && +reach > 0.9) { await new Promise(r => setTimeout(r, 1500)); await pg.screenshot({ path: 'shots/05_pantry_coffee.png' }); console.log('shot machine', st); wi = 1; }
    else if (wi === 1 && mode === 'sip' && +drink > 0.9 && +sip > 0.8) { await pg.evaluate(`window.__dbg.setCam({pos:[3.2,2.0,8.2],tgt:[3.0,1.2,3.9]})`); await new Promise(r => setTimeout(r, 800)); await pg.screenshot({ path: 'shots/06_pantry_hea_sip.png' }); console.log('shot sip', st); wi = 2; }
    await new Promise(r => setTimeout(r, 400));
  }
  console.log('done', wi);
  await b.close();
})();
