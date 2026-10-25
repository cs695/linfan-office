import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { BRAND, PEOPLE, ORDER } from './people.js';

const GOLD = new THREE.Color(BRAND.gold), GOLDL = new THREE.Color(BRAND.goldLight);
export const ROOM = { w: 19, d: 17, wallH: 7.2 };

export function glow(color, k = 2.2) {
  const c = new THREE.Color(color).multiplyScalar(k);
  return new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.2 }, o));
function box(w, h, d, m, x = 0, y = 0, z = 0, parent) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true; if (parent) parent.add(mesh); return mesh;
}
function rbox(w, h, d, r, m, x = 0, y = 0, z = 0, parent) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m); mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true; if (parent) parent.add(mesh); return mesh;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.canvas = c; return t;
}
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

const UI_FONT = '"Noto Sans HK","Noto Sans CJK HK","PingFang HK","Microsoft JhengHei","Noto Sans TC","Noto Sans CJK TC",sans-serif';

/* ---------------------------------------------------------------- environment */
export function buildEnvironment(scene, renderer, opts) {
  // PMREM env from a tiny emissive scene (gold / jade strips) so glass, metal and floor catch warm reflections
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x03060a);
  const strip = (x, y, z, sx, sy, sz, c, k) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), glow(c, k)); m.position.set(x, y, z); envScene.add(m); };
  for (let i = -3; i <= 3; i++) strip(i * 3.2, 6, 0, 0.25, 0.1, 14, '#ffe6b0', 5);
  strip(-9, 3, 0, 0.2, 5, 12, '#d6c18e', 3); strip(9, 3, 0, 0.2, 5, 12, '#52e3a4', 2.2);
  strip(0, 3, -9, 18, 0.4, 0.2, '#d6c18e', 3); strip(0, 0.2, 9, 18, 0.1, 0.2, '#ffffff', 3);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(envScene, 0.03).texture;
  scene.environment = env; scene.environmentIntensity = 0.55;
  pm.dispose();

  // sky dome
  const skyTex = canvasTex(8, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#02050a'); gr.addColorStop(0.45, '#05100d'); gr.addColorStop(0.62, '#12221a'); gr.addColorStop(0.68, '#3a3425'); gr.addColorStop(0.72, '#13211a'); gr.addColorStop(1, '#030706');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 24), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, toneMapped: false }));
  scene.add(sky);
  const starGeo = new THREE.BufferGeometry(); const sp = []; const r = rnd(7);
  for (let i = 0; i < 500; i++) { const a = r() * Math.PI * 2, e = 0.12 + r() * 1.2, R = 380; sp.push(Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R * 0.9 + 10, Math.sin(a) * Math.cos(e) * R); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfd8c8, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.6 })));
  scene.fog = new THREE.FogExp2(0x07150f, 0.0085);

  buildCity(scene);
}

function windowTex(seed, cols, rows) {
  const r = rnd(seed);
  const t = canvasTex(cols * 16, rows * 16, (g, w, h) => {
    g.fillStyle = '#04070a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const v = r();
      if (v < 0.58) continue;
      const k = r();
      const col = k < 0.62 ? `hsl(${40 + r() * 10},${50 + r() * 30}%,${55 + r() * 25}%)` : k < 0.82 ? `hsl(${170 + r() * 20},60%,${55 + r() * 20}%)` : `hsl(${200},30%,${70}%)`;
      g.fillStyle = col; g.fillRect(x * 16 + 3, y * 16 + 4, 10, 8);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}

function buildCity(scene) {
  const r = rnd(42);
  const dims = [[16, 32], [12, 32], [20, 32], [10, 32]];
  const texs = [windowTex(11, 16, 32), windowTex(23, 12, 32), windowTex(37, 20, 32), windowTex(51, 10, 32)];
  const mats = texs.map(t => new THREE.MeshStandardMaterial({ color: 0x0b1310, roughness: 0.5, metalness: 0.3, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.8 }));
  const grp = new THREE.Group(); scene.add(grp);
  const neon = [0xd6c18e, 0x52e3a4, 0xf0a060, 0x8fd3ff];
  for (let i = 0; i < 260; i++) {
    const ang = r() * Math.PI * 2;
    const R = 34 + Math.pow(r(), 0.8) * 150;
    const x = Math.sin(ang) * R, z = -Math.cos(ang) * R;
    const w = 6 + r() * 12, d = 6 + r() * 12, top = -34 + r() * (24 + R * 0.18) - (R < 50 ? 12 : 0);
    const base = -140; const h = top - base;
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv; const [cc, rw] = dims[i % 4];
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w / (1.7 * cc), uv.getY(k) * h / (2.4 * rw));
    const m = new THREE.Mesh(geo, mats[i % 4]); m.position.set(x, base + h / 2, z); m.rotation.y = r() * 0.6;
    grp.add(m);
    if (r() < 0.12 && R > 40) { // neon crown / sign
      const c = neon[Math.floor(r() * neon.length)];
      const s = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.5 + r(), 0.5), glow(c, 2.0)); s.position.set(x, top + 0.5, z); s.rotation.y = m.rotation.y; grp.add(s);
    }
  }
  // distant haze strip
}

/* ---------------------------------------------------------------- room shell + floor */
export function buildRoom(scene, renderer, opts, upd) {
  const root = new THREE.Group(); scene.add(root);
  const W = ROOM.w, D = ROOM.d;
  // slab
  const slab = box(W + 1, 0.5, D + 1, std('#0a0f0d', { roughness: 0.4, metalness: 0.6 }), 0, -0.26, 0, root);
  box(W + 1.1, 0.04, 0.06, glow(BRAND.goldLight, 2.2), 0, 0.0, D / 2 + 0.52, root);
  box(W + 1.1, 0.04, 0.06, glow(BRAND.goldLight, 2.0), 0, -0.5, D / 2 + 0.52, root);
  // mirror floor
  const rs = Math.min(1024, Math.round(renderer.domElement.width * 0.6));
  let refl = null;
  if (opts.fx !== 'low') {
    refl = new Reflector(new THREE.PlaneGeometry(W, D), { textureWidth: rs, textureHeight: rs, color: 0x6a6f68, clipBias: 0.003 });
    refl.rotation.x = -Math.PI / 2; refl.position.y = 0.0; root.add(refl);
  }
  const gridTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(214,193,142,0.55)'; g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
    g.strokeStyle = 'rgba(214,193,142,0.12)'; g.lineWidth = 1;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
  });
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping; gridTex.repeat.set(W / 2, D / 2);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x050c09, roughness: 0.55, metalness: 0.3, transparent: true, opacity: refl ? 0.86 : 1, envMapIntensity: 0.8 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.004; floor.receiveShadow = true; root.add(floor);
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: gridTex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  grid.rotation.x = -Math.PI / 2; grid.position.y = 0.007; root.add(grid);

  // glass walls (back, left, right) with gold mullions
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x9fc4b4, transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0.0, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
  const frameM = std('#0c1210', { metalness: 0.8, roughness: 0.35 });
  const wallH = ROOM.wallH;
  const mk = (len, vertical) => {
    const g = new THREE.Group();
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(len, wallH), glassM); gl.position.y = wallH / 2; g.add(gl);
    const n = Math.round(len / 3.2);
    for (let i = 0; i <= n; i++) {
      const x = -len / 2 + i * len / n;
      box(0.1, wallH, 0.12, frameM, x, wallH / 2, 0, g);
      box(0.02, wallH, 0.02, glow(BRAND.goldLight, 1.4), x, wallH / 2, 0.07, g);
    }
    box(len, 0.14, 0.14, frameM, 0, wallH, 0, g); box(len, 0.14, 0.14, frameM, 0, 0.07, 0, g);
    box(len, 0.04, 0.04, glow(BRAND.goldLight, 2.0), 0, wallH - 0.1, 0.06, g);
    return g;
  };
  const back = mk(W, false); back.position.set(0, 0, -D / 2); root.add(back);
  const left = mk(D, true); left.rotation.y = Math.PI / 2; left.position.set(-W / 2, 0, 0); root.add(left);
  const right = mk(D, true); right.rotation.y = -Math.PI / 2; right.position.set(W / 2, 0, 0); root.add(right);

  // ceiling light bars + trusses
  const ceil = new THREE.Group(); ceil.name = 'ceiling'; root.add(ceil);
  for (let i = -4; i <= 4; i++) {
    const x = i * 2.4;
    box(0.14, 0.08, D - 2, glow('#fff0cf', 3.2), x, wallH - 0.5, 0, ceil);
    box(0.4, 0.05, D - 1.6, std('#0b100e', { metalness: 0.8 }), x, wallH - 0.42, 0, ceil);
  }
  for (const z of [-7.5, 0, 7.5]) box(W, 0.1, 0.1, std('#0b100e', { metalness: 0.8 }), 0, wallH - 0.35, z, ceil);
  ceil.visible = false; // open-top cutaway: no ceiling bars (they smeared into the mirror floor)

  // ambient audio-visualizer strip along the back wall
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 1, 0.1), glow(BRAND.goldLight, 0.8), 96);
  const dummy = new THREE.Object3D(); const barScale = [];
  for (let i = 0; i < 96; i++) { dummy.position.set(-W / 2 + 0.6 + i * (W - 1.2) / 95, 0.02, -D / 2 + 0.3); dummy.scale.set(1, 0.05, 1); dummy.updateMatrix(); bars.setMatrixAt(i, dummy.matrix); barScale.push(0.05); }
  root.add(bars);
  upd.push((t) => {
    for (let i = 0; i < 96; i++) {
      const v = 0.1 + 0.32 * Math.abs(Math.sin(t * 1.3 + i * 0.35) * Math.sin(t * 0.7 + i * 0.12)) + 0.06 * Math.sin(t * 3 + i);
      dummy.position.set(-W / 2 + 0.6 + i * (W - 1.2) / 95, v / 2, -D / 2 + 0.3); dummy.scale.set(1, v, 1); dummy.updateMatrix(); bars.setMatrixAt(i, dummy.matrix);
    }
    bars.instanceMatrix.needsUpdate = true;
  });

  // back-wall neon sign (hanging inside glass)
  const sign = canvasTex(2048, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = BRAND.gold; g.shadowBlur = 40;
    g.fillStyle = BRAND.goldLight; g.font = `800 150px ${UI_FONT}`; g.fillText('林凡娛樂', w / 2, h * 0.36);
    g.shadowBlur = 24; g.font = `600 86px "Space Grotesk","Helvetica Neue",Arial,sans-serif`;
    g.fillStyle = '#f2efe6'; g.fillText('L I N F A N   E N T E R T A I N M E N T', w / 2, h * 0.72);
    g.shadowBlur = 0; g.strokeStyle = BRAND.gold; g.lineWidth = 4; g.beginPath(); g.moveTo(240, h * 0.54); g.lineTo(w - 240, h * 0.54); g.stroke();
  });
  const signM = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 2.6), new THREE.MeshBasicMaterial({ map: sign, transparent: true, toneMapped: false, depthWrite: false, color: new THREE.Color(1.5, 1.5, 1.5) }));
  signM.position.set(0, 5.1, -D / 2 + 0.25); root.add(signM);

  buildZones(root, upd);
  return { root, refl };
}

function buildZones(root, upd) {
  // lane lights along the walkway
  for (const [r0, r1, c, a0, a1] of [[ARC.R - 3.2, ARC.R - 3.14, BRAND.goldLight, -1.25, 1.25], [ARC.R + 2.2, ARC.R + 2.26, BRAND.gold, -1.0, 1.0], [ARC.R - 4.2, ARC.R - 4.17, '#52e3a4', -0.95, 0.95]]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 120, 1, Math.PI / 2 - a1, a1 - a0), glow(c, 1.7));
    ring.rotation.x = -Math.PI / 2; ring.rotation.z = 0; ring.position.set(ARC.cx, 0.013, ARC.cz);
    // RingGeometry lies in XY: after rotating -90deg about X, local +Y becomes -Z (back). thetaStart is measured from +X.
    root.add(ring);
  }
  // rug under lounge & pantry floor plates
  const plate = (x, z, w, d, c) => {
    rbox(w, 0.03, d, 0.01, std('#0a1411', { roughness: 0.7, metalness: 0.2 }), x, 0.018, z, root);
    const e = glow(c, 1.8);
    box(w, 0.012, 0.04, e, x, 0.036, z - d / 2, root); box(w, 0.012, 0.04, e, x, 0.036, z + d / 2, root);
    box(0.04, 0.012, d, e, x - w / 2, 0.036, z, root); box(0.04, 0.012, d, e, x + w / 2, 0.036, z, root);
  };
  plate(5.6, 5.0, 6.4, 3.9, '#d6c18e');
  plate(-6.4, 5.4, 5.4, 3.6, '#52e3a4');
}

/* ---------------------------------------------------------------- desks */
export const DESKS = {};
export const ARC = { cx: 0, cz: 2.2, R: 8.4, ang: [-44, -22, 0, 22, 44].map(d => d * Math.PI / 180) };
export const arcPos = (th, r) => ({ x: ARC.cx + r * Math.sin(th), z: ARC.cz - r * Math.cos(th) });
export function deskPose(i) { const th = ARC.ang[i]; const p = arcPos(th, ARC.R); return { x: p.x, z: p.z, yaw: -th, th }; }

function screenTex(kind, accent) {
  const t = canvasTex(256, 144, () => {});
  t.userData.kind = kind; t.userData.accent = accent; return t;
}
function drawScreen(tex, time, activity, seed) {
  const c = tex.userData.canvas, g = c.getContext('2d'), w = c.width, h = c.height, acc = tex.userData.accent;
  g.fillStyle = '#06100c'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(214,193,142,0.14)'; g.fillRect(0, 0, w, 14);
  g.fillStyle = BRAND.goldLight; for (let i = 0; i < 3; i++) g.fillRect(6 + i * 9, 5, 5, 5);
  const busy = activity === 'typing' ? 1 : activity === 'thinking' ? 0.4 : 0.15;
  const k = tex.userData.kind;
  if (k === 'chat') {
    const off = (time * 22 * busy) % 36;
    for (let i = -1; i < 5; i++) {
      const y = 22 + i * 36 - off; const me = (i + seed) % 3 === 0; const bw = 70 + ((i * 37 + seed * 11) % 90);
      g.fillStyle = me ? acc : 'rgba(242,239,230,0.75)'; g.globalAlpha = me ? 0.85 : 0.5;
      g.fillRect(me ? w - bw - 10 : 10, y, bw, 22); g.globalAlpha = 1;
      g.fillStyle = '#06100c'; g.fillRect((me ? w - bw - 4 : 16), y + 6, bw - 14, 3); g.fillRect((me ? w - bw - 4 : 16), y + 13, (bw - 14) * 0.6, 3);
    }
  } else if (k === 'wave') {
    g.strokeStyle = acc; g.lineWidth = 2; g.beginPath();
    for (let x = 0; x < w; x += 2) { const a = (0.3 + 0.7 * busy) * (Math.sin(x * 0.07 + time * 3) * Math.sin(x * 0.013 + time * 0.7) * 38 + Math.sin(x * 0.4 + time * 9) * 6 * busy); g.lineTo(x, 84 + a); }
    g.stroke();
    g.fillStyle = 'rgba(242,239,230,0.35)'; for (let i = 0; i < 6; i++) g.fillRect(8 + i * 40, 128, 30, 4);
  } else if (k === 'bars') {
    for (let i = 0; i < 14; i++) { const v = 0.25 + 0.6 * Math.abs(Math.sin(time * (0.6 + busy) + i * 0.7 + seed)); g.fillStyle = i % 3 === 0 ? acc : BRAND.goldLight; g.globalAlpha = 0.85; g.fillRect(10 + i * 17, 130 - v * 100, 11, v * 100); }
    g.globalAlpha = 1;
  } else if (k === 'grid') {
    for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) { const hh = (x * 31 + y * 17 + seed * 7) % 360; g.fillStyle = `hsl(${40 + (hh % 40)},35%,${22 + ((x + y + Math.floor(time * busy * 2)) % 3) * 12}%)`; g.fillRect(10 + x * 61, 24 + y * 38, 55, 33); }
  } else { // code/list
    const off = (time * 16 * busy) % 14;
    for (let i = -1; i < 10; i++) { const y = 20 + i * 14 - off; const ln = 40 + ((i * 53 + seed * 29) % 150); g.fillStyle = i % 4 === 0 ? acc : 'rgba(242,239,230,0.6)'; g.globalAlpha = 0.7; g.fillRect(10 + (i % 3) * 10, y, ln, 5); g.globalAlpha = 1; }
  }
  tex.needsUpdate = true;
}

const KINDS = { scarlett: ['chat', 'wave'], tatum: ['bars', 'chat'], luke: ['grid', 'code'], jaylen: ['wave', 'bars'], jennifer: ['code', 'chat'] };

export function buildDesks(scene, portraitImgs, upd) {
  ORDER.forEach((id, i) => {
    const cfg = PEOPLE[id]; const P = deskPose(i);
    const g = new THREE.Group(); g.position.set(P.x, 0, P.z); g.rotation.y = P.yaw; scene.add(g);
    const accent = cfg.accent;
    const topM = std('#0e1713', { roughness: 0.35, metalness: 0.5 });
    const edgeM = glow(accent, 2.2);
    // desk surfaces (U shape)
    rbox(1.3, 0.05, 0.85, 0.02, topM, 0, 0.74, 0.62, g);
    for (const s of [-1, 1]) {
      rbox(0.7, 0.05, 1.55, 0.02, topM, s * 0.92, 0.74, 0.3, g);
      box(0.68, 0.5, 0.04, std('#0b100e'), s * 0.92, 0.5, -0.43, g);
      box(0.04, 0.72, 1.4, std('#0b100e'), s * 1.25, 0.36, 0.3, g);
      box(0.012, 0.012, 1.5, edgeM, s * 1.275, 0.745, 0.3, g);
    }
    box(1.3, 0.012, 0.012, edgeM, 0, 0.746, 1.05, g);
    box(0.04, 0.5, 0.04, std('#0b100e'), 0, 0.5, 1.0, g);
    // front modesty panel with name plate
    box(1.3, 0.4, 0.03, std('#08100c'), 0, 0.52, 1.03, g);
    const plate = canvasTex(1024, 220, (gg, w, h) => {
      gg.fillStyle = '#07150f'; gg.fillRect(0, 0, w, h);
      gg.strokeStyle = accent; gg.lineWidth = 6; gg.strokeRect(5, 5, w - 10, h - 10);
      const im = portraitImgs[id]; if (im) { gg.save(); gg.beginPath(); gg.arc(110, h / 2, 82, 0, Math.PI * 2); gg.clip(); gg.drawImage(im, 0, im.height * 0.06, im.width, im.width, 28, h / 2 - 82, 164, 164); gg.restore(); gg.strokeStyle = accent; gg.lineWidth = 5; gg.beginPath(); gg.arc(110, h / 2, 84, 0, Math.PI * 2); gg.stroke(); }
      gg.fillStyle = '#f2efe6'; gg.textBaseline = 'middle'; gg.font = `800 92px "Space Grotesk","Helvetica Neue",Arial,sans-serif`; gg.fillText(cfg.name.toUpperCase(), 230, h * 0.38);
      gg.fillStyle = accent; gg.font = `600 54px "Space Grotesk","Helvetica Neue",Arial,sans-serif`; gg.fillText(cfg.role.toUpperCase(), 232, h * 0.76);
    });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.258), new THREE.MeshBasicMaterial({ map: plate, toneMapped: false, color: new THREE.Color(1.15, 1.15, 1.15) }));
    pl.position.set(0, 0.55, 1.05); g.add(pl);
    box(1.3, 0.012, 0.03, edgeM, 0, 0.34, 1.045, g);
    box(1.3, 0.012, 0.03, edgeM, 0, 0.72, 1.045, g);

    // keyboard + mouse + mug
    rbox(0.42, 0.018, 0.14, 0.008, std('#15191a', { metalness: 0.6 }), 0, 0.775, 0.48, g);
    const keys = box(0.4, 0.004, 0.115, glow(accent, 0.6), 0, 0.787, 0.48, g); keys.userData.base = new THREE.Color(accent);
    rbox(0.06, 0.02, 0.1, 0.01, std('#15191a'), 0.34, 0.775, 0.5, g);
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.09, 14), std('#e8e4d8', { roughness: 0.4 })); mug.position.set(-0.55, 0.815, 0.62); g.add(mug);
    const lamp = new THREE.Group(); lamp.position.set(0.7, 0.77, 0.75); g.add(lamp);
    box(0.1, 0.02, 0.1, std('#0b100e'), 0, 0, 0, lamp); box(0.012, 0.28, 0.012, std('#0b100e'), 0, 0.14, 0, lamp);
    const lh = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.07, 14, 1, true), glow(accent, 2.0)); lh.position.set(0, 0.3, 0.05); lh.rotation.x = 0.3; lamp.add(lh);

    // monitors on wings, angled toward the sitter
    const screens = [];
    const kinds = KINDS[id];
    [-1, 1].forEach((s, k) => {
      const mg = new THREE.Group(); mg.position.set(s * 0.92, 0.765, -0.28);
      mg.rotation.y = Math.atan2(-s * 0.92, 1.1); g.add(mg);
      box(0.2, 0.02, 0.14, std('#0b100e', { metalness: 0.8 }), 0, 0.01, 0, mg);
      box(0.04, 0.3, 0.03, std('#0b100e', { metalness: 0.8 }), 0, 0.15, -0.02, mg);
      rbox(0.82, 0.5, 0.04, 0.015, std('#0b100e', { metalness: 0.7, roughness: 0.3 }), 0, 0.5, 0, mg);
      const tex = screenTex(kinds[k], accent);
      const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.77, 0.44), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) }));
      sm.position.set(0, 0.5, 0.022); mg.add(sm);
      box(0.82, 0.01, 0.01, edgeM, 0, 0.245, 0.02, mg);
      screens.push(tex);
    });

    // chair
    const chair = new THREE.Group(); g.add(chair);
    const cm = std('#0c1210', { roughness: 0.8, metalness: 0.2 }), cf = std('#1b2b24', { roughness: 0.9 });
    rbox(0.52, 0.09, 0.5, 0.04, cf, 0, 0.395, -0.03, chair);
    const back = rbox(0.5, 0.62, 0.08, 0.035, cf, 0, 0.78, -0.3, chair); back.rotation.x = -0.1;
    box(0.04, 0.45, 0.02, glow(accent, 1.6), 0, 0.8, -0.35, chair);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 10), cm); pole.position.set(0, 0.2, -0.03); chair.add(pole);
    for (let a = 0; a < 5; a++) { const leg = box(0.34, 0.03, 0.045, cm, 0, 0.04, 0, chair); const pv = new THREE.Group(); pv.position.set(0, 0.03, -0.03); pv.rotation.y = a * Math.PI * 2 / 5; leg.position.set(0.17, 0, 0); pv.add(leg); chair.add(pv); }
    for (const s of [-1, 1]) box(0.05, 0.03, 0.34, cm, s * 0.29, 0.58, -0.05, chair);

    // under-glow & spot cone
    const spot = new THREE.SpotLight(0xffe2ae, 6, 9, 0.7, 0.9, 1.5); spot.position.set(P.x, 5.2, P.z + 0.5); spot.target.position.set(P.x, 0.5, P.z + 0.3); scene.add(spot, spot.target);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 5.2, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe2ae, transparent: true, opacity: 0.011, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
    cone.position.set(P.x, 2.6, P.z + 0.3); scene.add(cone);

    DESKS[id] = { group: g, pose: P, chair, screens, keys };
  });

  upd.push((t, ctx) => {
    ORDER.forEach((id, i) => {
      const d = DESKS[id]; const act = ctx.activity[id] || 'idle';
      if (Math.floor(t * 8) !== d._last) { d._last = Math.floor(t * 8); d.screens.forEach((tx, k) => drawScreen(tx, t + k * 3, act, i * 3 + k)); }
      d.keys.material.color.copy(d.keys.userData.base).multiplyScalar(0.6 + (act === 'typing' ? 0.7 * Math.abs(Math.sin(t * 17)) : 0));
    });
  });
}

/* ---------------------------------------------------------------- pantry + lounge + props */
export const PANTRY = {
  machine: new THREE.Vector3(4.5, 0.95, 5.9),
  button: new THREE.Vector3(4.27, 1.27, 5.78),
  tray: new THREE.Vector3(4.35, 1.04, 5.81),
  table: new THREE.Vector3(3.0, 0, 4.4),
};

export function buildPantry(scene, upd) {
  const g = new THREE.Group(); scene.add(g);
  const steel = std('#1a211e', { metalness: 0.85, roughness: 0.3 });
  const dark = std('#0b110e', { metalness: 0.6, roughness: 0.5 });
  const warm = glow('#ffc27a', 2.0), gold = glow(BRAND.goldLight, 2.2);
  const CZ = 5.9; // counter centre z
  // island counter (long axis = x)
  rbox(4.4, 0.9, 0.8, 0.03, dark, 6.1, 0.45, CZ, g);
  rbox(4.5, 0.05, 0.9, 0.02, std('#d8d2c2', { roughness: 0.25, metalness: 0.1 }), 6.1, 0.925, CZ, g);
  box(4.4, 0.02, 0.02, gold, 6.1, 0.89, CZ - 0.41, g);
  box(4.4, 0.04, 0.02, warm, 6.1, 0.04, CZ - 0.41, g);
  // cups + mugs on the counter
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.08, 10), std(i % 2 ? '#e8e4d8' : '#b9a372')); c.position.set(6.7 + i * 0.1, 0.99, CZ + 0.22); g.add(c); }
  // coffee machine (front faces -z towards the person standing behind the counter)
  const m = new THREE.Group(); m.position.set(4.5, 0.95, CZ); m.rotation.y = -0.5; g.add(m);
  rbox(0.5, 0.5, 0.78, 0.04, std('#3b4742', { metalness: 0.85, roughness: 0.3 }), 0, 0.25, 0, m);
  box(0.52, 0.02, 0.8, gold, 0, 0.5, 0, m);
  rbox(0.46, 0.08, 0.74, 0.03, dark, 0, 0.54, 0, m);
  box(0.02, 0.12, 0.3, glow(BRAND.goldLight, 2.4), -0.26, 0.34, 0.0, m);
  for (const z of [-0.2, 0.2]) { const grp = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 10), dark); grp.rotation.z = Math.PI / 2; grp.position.set(-0.28, 0.2, z); m.add(grp); }
  box(0.28, 0.025, 0.4, dark, -0.18, 0.04, 0, m);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), glow('#52e3a4', 3)); led.position.set(-0.26, 0.42, 0.2); m.add(led);
  // kettle, sink, fruit
  rbox(0.3, 0.3, 0.3, 0.04, steel, 6.3, 1.1, CZ - 0.1, g);
  const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.22, 14), std('#c9c2ae', { metalness: 0.9, roughness: 0.25 })); kettle.position.set(6.9, 1.06, CZ); g.add(kettle);
  box(0.6, 0.04, 0.5, std('#2a322e', { metalness: 0.9 }), 7.5, 0.945, CZ, g);
  const tap = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 14, Math.PI), steel); tap.position.set(7.5, 1.12, CZ + 0.2); g.add(tap);
  // fridge at the end of the island
  rbox(0.9, 2.0, 0.85, 0.04, steel, 8.65, 1.0, CZ, g);
  box(0.7, 1.8, 0.02, glow('#bfe9ff', 0.8), 8.65, 1.0, CZ - 0.44, g);
  box(0.03, 0.8, 0.03, gold, 8.3, 1.1, CZ - 0.45, g);
  // bar table + stools
  const bt = new THREE.Group(); bt.position.copy(PANTRY.table); g.add(bt);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 32), std('#e0d9c8', { roughness: 0.2, metalness: 0.2 })); top.position.y = 1.05; top.castShadow = true; bt.add(top);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.012, 8, 40), gold); ring.rotation.x = Math.PI / 2; ring.position.y = 1.03; bt.add(ring);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 12), steel); pole.position.y = 0.52; bt.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.04, 24), steel); base.position.y = 0.02; bt.add(base);
  for (const [sx, sz] of [[-0.95, 0.5], [0.1, 0.98]]) {
    const st = new THREE.Group(); st.position.set(sx, 0, sz); bt.add(st);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 20), std('#1b2b24')); seat.position.y = 0.72; st.add(seat);
    for (let a = 0; a < 4; a++) box(0.025, 0.7, 0.025, steel, Math.cos(a * Math.PI / 2 + 0.78) * 0.14, 0.36, Math.sin(a * Math.PI / 2 + 0.78) * 0.14, st);
  }
  const mug1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.033, 0.09, 12), std('#e8e4d8')); mug1.position.set(0.25, 1.125, 0.12); bt.add(mug1);
  // pendant lamps over the bar & counter
  for (const [px, pz] of [[2.75, 4.4], [3.25, 4.4], [4.5, 5.9], [6.4, 5.9]]) {
    box(0.008, 1.6, 0.008, dark, px, 6.0, pz, g);
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.22, 20, 1, true), std('#15201b', { side: THREE.DoubleSide, metalness: 0.6 })); sh.position.set(px, 4.95, pz); g.add(sh);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), glow('#ffd49a', 3.0)); bulb.position.set(px, 4.88, pz); g.add(bulb);
  }
  const pl = new THREE.PointLight(0xffc27a, 16, 9, 1.6); pl.position.set(4.6, 3.6, 5.0); g.add(pl);
  const pl2 = new THREE.PointLight(0xffd7a0, 4, 5, 1.8); pl2.position.set(5.0, 1.9, 4.8); g.add(pl2);
  const sign = canvasTex(1024, 256, (gg, w, h) => {
    gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.shadowColor = '#ffb25a'; gg.shadowBlur = 30;
    gg.fillStyle = '#ffd9a6'; gg.font = `800 150px "Space Grotesk","Helvetica Neue",Arial,sans-serif`; gg.fillText('PANTRY', w / 2, h * 0.5);
  });
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: sign, transparent: true, toneMapped: false, depthWrite: false, color: new THREE.Color(1.5, 1.5, 1.5) }));
  sg.position.set(5.6, 3.5, 6.45); g.add(sg);
  box(0.02, 3.0, 0.02, gold, 4.4, 4.9, 6.45, g); box(0.02, 3.0, 0.02, gold, 6.8, 4.9, 6.45, g);
  const steam = []; const stMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.25, depthWrite: false });
  for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), stMat.clone()); s.visible = false; scene.add(s); steam.push(s); }
  upd.push((t, ctx) => {
    const on = ctx.machineBusy;
    steam.forEach((s, i) => {
      s.visible = on > 0.1;
      if (!s.visible) return;
      const ph = (t * 0.6 + i / steam.length) % 1;
      s.position.set(PANTRY.tray.x + Math.sin(ph * 6 + i) * 0.03, PANTRY.tray.y + 0.1 + ph * 0.5, PANTRY.tray.z + Math.cos(ph * 5 + i) * 0.03);
      s.scale.setScalar(0.6 + ph * 2.2); s.material.opacity = 0.22 * (1 - ph) * Math.min(1, on);
    });
    led.material.color.setRGB(on > 0.1 ? 3 : 0.3, on > 0.1 ? 1.4 : 2.4, on > 0.1 ? 0.4 : 1.4);
  });
}

export function buildLounge(scene, upd) {
  const g = new THREE.Group(); scene.add(g);
  const fabric = std('#16231d', { roughness: 0.95, metalness: 0 });
  const dark = std('#0b110e', { metalness: 0.6, roughness: 0.5 });
  const jade = glow('#52e3a4', 1.8);
  // sofa facing the camera (+z)
  rbox(3.0, 0.45, 1.0, 0.12, fabric, -6.4, 0.3, 4.3, g);
  rbox(3.0, 0.85, 0.34, 0.12, fabric, -6.4, 0.62, 3.8, g);
  for (const s of [-1, 1]) rbox(0.3, 0.55, 0.9, 0.1, fabric, -6.4 + s * 1.55, 0.42, 4.25, g);
  box(3.0, 0.02, 0.02, jade, -6.4, 0.08, 4.82, g);
  for (const x of [-7.2, -6.4, -5.6]) { const c = rbox(0.4, 0.4, 0.14, 0.06, std(x === -6.4 ? '#b9a372' : '#243b31', { roughness: 0.9 }), x, 0.7, 4.0, g); c.rotation.x = 0.15; }
  // coffee table
  rbox(1.6, 0.05, 0.8, 0.03, std('#cfc8b6', { roughness: 0.2, metalness: 0.2 }), -6.4, 0.42, 5.7, g);
  box(0.06, 0.4, 0.06, dark, -7.0, 0.2, 5.7, g); box(0.06, 0.4, 0.06, dark, -5.8, 0.2, 5.7, g);
  box(1.6, 0.012, 0.012, jade, -6.4, 0.396, 6.1, g);
  // floor lamp
  box(0.04, 1.9, 0.04, dark, -8.6, 0.95, 4.0, g); const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.4, 16, 1, true), glow('#ffd49a', 1.2)); lamp.position.set(-8.6, 2.0, 4.0); g.add(lamp);
  const pl = new THREE.PointLight(0xffd49a, 7, 7, 1.8); pl.position.set(-7.6, 2.4, 4.6); g.add(pl);
  const pl2 = new THREE.PointLight(0x52e3a4, 3.5, 6, 1.8); pl2.position.set(-6.4, 1.0, 6.2); g.add(pl2);
  plant(g, -8.6, 6.2, 1.5); plant(g, 8.7, -6.8, 1.7); plant(g, -8.7, -6.9, 1.6); plant(g, 9.0, 7.4, 1.0); plant(g, -3.3, 7.2, 1.0);
  const sign = canvasTex(1024, 256, (gg, w, h) => {
    gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.shadowColor = '#52e3a4'; gg.shadowBlur = 30;
    gg.fillStyle = '#c8ffe8'; gg.font = `800 150px "Space Grotesk","Helvetica Neue",Arial,sans-serif`; gg.fillText('LOUNGE', w / 2, h * 0.5);
  });
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: sign, transparent: true, toneMapped: false, depthWrite: false, color: new THREE.Color(1.4, 1.4, 1.4) }));
  sg.position.set(-6.4, 3.3, 3.5); g.add(sg);
}
function plant(parent, x, z, s) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.5, 16), std('#14201a', { roughness: 0.5, metalness: 0.4 })); pot.position.y = 0.25; pot.castShadow = true; g.add(pot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.012, 6, 24), glow(BRAND.goldLight, 1.4)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.5; g.add(rim);
  const lm = std('#1d5a3c', { roughness: 0.6 }); const r = rnd(Math.floor(x * 31 + z * 17 + 100));
  for (let i = 0; i < 14; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), lm); leaf.scale.set(0.45, 1.5, 0.2);
    const a = r() * Math.PI * 2, e = 0.3 + r() * 0.7;
    leaf.position.set(Math.cos(a) * 0.14 * e, 0.8 + r() * 0.5, Math.sin(a) * 0.14 * e); leaf.rotation.set(Math.sin(a) * e * 0.9, 0, -Math.cos(a) * e * 0.9); leaf.castShadow = true; g.add(leaf);
  }
}

export function buildHologram(scene, upd) {
  const g = new THREE.Group(); g.position.set(ARC.cx, 0, ARC.cz); scene.add(g);
  const dark = std('#0b110e', { metalness: 0.8, roughness: 0.3 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.14, 40), dark); base.position.y = 0.07; g.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.02, 8, 60), glow(BRAND.goldLight, 2.6)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; g.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 1.9, 40, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.goldLight), transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  beam.position.y = 1.1; g.add(beam);
  const disc = new THREE.Group(); disc.position.y = 1.35; g.add(disc);
  const wire = new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.goldLight).multiplyScalar(2.0), wireframe: true, toneMapped: false, transparent: true, opacity: 0.85 });
  const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), wire); disc.add(globe);
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.012, 6, 70), glow('#52e3a4', 2.4)); r1.rotation.x = 1.1; disc.add(r1);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.01, 6, 70), glow(BRAND.goldLight, 2.4)); r2.rotation.x = 0.5; r2.rotation.y = 0.6; disc.add(r2);
  const eq = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 1, 0.05), glow(BRAND.goldLight, 2.2), 24); g.add(eq);
  const d = new THREE.Object3D();
  upd.push((t) => {
    globe.rotation.y = t * 0.5; r1.rotation.z = t * 0.8; r2.rotation.z = -t * 0.6; disc.position.y = 1.35 + Math.sin(t * 1.1) * 0.05;
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; const v = 0.08 + 0.18 * Math.abs(Math.sin(t * 2 + i * 0.6) * Math.sin(t * 0.9 + i)); d.position.set(Math.cos(a) * 0.55, 0.15 + v / 2, Math.sin(a) * 0.55); d.scale.set(1, v, 1); d.updateMatrix(); eq.setMatrixAt(i, d.matrix); }
    eq.instanceMatrix.needsUpdate = true;
  });
}

export function buildDust(scene, upd) {
  const n = 220; const geo = new THREE.BufferGeometry(); const p = new Float32Array(n * 3); const r = rnd(99);
  for (let i = 0; i < n; i++) { p[i * 3] = (r() - 0.5) * 18; p[i * 3 + 1] = 0.5 + r() * 5.5; p[i * 3 + 2] = (r() - 0.5) * 16; }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe9d9ab, size: 0.045, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  scene.add(pts);
  upd.push((t, ctx, dt) => { const a = geo.attributes.position; for (let i = 0; i < n; i++) { a.array[i * 3 + 1] += dt * (0.03 + (i % 5) * 0.012); a.array[i * 3] += Math.sin(t * 0.2 + i) * dt * 0.02; if (a.array[i * 3 + 1] > 6.2) a.array[i * 3 + 1] = 0.4; } a.needsUpdate = true; });
}
