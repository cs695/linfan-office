import * as THREE from 'three';
import { ARC, arcPos, deskPose, DESKS, PANTRY } from './world.js';
import { ORDER } from './people.js';

const WALK = 1.25;
const rot = (P, lx, lz) => ({ x: P.x + lx * Math.cos(P.yaw) + lz * Math.sin(P.yaw), z: P.z - lx * Math.sin(P.yaw) + lz * Math.cos(P.yaw) });
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const rr = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ------------------------------------------------ navigation graph */
const N = {}; const E = [];
const node = (k, x, z, yaw = 0) => { N[k] = { x, z, yaw }; };
const edge = (a, b) => { E.push([a, b]); };
export function buildGraph() {
  const th = ARC.ang;
  const mids = [0, 1, 2, 3].map(k => (th[k] + th[k + 1]) / 2);
  mids.forEach((m, k) => {
    const o = arcPos(m, ARC.R + 1.8), n = arcPos(m, ARC.R - 2.3);
    node('GO' + k, o.x, o.z, Math.PI - m); node('GI' + k, n.x, n.z, -m);
    if (k) { edge('GO' + (k - 1), 'GO' + k); edge('GI' + (k - 1), 'GI' + k); }
    edge('GO' + k, 'GI' + k);
  });
  const wx = [-9, -6, -3, 0, 3, 6];
  wx.forEach((x, k) => { node('W' + k, x, 3.2); if (k) edge('W' + (k - 1), 'W' + k); });
  edge('GI0', 'W1'); edge('GI1', 'W2'); edge('GI2', 'W4'); edge('GI3', 'W5');
  ORDER.forEach((id, i) => {
    const P = deskPose(i); const a = rot(P, 0, -1.25);
    node('A' + i, a.x, a.z, P.yaw);
    node('S' + i, P.x, P.z, P.yaw);
    edge('A' + i, 'GO' + Math.max(0, i - 1)); if (i > 0 && i < 4) edge('A' + i, 'GO' + i);
  });
  node('PX', 7.2, 3.2); edge('PX', 'W5');
  node('PM', 4.7, 3.7); edge('PM', 'W4'); edge('PM', 'PX');
  node('PA', 3.85, 5.5, 1.07); edge('PA', 'PM');
  node('PB', 3.0, 3.75, 0); edge('PB', 'W4'); edge('PB', 'W3');
  node('PB2', 1.9, 4.5, Math.PI / 2); edge('PB2', 'W3'); edge('PB2', 'PB');
  node('LX', -6.4, 3.0); edge('LX', 'W0'); edge('LX', 'W1'); edge('LX', 'W2');
  node('LS1', -3.9, 4.6, -Math.PI / 2); node('LS2', -8.4, 4.9, 1.6); node('LS3', -4.3, 6.9, -2.3); node('LS4', -8.3, 7.0, 0.8);
  edge('LS1', 'W2'); edge('LS1', 'W1'); edge('LS2', 'W0'); edge('LS3', 'LS1'); edge('LS4', 'LS2'); edge('LS3', 'LS4');
  node('HA', 1.9, 3.1, -2.07); node('HB', -1.9, 3.1, 2.07); node('HC', 0, -0.3, 0);
  edge('HA', 'W4'); edge('HB', 'W2'); edge('HC', 'GI1'); edge('HC', 'GI2');
  node('C1', -1.2, 6.9, 0); edge('C1', 'W2'); node('C2', 1.4, 6.9, 0); edge('C2', 'W4');
}
function path(from, to) {
  const dist = { [from]: 0 }, prev = {}; const q = new Set(Object.keys(N));
  const adj = {}; for (const [a, b] of E) { (adj[a] ||= []).push(b); (adj[b] ||= []).push(a); }
  while (q.size) {
    let u = null; for (const k of q) if (dist[k] !== undefined && (u === null || dist[k] < dist[u])) u = k;
    if (u === null) break; q.delete(u); if (u === to) break;
    for (const v of adj[u] || []) { const d = dist[u] + Math.hypot(N[u].x - N[v].x, N[u].z - N[v].z); if (dist[v] === undefined || d < dist[v]) { dist[v] = d; prev[v] = u; } }
  }
  const out = []; let c = to; while (c) { out.unshift(c); c = prev[c]; if (c === from) { out.unshift(c); break; } }
  return out;
}
function nearestNode(x, z, keys) { let b = null, bd = 1e9; for (const k of keys) { const d = Math.hypot(N[k].x - x, N[k].z - z); if (d < bd) { bd = d; b = k; } } return b; }

const IDLE_SPOTS = ['W0', 'W2', 'W3', 'W5', 'LS1', 'LS2', 'LS3', 'LS4', 'HA', 'HB', 'HC', 'C1', 'C2', 'GO0', 'GO1', 'GO2', 'GO3', 'GI1', 'GI2'];

/* ------------------------------------------------ agent brain */
export class Agent {
  constructor(id, i, av, anim, ctx) {
    this.id = id; this.i = i; this.av = av; this.anim = anim; this.ctx = ctx; this.desk = DESKS[id];
    this.x = 0; this.z = 0; this.yaw = 0; this.speed = 0; this.here = null;
    this.seated = false; this.gen = null; this.activity = null; this.token = 0;
    this.chairPull = 0; this.chairYaw = 0;
  }
  apply() { this.av.root.position.set(this.x, 0, this.z); this.av.root.rotation.y = this.yaw; }
  teleportNode(k) { const n = N[k]; this.x = n.x; this.z = n.z; this.yaw = n.yaw || 0; this.here = k; this.apply(); }
  snap() { Object.assign(this.anim.w, this.anim.tgt); this.chairPull = this.seated ? 0 : 1; }

  setActivity(act, instant = false) {
    if (act === this.activity) return;
    const first = this.activity === null; this.activity = act;
    this.token++;
    const t = this.token;
    this.gen = this.script(act, first || instant);
    this._t = t;
    if (first || instant) { this.runInstant = true; }
  }
  baseReset() {
    const a = this.anim; for (const k of ['type', 'think', 'drink', 'reach', 'lean', 'stretch', 'hips', 'cup', 'phone', 'table']) a.set(k, 0);
    a.set('walk', 0); this.speed = 0;
    a.sipTarget = 0; a.reachWorld = null; this.av.tableHand = null; this.ctx.machineBusy = 0;
  }
  *wait(s) { let t = 0; while (t < s) { t += this.dt; yield; } }
  *turnTo(yaw) { while (Math.abs(angDiff(this.yaw, yaw)) > 0.04) { this.yaw += angDiff(this.yaw, yaw) * (1 - Math.exp(-this.dt * 6)); this.apply(); yield; } }
  *walkNodes(list) {
    const a = this.anim; a.set('walk', 1); a.mode = 'walk';
    for (const k of list) {
      const n = N[k];
      while (true) {
        const dx = n.x - this.x, dz = n.z - this.z, d = Math.hypot(dx, dz);
        if (d < 0.08) break;
        const head = Math.atan2(dx, dz);
        const err = angDiff(this.yaw, head);
        this.yaw += err * (1 - Math.exp(-this.dt * 7));
        const sp = WALK * Math.max(0.0, Math.cos(Math.min(Math.abs(err), 1.4))) ** 2;
        const step = Math.min(d, sp * this.dt);
        this.x += Math.sin(head) * step; this.z += Math.cos(head) * step; this.speed = sp; this.apply(); yield;
      }
      this.here = k;
    }
    this.speed = 0; a.set('walk', 0);
  }
  *goTo(k) {
    if (this.here === k) return;
    let from = this.here;
    if (!from || !N[from]) from = nearestNode(this.x, this.z, Object.keys(N).filter(x => !/^S/.test(x)));
    if (from !== this.here) { yield* this.walkNodes([from]); }
    const p = path(from, k).slice(1);
    yield* this.walkNodes(p);
    this.speed = 0;
    if (N[k].yaw !== undefined) yield* this.turnTo(N[k].yaw);
  }
  *sitDown() {
    const a = this.anim, P = this.desk.pose;
    yield* this.goTo('A' + this.i);
    yield* this.turnTo(P.yaw);
    const s = N['S' + this.i];
    const sx = this.x, sz = this.z, T = 1.5; let t = 0;
    a.set('sit', 1); a.mode = 'sit'; this.chairTarget = 0;
    while (t < T) {
      t += this.dt; const k = Math.min(1, t / T), e = k * k * (3 - 2 * k);
      if (k > 0.25) { const m = (k - 0.25) / 0.75; this.x = sx + (s.x - sx) * m; this.z = sz + (s.z - sz) * m; }
      this.apply(); yield;
    }
    this.seated = true; this.here = 'S' + this.i;
  }
  *standUp() {
    if (!this.seated) return;
    const a = this.anim, s = N['S' + this.i], aa = N['A' + this.i];
    this.baseReset(); a.set('sit', 0); a.mode = 'stand'; this.chairTarget = 1;
    let t = 0; const T = 1.3;
    while (t < T) { t += this.dt; const k = Math.min(1, t / T); this.x = s.x + (aa.x - s.x) * k; this.z = s.z + (aa.z - s.z) * k; this.apply(); yield; }
    this.seated = false; this.here = 'A' + this.i;
  }
  /* ---- activity scripts ---- */
  *script(act, instant) {
    const a = this.anim;
    if (act === 'typing' || act === 'thinking') {
      const mode = act === 'typing' ? 'type' : 'think';
      if (instant && !this.seated) { this.teleportNode('S' + this.i); this.seated = true; a.set('sit', 1); this.chairTarget = 0; this.snapAfter = true; }
      else if (!this.seated) { this.baseReset(); yield* this.sitDown(); }
      this.baseReset(); a.set('sit', 1); a.mode = mode; a.set(mode === 'type' ? 'type' : 'think', 1);
      while (true) yield;
    } else if (act === 'pantry') {
      if (this.seated) yield* this.standUp();
      this.baseReset();
      if (instant) { this.teleportNode('PB'); a.set('cup', 1); a.set('lean', 0.5); this.snapAfter = true; }
      let first = !instant;
      while (true) {
        if (first || Math.random() < 0.5) {
          // make a coffee
          this.baseReset(); yield* this.goTo('PA');
          a.mode = 'machine'; a.reachWorld = PANTRY.button.clone(); a.set('reach', 1); yield* this.wait(1.4);
          this.ctx.machineBusy = 1; yield* this.wait(1.2); a.reachWorld = PANTRY.tray.clone().add(new THREE.Vector3(0.0, 0.1, 0.0)); yield* this.wait(3.5);
          a.set('cup', 1); yield* this.wait(1.2); a.set('reach', 0); this.ctx.machineBusy = 0; yield* this.wait(0.8);
          first = false;
        }
        const spot = Math.random() < 0.7 ? 'PB' : 'PB2';
        yield* this.goTo(spot); a.set('lean', 0.4); a.mode = 'sip';
        const tp = N[spot]; this.av.tableHand = new THREE.Vector3(tp.x + Math.sin(tp.yaw) * 0.42 + 0.12, 1.08, tp.z + Math.cos(tp.yaw) * 0.42);
        const rounds = Math.floor(rr(3, 6));
        for (let r = 0; r < rounds; r++) {
          a.set('drink', 1); a.set('table', 0.8); a.sipTarget = 0; yield* this.wait(rr(3, 6));
          a.sipTarget = 1; yield* this.wait(rr(1.4, 2.2)); a.sipTarget = 0; yield* this.wait(1.2);
        }
        a.set('drink', 0); a.set('table', 0); a.set('cup', 0); a.set('lean', 0); a.sipTarget = 0;
        yield* this.wait(rr(2, 4));
        a.set('cup', 0);
        // sometimes a little stroll before another round
        if (Math.random() < 0.4) { yield* this.goTo('PX'); yield* this.wait(rr(1, 3)); }
        a.set('cup', 1);
        if (Math.random() < 0.45) { a.set('cup', 0); }
      }
    } else { // idle (and unknown)
      if (this.seated) { yield* this.standUp(); this.baseReset(); a.set('stretch', 1); yield* this.wait(2.4); a.set('stretch', 0); yield* this.wait(0.8); }
      this.baseReset();
      if (instant) { const k = pick(['W2', 'LS1', 'HA', 'C2', 'W0', 'HC', 'GO1']); this.teleportNode(k); this.snapAfter = true; yield* this.wait(rr(1, 3)); }
      let last = this.here;
      while (true) {
        const k = pick(IDLE_SPOTS.filter(s => s !== last)); last = k;
        yield* this.goTo(k);
        this.baseReset();
        const g = pick(['none', 'phone', 'hips', 'none', 'phone', 'stretch', 'hips']);
        if (g === 'phone') a.set('phone', 1); else if (g === 'hips') a.set('hands', 1); else if (g === 'stretch') a.set('stretch', 1);
        a.mode = 'idle'; a.set('lean', Math.random() < 0.5 ? 1 : 0);
        yield* this.wait(g === 'stretch' ? 2.6 : rr(4, 9));
        a.set('phone', 0); a.set('hands', 0); a.set('stretch', 0); a.set('lean', 0); yield* this.wait(0.7);
      }
    }
  }
  update(dt) {
    this.dt = dt;
    if (this.gen) { const r = this.gen.next(); if (r.done) this.gen = null; }
    if (this.snapAfter) { this.snapAfter = false; this.snap(); }
    // chair
    const d = this.desk;
    const want = this.seated ? 0 : (this.chairTarget === undefined ? 1 : this.chairTarget);
    const tgt = this.seated ? 0 : (this.chairTarget === 0 ? 0.0 : 1);
    this.chairPull += (tgt - this.chairPull) * (1 - Math.exp(-dt * 3));
    d.chair.position.z = -0.55 * this.chairPull;
    d.chair.rotation.y = 0.5 * this.chairPull * (this.i % 2 ? 1 : -1);
    this.anim.update(dt, this.speed);
  }
}
