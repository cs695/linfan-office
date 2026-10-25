const p = require('/workspace/linfan/node_modules/puppeteer-core');
const fs = require('fs'); const { execSync } = require('child_process');
const D = '/workspace/linfan/office3d'; const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.copyFileSync(D + '/status.json', '/tmp/status.orig.json');
  const b = await p.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1920,1080'] });
  try {
    const pg = await b.newPage(); await pg.setViewport({ width: 1920, height: 1080 });
    const t0 = Date.now(); const reqs = [];
    pg.on('request', r => { if (r.url().includes('status.json')) reqs.push(((Date.now() - t0) / 1000).toFixed(1) + 's ' + r.url().replace('http://127.0.0.1:8765/', '')); });
    pg.on('pageerror', e => console.log('[pageerror]', e.message));
    await pg.goto('http://127.0.0.1:8765/index.html?pr=1&shot=1&auto=0&speed=14', { waitUntil: 'load' });
    await pg.waitForFunction('window.__ready===true', { timeout: 90000 });
    await sleep(3000);
    await pg.screenshot({ path: D + '/shots/s_A_before.png' }); console.log('A shot');
    // change: Scarlett -> pantry, Tatum -> typing + alert, Luke -> idle
    execSync(`cd ${D} && python3 update_status.py scarlett --activity pantry --status "休息一陣，飲杯嘢" && python3 update_status.py tatum --activity typing --status "整理推廣內容" --alert "等 Lobaton 決定" && python3 update_status.py luke --activity typing --status "做緊 Threads 草稿相"`);
    console.log('modified status.json at', ((Date.now() - t0) / 1000).toFixed(1) + 's');
    await sleep(Math.max(1000, 66000 - (Date.now() - t0)));
    console.log('requests so far', reqs);
    await sleep(45000);
    await pg.screenshot({ path: D + '/shots/s_B_after_change.png' }); console.log('B shot', await pg.evaluate(`Object.fromEntries(Object.entries(window.__dbg.agents).map(([k,a])=>[k,[a.activity,a.anim.mode,+a.x.toFixed(1),+a.z.toFixed(1)]]))`));
    // stale: updated 5h ago
    const j = JSON.parse(fs.readFileSync(D + '/status.json', 'utf8')); j.updated = new Date(Date.now() - 5 * 3600e3).toISOString().replace('Z', '+00:00'); fs.writeFileSync(D + '/status.json', JSON.stringify(j, null, 2));
    await sleep(62000);
    await pg.screenshot({ path: D + '/shots/s_C_stale.png' }); console.log('C shot');
    // fetch failure
    fs.renameSync(D + '/status.json', D + '/status.json.away');
    await sleep(62000);
    await pg.screenshot({ path: D + '/shots/s_D_fetchfail.png' }); console.log('D shot'); console.log('requests', reqs);
  } finally {
    if (fs.existsSync(D + '/status.json.away')) fs.renameSync(D + '/status.json.away', D + '/status.json');
    fs.copyFileSync('/tmp/status.orig.json', D + '/status.json');
    await b.close();
  }
})();
