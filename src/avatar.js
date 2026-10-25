import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const DOWN = V(0, -1, 0);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (cur, tgt, rate, dt) => cur + (tgt - cur) * (1 - Math.exp(-rate * dt));

const L = { thigh: 0.38, shin: 0.38, upper: 0.27, fore: 0.25, hip: 0.83 };
export const SEAT_HIP_Y = 0.5;

function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.78, metalness: 0.02 }, o));
}

const HEAD = { rx: 0.172, ry: 0.205, rz: 0.185 };

// stylised head: ellipsoid + hair geometry + simple cartoon eyes / brows / nose / smile (no photo texture)
function makeHead(cfg) {
  const g = new THREE.Group();
  const skinC = new THREE.Color(cfg.skin);
  const skinM = new THREE.MeshStandardMaterial({ color: skinC, roughness: 0.62, metalness: 0, emissive: skinC.clone().multiplyScalar(0.22) });
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 36), skinM);
  head.scale.set(HEAD.rx, HEAD.ry, HEAD.rz); head.castShadow = true; g.add(head);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), skinM); e.scale.set(0.5, 1, 0.8);
    e.position.set(s * (HEAD.rx - 0.004), -0.01, 0); g.add(e);
  }
  const male = !cfg.female, hairC = cfg.hair.color, beard = cfg.hair.type === 'beanie';
  const off = beard ? 0.016 : 0;           // features sit proud of the beard shell
  const place = (obj, x, y, o = 0) => {
    const q = 1 - (x / HEAD.rx) ** 2 - (y / HEAD.ry) ** 2; const z = HEAD.rz * Math.sqrt(Math.max(q, 0.02));
    const n = new THREE.Vector3(x / HEAD.rx ** 2, y / HEAD.ry ** 2, z / HEAD.rz ** 2).normalize();
    obj.position.set(x, y, z).addScaledVector(n, o);
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); g.add(obj); return n;
  };
  const eyeY = 0.012, eyeX = 0.064, es = cfg.eyeS || 1;
  for (const s of [-1, 1]) {
    const eg = new THREE.Group();
    const sc = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: '#fbf7f2', roughness: 0.3, emissive: '#fbf7f2', emissiveIntensity: 0.25 }));
    sc.scale.set(0.034 * es, 0.026 * es, 0.009); eg.add(sc);
    const ir = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: cfg.eye || '#2a1a12', roughness: 0.3 }));
    ir.scale.set(0.0235 * es, 0.0245 * es, 0.006); ir.position.set(0, -0.002, 0.0065); eg.add(ir);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshBasicMaterial({ color: 0x050403 }));
    pu.scale.set(0.011 * es, 0.012 * es, 0.004); pu.position.set(0, -0.002, 0.0105); eg.add(pu);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6), toneMapped: false }));
    hl.scale.set(0.006, 0.006, 0.003); hl.position.set(0.007, 0.008, 0.012); eg.add(hl);
    // upper lid line (lashes for female)
    const lid = new THREE.Mesh(new RoundedBoxGeometry(male ? 0.05 : 0.056, male ? 0.006 : 0.009, 0.006, 2, 0.003), new THREE.MeshStandardMaterial({ color: hairC, roughness: 0.6 }));
    lid.position.set(s * 0.002, 0.024 * es + 0.004, 0.007); lid.rotation.z = s * -0.12; eg.add(lid);
    place(eg, s * eyeX, eyeY, 0.003 + off);
    // eyebrows
    const bw = cfg.brow || 1;
    const br = new THREE.Mesh(new RoundedBoxGeometry(0.056, 0.011 * bw, 0.012, 2, 0.005), new THREE.MeshStandardMaterial({ color: hairC, roughness: 0.7 }));
    const n = place(br, s * 0.066, 0.064, 0.004 + off); br.rotateZ(s * (male ? -0.1 : -0.18));
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: skinC.clone().multiplyScalar(0.9), roughness: 0.7 }));
  nose.scale.set(0.017, 0.016, 0.015); place(nose, 0, -0.03, 0.008 + off);
  const arc = Math.PI * (cfg.smile || 0.75);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.0055, 8, 24, arc), new THREE.MeshStandardMaterial({ color: cfg.female ? '#c4585c' : '#a4504a', roughness: 0.5 }));
  mouth.rotation.z = -Math.PI / 2 - arc / 2; const mg = new THREE.Group(); mg.add(mouth); mouth.position.y = 0.02; place(mg, 0, -0.085, 0.003 + off);
  for (const s of [-1, 1]) {
    const bl = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), new THREE.MeshBasicMaterial({ color: '#ff8f8a', transparent: true, opacity: cfg.female ? 0.32 : 0.2, depthWrite: false }));
    bl.scale.set(1, 0.7, 1); place(bl, s * 0.1, -0.045, 0.002 + off);
  }
  // hair
  const hm = new THREE.MeshStandardMaterial({ color: hairC, roughness: 0.5, metalness: 0.12 });
  const ell = (sx, sy, sz, x, y, z, rx = 0, ry = 0, rz = 0, m = hm) => { const e = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), m); e.scale.set(sx, sy, sz); e.position.set(x, y, z); e.rotation.set(rx, ry, rz); e.castShadow = true; g.add(e); return e; };
  const cap = (scale, thetaLen, tilt, m2 = hm) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, thetaLen), m2);
    mesh.scale.set(HEAD.rx * scale, HEAD.ry * scale, HEAD.rz * scale); mesh.rotation.x = -tilt; mesh.castShadow = true; g.add(mesh); return mesh;
  };
  const backShell = (thLen, m2 = hm) => { const bs = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20, Math.PI, Math.PI, 0, thLen), m2); bs.scale.set(HEAD.rx * 1.05, HEAD.ry * 1.05, HEAD.rz * 1.06); bs.castShadow = true; g.add(bs); };
  const t = cfg.hair.type;
  if (t === 'short') { // Tatum: short, neat, side-swept
    cap(1.07, 1.36, 0.4); backShell(1.95);
    ell(0.09, 0.04, 0.07, 0.07, 0.15, 0.1, 0.5, 0, -0.35); ell(0.08, 0.035, 0.06, -0.02, 0.16, 0.115, 0.55, 0, -0.1); ell(0.07, 0.032, 0.055, -0.1, 0.14, 0.1, 0.5, 0, 0.3);
    for (const s of [-1, 1]) ell(0.026, 0.07, 0.05, s * 0.16, 0.0, 0.0);
  } else if (t === 'messy') { // Luke: fuller, tousled, swept fringe
    cap(1.1, 1.3, 0.3); backShell(1.98);
    const fr = [[-0.115, 0.115, 0.125, 0.5, -0.5], [-0.06, 0.13, 0.145, 0.6, -0.3], [0.0, 0.135, 0.15, 0.6, 0.0], [0.06, 0.13, 0.145, 0.6, 0.3], [0.115, 0.115, 0.125, 0.5, 0.5]];
    for (const [x, y, z, rx, rz] of fr) ell(0.052, 0.034, 0.04, x, y, z, rx, 0, rz);
    ell(0.11, 0.03, 0.075, 0.0, 0.19, 0.04, 0.15, 0, 0.12);
    for (const s of [-1, 1]) ell(0.028, 0.075, 0.055, s * 0.162, 0.01, 0.0);
  } else if (t === 'updo') { // Scarlett: black hair pulled back, bun, loose strands
    cap(1.06, 1.5, 0.3); backShell(1.9);
    ell(0.075, 0.075, 0.075, 0, 0.19, -0.13);
    ell(0.1, 0.04, 0.06, -0.06, 0.145, 0.115, 0.5, 0, 0.35); ell(0.1, 0.04, 0.06, 0.06, 0.145, 0.115, 0.5, 0, -0.35);
    for (const s of [-1, 1]) { ell(0.02, 0.08, 0.035, s * 0.155, -0.03, 0.07, 0, 0, s * 0.12); }
  } else if (t === 'wavy') { // Jennifer: shoulder-length soft waves
    cap(1.08, 1.45, 0.28); backShell(2.0);
    ell(0.235, 0.3, 0.13, 0, -0.14, -0.09);
    ell(0.12, 0.05, 0.07, -0.075, 0.14, 0.11, 0.55, 0, 0.4); ell(0.12, 0.05, 0.07, 0.075, 0.14, 0.11, 0.55, 0, -0.4);
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 6, 12), hm); c.position.set(s * 0.175, -0.13, 0.015); c.rotation.z = s * 0.06; c.castShadow = true; g.add(c);
      ell(0.058, 0.055, 0.06, s * 0.18, -0.25, 0.03);
    }
  } else if (t === 'beanie') { // Jaylen
    const bm = new THREE.MeshStandardMaterial({ color: '#17181c', roughness: 0.95 });
    cap(1.09, 1.5, 0.14, bm); backShell(2.0, new THREE.MeshStandardMaterial({ color: '#0d0d0f', roughness: 0.9 }));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.11, 8, 40), bm);
    rim.scale.set(HEAD.rx * 1.06, HEAD.rz * 1.05, HEAD.ry * 0.5); rim.rotation.x = Math.PI / 2 - 0.2; rim.position.set(0, 0.085, 0.0); g.add(rim);
    ell(0.03, 0.03, 0.03, 0, 0.245, -0.02, 0, 0, 0, bm);
    // beard + moustache
    const bmat = new THREE.MeshStandardMaterial({ color: '#1d1511', roughness: 0.95 });
    const sh = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24, 0, Math.PI * 2, 2.0, 1.1), bmat);
    sh.scale.set(HEAD.rx * 1.04, HEAD.ry * 1.03, HEAD.rz * 1.05); g.add(sh);
    const mu = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.02, 0.03, 2, 0.01), bmat); mu.position.set(0, -0.056, HEAD.rz * 0.93); g.add(mu);
  }
  return g;
}

function capsule(r, len, m) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), m);
  mesh.castShadow = true; return mesh;
}

export function buildAvatar(cfg, faceImg) {
  const root = new THREE.Group(); root.name = cfg.name;
  const skinM = mat(cfg.skin, { roughness: 0.7 });
  const topM = mat(cfg.top, { roughness: 0.85 });
  const innerM = mat(cfg.inner, { roughness: 0.85 });
  const pantsM = mat(cfg.pants, { roughness: 0.9 });
  const shoeM = mat(cfg.shoe, { roughness: 0.6 });
  const J = {};

  const hips = new THREE.Group(); hips.position.y = L.hip; root.add(hips); J.hips = hips;
  const pelvis = new THREE.Mesh(new RoundedBoxGeometry(cfg.hipW, 0.2, 0.22, 3, 0.07), pantsM); pelvis.castShadow = true; pelvis.position.y = 0.0; hips.add(pelvis);

  // legs
  for (const s of [-1, 1]) {
    const th = new THREE.Group(); th.position.set(s * cfg.hipW * 0.3, -0.03, 0); hips.add(th);
    const tm = capsule(0.075, L.thigh - 0.15, pantsM); tm.position.y = -L.thigh / 2; th.add(tm);
    const sh = new THREE.Group(); sh.position.y = -L.thigh; th.add(sh);
    const sm = capsule(0.062, L.shin - 0.12, pantsM); sm.position.y = -L.shin / 2; sh.add(sm);
    const ft = new THREE.Group(); ft.position.y = -L.shin; sh.add(ft);
    const fm = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.07, 0.24, 2, 0.03), shoeM); fm.position.set(0, -0.035, 0.06); fm.castShadow = true; ft.add(fm);
    J[s > 0 ? 'thighL' : 'thighR'] = th; J[s > 0 ? 'shinL' : 'shinR'] = sh; J[s > 0 ? 'footL' : 'footR'] = ft;
  }

  // spine / torso
  const spine = new THREE.Group(); spine.position.y = 0.06; hips.add(spine); J.spine = spine;
  const torso = new THREE.Mesh(new RoundedBoxGeometry(cfg.torsoW, 0.5, 0.25, 4, 0.09), topM);
  torso.position.y = 0.26; torso.castShadow = true; spine.add(torso);
  if (cfg.topStyle === 'blazer') {
    const sh = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.33, 0.03, 2, 0.01), innerM); sh.position.set(0, 0.34, 0.128); spine.add(sh);
    for (const s of [-1, 1]) { const lp = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.3, 0.03, 2, 0.01), topM); lp.position.set(s * 0.075, 0.35, 0.135); lp.rotation.z = s * 0.22; spine.add(lp); }
  } else if (cfg.topStyle === 'polo' || cfg.topStyle === 'shirt') {
    const col = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.05, 0.19, 2, 0.02), topM); col.position.set(0, 0.5, 0.01); spine.add(col);
  } else if (cfg.topStyle === 'hoodie') {
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.06, 10, 20), topM); hood.rotation.x = Math.PI / 2 - 0.5; hood.position.set(0, 0.5, -0.02); hood.scale.set(1.2, 1.1, 1.0); spine.add(hood);
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.42, 0.01), mat('#555a60', { metalness: 0.7, roughness: 0.4 })); zip.position.set(0.0, 0.26, 0.128); spine.add(zip);
  } else if (cfg.topStyle === 'sweater') {
    const nk = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.03, 8, 20), topM); nk.rotation.x = Math.PI / 2; nk.position.set(0, 0.51, 0.0); spine.add(nk);
  }

  // arms
  for (const s of [-1, 1]) {
    const sg = new THREE.Group(); sg.position.set(s * (cfg.torsoW / 2 + 0.01 + 0.0), 0.47, 0); spine.add(sg);
    const sj = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), topM); sg.add(sj);
    const up = new THREE.Group(); sg.add(up);
    const um = capsule(0.056, L.upper - 0.1, topM); um.position.y = -L.upper / 2; up.add(um);
    const el = new THREE.Group(); el.position.y = -L.upper; up.add(el);
    const fm = capsule(0.047, L.fore - 0.08, cfg.topStyle === 'blazer' ? topM : (cfg.topStyle === 'polo' ? skinM : topM)); fm.position.y = -L.fore / 2; el.add(fm);
    const hand = new THREE.Group(); hand.position.y = -L.fore; el.add(hand);
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), skinM); hm.scale.set(0.9, 1.15, 0.7); hm.position.y = -0.04; hand.add(hm);
    const key = s > 0 ? 'L' : 'R';
    J['sh' + key] = sg; J['up' + key] = up; J['el' + key] = el; J['hand' + key] = hand;
  }

  // neck + head
  const neck = new THREE.Group(); neck.position.y = 0.53; spine.add(neck); J.neck = neck;
  const nm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.12, 12), skinM); nm.position.y = 0.04; neck.add(nm);
  const headG = new THREE.Group(); headG.scale.setScalar(0.9); headG.position.y = 0.07 + HEAD.ry * 0.88; neck.add(headG); J.head = headG;
  headG.add(makeHead(cfg));

  // cup (carried in right hand)
  const cup = new THREE.Group();
  const cm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.09, 14), mat('#f2efe6', { roughness: 0.4 }));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0415, 0.0405, 0.015, 14), new THREE.MeshStandardMaterial({ color: '#B9A372', emissive: '#B9A372', emissiveIntensity: 0.8 }));
  band.position.y = 0.0; cup.add(cm); cup.add(band);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.01, 14), mat('#d9d4c6')); lid.position.y = 0.05; cup.add(lid);
  cup.visible = false; root.add(cup);
  J.cup = cup;
  const phone = new THREE.Group();
  phone.add(new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.15, 0.012, 2, 0.005), mat('#0c0c10', { roughness: 0.3, metalness: 0.6 })));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.135), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 1.4, 1.5), toneMapped: false }));
  scr.position.z = 0.0071; phone.add(scr); phone.visible = false; root.add(phone); J.phone = phone;

  return { root, J, cfg };
}

/** Two-bone IK in the parent (spine) frame. */
const _d = V(), _p = V(), _e = V(), _f = V(), _q = new THREE.Quaternion();
function solveArm(shoulderG, upG, elG, target, pole) {
  const sp = shoulderG.position; // in spine frame
  _d.copy(target).sub(sp);
  let D = _d.length();
  const maxD = L.upper + L.fore - 0.005, minD = 0.12;
  D = clamp(D, minD, maxD);
  _d.normalize();
  const a = (L.upper * L.upper - L.fore * L.fore + D * D) / (2 * D);
  const h = Math.sqrt(Math.max(0, L.upper * L.upper - a * a));
  _p.copy(pole); _p.addScaledVector(_d, -_p.dot(_d)).normalize();
  _e.copy(_d).multiplyScalar(a).addScaledVector(_p, h); // elbow relative to shoulder
  upG.quaternion.setFromUnitVectors(DOWN, _f.copy(_e).normalize());
  // hand pos relative to shoulder = d*D ; forearm dir in spine frame
  _f.copy(_d).multiplyScalar(D).sub(_e).normalize();
  _f.applyQuaternion(_q.copy(upG.quaternion).invert());
  elG.quaternion.setFromUnitVectors(DOWN, _f);
}

export class Animator {
  constructor(av, id) {
    this.av = av; this.J = av.J; this.id = id; this.cfg = av.cfg;
    this.w = { sit: 0, walk: 0, type: 0, think: 0, drink: 0, reach: 0, lean: 0, stretch: 0, hips: 0, cup: 0, phone: 0, table: 0, hands: 0 };
    this.tgt = Object.assign({}, this.w);
    this.phase = Math.random() * 6; this.t = Math.random() * 100; this.walkSpeed = 0;
    this.tapT = [0, 0]; this.look = 0; this.lookT = 0; this.gazeYaw = 0; this.gazePitch = 0;
    this.mode = 'stand'; this.reachWorld = null; this.gesture = 'none';
    this.keyHit = 0; this.burst = 0; this.burstT = 1;
    this._tgtL = V(); this._tgtR = V(); this._tmp = V();
    this.sipPhase = 0; this.sipAmt = 0; this.sipTarget = 0;
  }
  set(k, v) { this.tgt[k] = v; }
  update(dt, speed) {
    const w = this.w, tg = this.tgt, J = this.J, t = (this.t += dt);
    const rates = { hands: 5, sit: 4.2, walk: 6, type: 5, think: 4, drink: 4, reach: 5, lean: 3, stretch: 3, hips: 4, cup: 6, phone: 5, table: 3 };
    for (const k in w) w[k] = damp(w[k], tg[k], rates[k] || 4, dt);
    this.walkSpeed = damp(this.walkSpeed, speed, 8, dt);
    this.phase += dt * (this.walkSpeed * 5.2);
    const ph = this.phase;
    const sit = w.sit, wk = w.walk * clamp(this.walkSpeed / 0.9, 0, 1);

    // ---- legs ----
    const s = Math.sin(ph), c = Math.cos(ph);
    const sway = Math.sin(t * 0.7) * 0.5 + 0.0;
    const stand = 1 - sit;
    const legPose = (sgn, thSit, ph0) => {
      const sv = Math.sin(ph + ph0), cv = Math.cos(ph + ph0);
      const swing = -sv * 0.62 * wk;
      const flex = (0.06 + 0.95 * Math.max(0, cv) * wk);
      const idle = (sgn * 0.02 + (w.lean * 0.08 * sgn)) * stand * (1 - wk);
      const thigh = lerp(swing + idle, -1.5, sit) + (sit * sgn * 0.0);
      const knee = lerp(flex + (sgn > 0 ? 0 : 0) * 0, 1.46, sit);
      return [thigh, knee];
    };
    for (const [side, sgn, ph0] of [['L', 1, 0], ['R', -1, Math.PI]]) {
      const [th, kn] = legPose(sgn, 0, ph0);
      J['thigh' + side].rotation.set(th, 0, sgn * (0.03 + sit * 0.04 + w.lean * 0.02));
      J['shin' + side].rotation.set(kn, 0, 0);
      J['foot' + side].rotation.set(-(th + kn) + (wk * 0.25 * Math.max(0, -Math.sin(ph + ph0 + 0.4))) , 0, 0);
    }
    // hips (height / bob / sway)
    const hipY = lerp(0.83, SEAT_HIP_Y, sit) - Math.abs(c) * 0.035 * wk + (1 - Math.cos(ph * 2)) * 0.0;
    J.hips.position.y = hipY;
    J.hips.position.x = (Math.sin(ph) * 0.025 * wk) + (sway * 0.025 * w.lean * stand);
    J.hips.rotation.y = Math.sin(ph) * 0.12 * wk;
    J.hips.rotation.z = (Math.sin(ph) * 0.03 * wk) + (sway * 0.03 * w.lean * stand);

    // ---- breathing / spine ----
    const breath = Math.sin(t * 1.9) * 0.012;
    const typeBurst = w.type;
    let leanX = 0.04 * stand + 0.14 * w.type * sit + 0.09 * w.think * sit + 0.02 * wk - 0.1 * w.lean * 0.5 + breath + w.table * 0.22 * stand;
    leanX += -0.34 * w.stretch;
    J.spine.rotation.set(leanX, -J.hips.rotation.y * 0.8 + this.gazeYaw * 0.3 + Math.sin(ph) * -0.1 * wk, 0);
    // ---- head / gaze ----
    this.lookT -= dt;
    if (this.lookT <= 0) {
      this.lookT = 1.2 + Math.random() * 3.2;
      this.gazeTarget = (Math.random() - 0.5) * 1.0;
      this.gazePitchT = (Math.random() - 0.5) * 0.25;
      if (this.mode === 'type') { // glance between the two side monitors
        this.gazeTarget = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.5);
        this.gazePitchT = 0.12 + Math.random() * 0.1;
      }
      if (this.mode === 'think') { this.gazeTarget = (Math.random() - 0.5) * 0.9; this.gazePitchT = -0.25 + Math.random() * 0.25; }
      if (this.mode === 'sip') { this.gazeTarget = (Math.random() - 0.5) * 0.9; this.gazePitchT = 0.0; }
      if (this.mode === 'machine') { this.gazeTarget = 0.1; this.gazePitchT = 0.1; }
    }
    this.gazeYaw = damp(this.gazeYaw, (this.gazeTarget || 0) * (1 - wk * 0.9), 2.2, dt);
    this.gazePitch = damp(this.gazePitch, (this.gazePitchT || 0), 2.2, dt);
    let headPitch = this.gazePitch - 0.04 * wk;
    this.sipAmt = damp(this.sipAmt, this.sipTarget, 2.2, dt);
    const drinkTilt = w.drink * -0.28 * this.sipAmt;
    J.neck.rotation.set(headPitch * 0.4, this.gazeYaw * 0.45, 0);
    J.head.rotation.set(headPitch * 0.6 + drinkTilt, this.gazeYaw * 0.55, w.think * 0.12 * Math.sin(t * 0.4) + w.think * 0.08);

    // ---- arms ----
    const sh = J.shL.position; // same for both (mirrored)
    const hipsW = J.hips.matrixWorld; // not used
    const tl = this._tgtL, tr = this._tgtR;
    const cfgS = this.cfg.torsoW / 2 + 0.01;
    // relaxed hanging pose (spine frame)
    const swingA = Math.sin(ph) * 0.2 * wk;
    tl.set(cfgS + 0.07, 0.47 - 0.5, 0.02 - swingA + 0.0);
    tr.set(-cfgS - 0.07, 0.47 - 0.5, 0.02 + swingA);
    // phone / hand-on-hip etc.
    if (w.phone > 0.01) {
      this._tmp.set(-0.1, 0.62, 0.3); tr.lerp(this._tmp, w.phone);
    }
    if (w.hands > 0.01) { // hands on hips
      this._tmp.set(cfgS + 0.12, 0.12, 0.03); tl.lerp(this._tmp, w.hands);
      this._tmp.set(-cfgS - 0.12, 0.12, 0.03); tr.lerp(this._tmp, w.hands);
    }
    const kb = this.av.desk; // desk target info (root-local) set by scene
    // typing: coords relative to root (root space), converted to spine frame below
    const typeL = V(0.1, 0.8, 0.5), typeR = V(-0.1, 0.8, 0.5);
    this.keyHit = damp(this.keyHit, 0, 12, dt);
    this.burstT -= dt;
    if (this.burstT <= 0) { this.burst = Math.random() < 0.78 ? 1 : 0; this.burstT = this.burst ? 1.5 + Math.random() * 3.5 : 0.5 + Math.random() * 1.6; }
    const bt = this.burst;
    typeL.x += Math.sin(t * 9.1) * 0.035 * bt + Math.sin(t * 2.3) * 0.02; typeL.z += Math.sin(t * 13.3 + 1) * 0.02 * bt; typeL.y += Math.max(0, Math.sin(t * 17.0)) * 0.025 * bt;
    typeR.x += Math.sin(t * 8.3 + 2) * 0.035 * bt + Math.sin(t * 2.9) * 0.02; typeR.z += Math.sin(t * 12.1) * 0.02 * bt; typeR.y += Math.max(0, Math.sin(t * 15.3 + 1)) * 0.025 * bt;

    // convert root-space targets to spine space
    const rootSpace = [];
    const toSpine = (p) => {
      this._tmp.copy(p);
      this.av.root.localToWorld(this._tmp);
      J.spine.worldToLocal(this._tmp);
      return this._tmp.clone();
    };
    this.av.root.updateMatrixWorld(true);
    // typing / thinking targets override
    const aL = tl.clone(), aR = tr.clone();
    if (w.type > 0.001) {
      const kt = this.mode === 'type' ? 1 : w.type;
      aL.lerp(toSpine(typeL), clamp(w.type, 0, 1));
      aR.lerp(toSpine(typeR), clamp(w.type, 0, 1));
    }
    if (w.think > 0.001) {
      // right hand to chin; left hand rests on desk
      const head = J.head.getWorldPosition(V());
      const chin = head.clone(); chin.y -= 0.0; this.av.root.worldToLocal(chin);
      const chinT = V(chin.x - 0.07, chin.y - 0.17, chin.z + 0.16);
      aR.lerp(toSpine(chinT), w.think);
      const restL = V(0.38, 0.79, 0.4); restL.x += Math.sin(t * 3) * 0.01 * (Math.sin(t * 0.5) > 0.6 ? 1 : 0);
      aL.lerp(toSpine(restL), w.think * 0.9);
    }
    if (w.table > 0.001 && this.av.tableHand) {
      const th = this.av.root.worldToLocal(this.av.tableHand.clone());
      aL.lerp(toSpine(V(th.x + 0.02, th.y, th.z)), w.table);
    }
    if (w.reach > 0.001 && this.reachWorld) {
      const rl = this.av.root.worldToLocal(this.reachWorld.clone());
      // press-button wobble
      rl.y += Math.sin(t * 6) * 0.01 * 0; rl.z += Math.max(0, Math.sin(t * 2.2)) * 0.02;
      aR.lerp(toSpine(rl), w.reach);
    }
    if (w.drink > 0.001) {
      const ph2 = this.sipAmt;
      const mouth = V(-0.025, 1.56 - 0.1 * 0 , 0.2); // head height ~1.58 (standing)
      const hy = J.head.getWorldPosition(V()); this.av.root.worldToLocal(hy);
      const sipPos = V(-0.03, hy.y - 0.12, hy.z + 0.25 + 0.02);
      const holdPos = V(-0.2, 1.1, 0.27);
      const p = holdPos.lerp(sipPos, smooth(ph2));
      aR.lerp(toSpine(p), w.drink);
    }
    if (w.stretch > 0.001) {
      aL.lerp(V(0.18, 1.05, 0.08), w.stretch); aR.lerp(V(-0.18, 1.05, 0.08), w.stretch);
    }
    solveArm(J.shL, J.upL, J.elL, aL, V(0.55 + w.hands, -0.7 + w.hands * 0.7, -0.35));
    solveArm(J.shR, J.upR, J.elR, aR, V(-0.55 - w.hands, -0.7 + w.hands * 0.7, -0.35));
    if (J.phone) {
      J.phone.visible = w.phone > 0.4;
      if (J.phone.visible) {
        const hp = J.handR.getWorldPosition(V()); this.av.root.worldToLocal(hp);
        J.phone.position.set(hp.x, hp.y + 0.03, hp.z + 0.03); J.phone.rotation.set(-0.5, 0.2, 0);
      }
    }

    // cup follows right hand
    const cup = J.cup;
    cup.visible = w.cup > 0.05;
    if (cup.visible) {
      const hp = J.handR.getWorldPosition(V());
      this.av.root.worldToLocal(hp);
      cup.position.copy(hp).add(V(0, 0.02, 0.0));
      const tilt = w.drink * 0.9 * smooth(this.sipAmt);
      cup.rotation.set(tilt, 0, 0);
      cup.scale.setScalar(clamp(w.cup, 0, 1));
    }
  }
}
function smooth(x) { return x * x * (3 - 2 * x); }
