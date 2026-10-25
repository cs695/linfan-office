import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { PEOPLE, ORDER, BRAND } from './people.js';
import { buildEnvironment, buildRoom, buildDesks, buildPantry, buildLounge, buildHologram, buildDust, DESKS } from './world.js';
import { buildAvatar, Animator } from './avatar.js';
import { Agent, buildGraph } from './brain.js';
import { UI, normActivity } from './ui.js';

const qs = new URLSearchParams(location.search);
const OPTS = { fx: qs.get('fx') || 'high', cam: qs.get('cam') || 'overview', auto: qs.get('auto') !== '0', ui: qs.get('ui') !== '0', status: qs.get('status') || 'status.json' };
const POLL_MS = 60000, STALE_MS = 3 * 3600 * 1000;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!qs.get('shot') });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, qs.get('pr') ? +qs.get('pr') : 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
if (!OPTS.ui) document.body.classList.add('noui');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.1, 900);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.06; controls.minDistance = 3; controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI * 0.49; controls.minPolarAngle = 0.25;
controls.minAzimuthAngle = -1.5; controls.maxAzimuthAngle = 1.5;
controls.autoRotate = OPTS.auto; controls.autoRotateSpeed = 0.7;
controls.zoomSpeed = 0.7; controls.panSpeed = 0.6; controls.screenSpacePanning = true;

const PRESET = {
  overview: { pos: [0, 5.4, 11.4], tgt: [0, 1.1, -1.3] },
  pantry: { pos: [1.5, 3.2, 10.8], tgt: [5.0, 1.1, 5.0] },
  lounge: { pos: [-2.5, 3.2, 11.2], tgt: [-6.2, 0.9, 4.8] },
};
function setCam(p) { camera.position.set(...p.pos); controls.target.set(...p.tgt); controls.update(); }
let tween = null;
function flyTo(p, dur = 1.6) {
  tween = { t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...p.pos), t1: new THREE.Vector3(...p.tgt) };
}

function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }

const upd = [];
const ctx = { activity: {}, machineBusy: 0 };
let composer = null, bloom = null;
const agents = {};
let ui = null; let HS = null;

async function init() {
  const faces = {}, ports = {};
  await Promise.all(ORDER.map(async id => { ports[id] = await loadImg(`assets/portraits/${id}.jpg`); }));
  const skin = await fetch('assets/skin.json').then(r => r.json()).catch(() => ({}));

  buildEnvironment(scene, renderer, OPTS);
  scene.add(new THREE.HemisphereLight(0x8fb9a6, 0x070b09, 0.55));
  const key = new THREE.DirectionalLight(0xffe6b8, 1.5); key.position.set(5, 14, 9); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 11; sc.bottom = -11; sc.near = 2; sc.far = 40; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 3;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6fe0b8, 0.35); fill.position.set(-8, 6, -6); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd7a0, 0.4); rim.position.set(0, 4, 14); scene.add(rim);

  buildRoom(scene, renderer, OPTS, upd);
  buildDesks(scene, ports, upd);
  buildPantry(scene, upd); buildLounge(scene, upd); buildHologram(scene, upd); buildDust(scene, upd);
  buildGraph();

  ORDER.forEach((id, i) => {
    const cfg = Object.assign({}, PEOPLE[id]); if (skin[id]) cfg.skin = skin[id];
    const av = buildAvatar(cfg);
    av.root.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    scene.add(av.root);
    const an = new Animator(av, id);
    agents[id] = new Agent(id, i, av, an, ctx);
  });

  ui = new UI();
  if (qs.get('headshot')) {   // asset generator: renders one cartoon head+shoulders portrait (used for roster / name plates)
    const id = qs.get('headshot'); const cfg = Object.assign({}, PEOPLE[id]); if (skin[id]) cfg.skin = skin[id];
    const sc = new THREE.Scene(); sc.background = new THREE.Color('#1b3328');
    sc.add(new THREE.HemisphereLight(0xdfeee5, 0x2a3a30, 1.4)); const dl = new THREE.DirectionalLight(0xfff0d8, 2.2); dl.position.set(2, 3, 4); sc.add(dl);
    const av = buildAvatar(cfg); sc.add(av.root); av.root.updateMatrixWorld(true);
    const hp = av.J.head.getWorldPosition(new THREE.Vector3());
    const cam = new THREE.PerspectiveCamera(26, 3 / 4, 0.1, 20); const yaw = 0.28;
    cam.position.set(hp.x + Math.sin(yaw) * 1.45, hp.y + 0.03, hp.z + Math.cos(yaw) * 1.45); cam.lookAt(hp.x, hp.y - 0.1, hp.z);
    document.body.classList.add('noui'); HS = { sc, cam };
  }
  if (OPTS.cam.startsWith('desk-')) { /* handled below */ }

  // composer
  const size = new THREE.Vector2(); renderer.getSize(size);
  if (OPTS.fx !== 'low') {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.45, 0.6, 1.0);
    composer.addPass(bloom); composer.addPass(new OutputPass());
  }
  resize();
  const c = OPTS.cam;
  if (c.startsWith('desk-')) { const id = c.slice(5); focusDesk(id, true); }
  else setCam(PRESET[c] || PRESET.overview);
  window.__ready = true; window.__dbg = { focus: (id) => focusDesk(id, true), renderer, scene, agents, camera, controls, ctx, flyTo, setCam, PRESET };
  startStatus();
  requestAnimationFrame(loop);
}

function focusDesk(id, instant) {
  const d = DESKS[id]; if (!d) return;
  const p = d.pose; const f = { x: -Math.sin(p.th), z: Math.cos(p.th) }; const p1 = { pos: [p.x + f.x * 4.4, 2.2, p.z + f.z * 4.4], tgt: [p.x + f.x * 0.4, 1.2, p.z + f.z * 0.4] };
  instant ? setCam(p1) : flyTo(p1); controls.autoRotate = false;
}
window.addEventListener('keydown', (e) => {
  const k = e.key;
  if (k >= '1' && k <= '5') focusDesk(ORDER[+k - 1]);
  else if (k === '6') { flyTo(PRESET.pantry); controls.autoRotate = false; }
  else if (k === '7') { flyTo(PRESET.lounge); controls.autoRotate = false; }
  else if (k === '0') { flyTo(PRESET.overview); controls.autoRotate = true; }
  else if (k === ' ') { controls.autoRotate = !controls.autoRotate; e.preventDefault(); }
  else if (k === 'f' || k === 'F') { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); }
  else if (k === 'h' || k === 'H') document.body.classList.toggle('noui');
});
let resumeT = null;
controls.addEventListener('start', () => { controls.autoRotate = false; tween = null; clearTimeout(resumeT); });
controls.addEventListener('end', () => { clearTimeout(resumeT); if (OPTS.auto) resumeT = setTimeout(() => { controls.autoRotate = true; }, 30000); });
canvas.addEventListener('dblclick', () => { flyTo(PRESET.overview); controls.autoRotate = OPTS.auto; });

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  // keep the whole office in frame on narrow windows
  camera.fov = w / h < 1.6 ? 44 + (1.78 - w / h) * 22 : 44; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
}
window.addEventListener('resize', resize);

/* ------------------------------------------------ status feed */
let lastGood = null, lastGoodAt = 0, lastFetchOk = true, lastJson = '';
const clockEl = document.getElementById('clock'), clockMain = document.getElementById('clock-main'), clockSub = document.getElementById('clock-sub');
const FALLBACK = { updated: '', agents: ORDER.map(id => ({ id, name: PEOPLE[id].name, role: PEOPLE[id].role, activity: 'idle', status: '正在連線，等待最新狀態…', alert: '' })) };

function applyStatus(data, instant = false) {
  const map = {}; (data.agents || []).forEach(a => { map[String(a.id || a.name || '').toLowerCase()] = a; });
  ORDER.forEach(id => {
    const a = map[id]; if (!a) return; // keep previous for missing agents
    const act = normActivity(a.activity);
    const rec = { activity: act, status: String(a.status || ''), alert: String(a.alert || '') };
    ctx.activity[id] = act;
    ui.apply(id, rec);
    agents[id].setActivity(act, instant);
  });
}
async function fetchStatus(initial = false) {
  try {
    const url = `${OPTS.status}${OPTS.status.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const txt = await r.text(); const data = JSON.parse(txt);
    if (!data || !Array.isArray(data.agents)) throw new Error('bad format');
    lastFetchOk = true;
    if (txt !== lastJson) { lastJson = txt; lastGood = data; applyStatus(data, initial); try { localStorage.setItem('linfan-status', txt); } catch (e) { } }
    lastGood = data; lastGoodAt = Date.now();
  } catch (e) {
    lastFetchOk = false; console.warn('status fetch failed, keeping last content:', e.message);
  }
  renderClock();
}
async function startStatus() {
  let cached = null; try { cached = JSON.parse(localStorage.getItem('linfan-status') || 'null'); } catch (e) { }
  lastGood = cached && cached.agents ? cached : FALLBACK;
  await fetchStatus(true);                       // first real read decides the starting poses (no walking-in on load)
  if (!lastJson) { applyStatus(lastGood, true); renderClock(); }   // fetch failed: use cache / fallback
  setInterval(fetchStatus, POLL_MS); setInterval(renderClock, 15000);
}
const pad = (n) => String(n).padStart(2, '0');
function fmtHKT(d) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).reduce((o, x) => (o[x.type] = x.value, o), {});
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}
function dur(ms) { const m = Math.floor(ms / 60000); if (m < 60) return `${m} 分鐘`; const h = Math.floor(m / 60); if (h < 48) return `${h} 小時 ${m % 60} 分鐘`; return `${Math.floor(h / 24)} 日`; }
function ago(ms) { const m = Math.floor(ms / 60000); if (m < 1) return '剛剛'; if (m < 60) return `${m} 分鐘前`; const h = Math.floor(m / 60); if (h < 48) return `${h} 小時 ${m % 60} 分鐘前`; return `${Math.floor(h / 24)} 日前`; }
function renderClock() {
  const upd = lastGood && lastGood.updated ? new Date(lastGood.updated) : null;
  const valid = upd && !isNaN(upd);
  let cls = 'ok';
  if (!valid) { clockMain.textContent = '最後更新：未知'; clockSub.textContent = '未有更新時間'; cls = 'stale'; }
  else {
    const age = Date.now() - upd.getTime();
    clockMain.textContent = `最後更新 ${fmtHKT(upd)} HKT`;
    clockSub.textContent = age > STALE_MS ? `⚠ 已 ${dur(age)}冇更新，資料可能過舊` : `${ago(Math.max(0, age))}・每 60 秒自動刷新`;
    cls = age > 24 * 3600e3 ? 'dead' : age > STALE_MS ? 'stale' : 'ok';
  }
  if (!lastFetchOk) { clockSub.textContent += '・連線失敗，顯示上次資料'; if (cls === 'ok') cls = 'warn'; }
  clockEl.className = cls;
}

/* ------------------------------------------------ loop */
let last = performance.now(); let time = 0;
const v = new THREE.Vector3();
let dir = 1;
function loop() {
  requestAnimationFrame(loop);
  const nowT = performance.now(); const dt = Math.min(0.05, (nowT - last) / 1000); last = nowT; time += dt; ctx.camY = camera.position.y;
  const sp = qs.get('speed') ? +qs.get('speed') : 1;
  if (HS) { renderer.render(HS.sc, HS.cam); return; }
  for (const id of ORDER) agents[id].update(dt * sp);
  for (const f of upd) f(time, ctx, dt);
  // camera tween / ping-pong auto orbit
  if (tween) {
    tween.t += dt; const k = Math.min(1, tween.t / tween.dur), e = k * k * (3 - 2 * k);
    camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e); if (k >= 1) tween = null;
  }
  if (controls.autoRotate) {
    const az = controls.getAzimuthalAngle();
    if (az > 0.62) dir = -1; else if (az < -0.62) dir = 1;
    controls.autoRotateSpeed = 0.7 * dir * Math.min(1, 0.25 + (0.62 - Math.abs(az)) * 6);
  }
  controls.update();
  if (composer) composer.render(); else renderer.render(scene, camera);
  // bubbles
  const W = window.innerWidth, H = window.innerHeight; const pts = {};
  const camDist = camera.position.distanceTo(controls.target);
  for (const id of ORDER) {
    const ag = agents[id]; ag.av.J.head.getWorldPosition(v); v.y += 0.34;
    const p = v.clone().project(camera);
    const sc = Math.max(0.78, Math.min(1.12, Math.pow(19 / camDist, 0.35)));
    pts[id] = { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H, vis: p.z < 1 && p.z > -1, scale: sc };
  }
  ui.layout(pts, W, H);
}

init().catch(e => { console.error(e); document.body.classList.add('err'); });
