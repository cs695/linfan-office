import { PEOPLE, ORDER } from './people.js';

const ACT = {
  typing:   { label: '工作中',    cls: 'typing' },
  thinking: { label: '思考中',    cls: 'thinking' },
  idle:     { label: '行行企企',  cls: 'idle' },
  pantry:   { label: 'Pantry 休息', cls: 'pantry' },
};
export function normActivity(a) {
  a = String(a || '').toLowerCase().trim();
  if (a === 'break' || a === 'pantry' || a === 'coffee') return 'pantry';
  if (a === 'typing' || a === 'working' || a === 'dm') return 'typing';
  if (a === 'thinking' || a === 'think') return 'thinking';
  return 'idle';
}
export class UI {
  constructor(root) {
    this.layer = document.getElementById('bubbles'); this.roster = document.getElementById('roster');
    this.items = {}; this.state = {};
    ORDER.forEach(id => {
      const p = PEOPLE[id];
      const el = document.createElement('div'); el.className = 'bubble idle';
      el.innerHTML = `<div class="b-head"><span class="b-name">${p.name}</span><span class="b-role">${p.role}</span><span class="b-chip"></span></div><div class="b-text">…</div><div class="b-alert" hidden></div>`;
      const lead = document.createElement('div'); lead.className = 'leader';
      this.layer.appendChild(lead); this.layer.appendChild(el);
      const card = document.createElement('div'); card.className = 'rcard idle';
      card.innerHTML = `<img src="assets/portraits/${id}.jpg" alt="${p.name}"><div class="r-main"><div class="r-top"><b>${p.name}</b><span class="r-role">${p.role}</span></div><div class="r-text">…</div></div><span class="r-dot"></span>`;
      this.roster.appendChild(card);
      this.items[id] = { el, lead, card, w: 0, h: 0, x: 0, y: 0, dirty: true };
    });
  }
  apply(id, a) { // a: {activity,status,alert}
    const it = this.items[id]; if (!it) return;
    const act = ACT[a.activity] || ACT.idle; const cls = act.cls + (a.alert ? ' alert' : '');
    it.el.className = 'bubble ' + cls; it.card.className = 'rcard ' + cls;
    it.el.querySelector('.b-chip').textContent = act.label;
    it.el.querySelector('.b-text').textContent = a.status || '—';
    const al = it.el.querySelector('.b-alert'); al.hidden = !a.alert; al.textContent = a.alert ? '⚠ ' + a.alert : '';
    it.card.querySelector('.r-text').textContent = (a.alert ? '⚠ ' + a.alert + '・' : '') + (a.status || '—');
    it.dirty = true;
  }
  /** pts: {id: {x,y,vis,scale}} (screen px of head top) */
  layout(pts, W, H) {
    const U = Math.min(H / 1080, W / 1920), top = 112 * U;
    const ids = ORDER.filter(id => pts[id] && pts[id].vis).sort((a, b) => pts[a].x - pts[b].x);
    for (const id of ORDER) { const it = this.items[id]; const p = pts[id]; const show = p && p.vis; it.el.style.display = it.lead.style.display = show ? '' : 'none'; }
    for (const id of ids) { const it = this.items[id]; if (it.dirty || !it.w) { it.el.style.transform = 'none'; it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; it.dirty = false; } }
    let shrink = 1, res = null;
    for (let attempt = 0; attempt < 7; attempt++, shrink *= 0.92) {
      const placed = []; res = {}; let ok = true;
      for (const id of ids) {
        const it = this.items[id], p = pts[id]; const sc = p.scale * shrink;
        const w = it.w * sc, h = it.h * sc;
        const left = Math.max(8, Math.min(W - w - 8, p.x - w / 2));
        let bottom = p.y - 26 * sc, moved = true, guard = 0;
        while (moved && guard++ < 12) {
          moved = false;
          for (const o of placed) {
            const ox = left < o.right + 10 && left + w > o.left - 10, oy = bottom - h < o.bottom + 6 && bottom > o.top - 6;
            if (ox && oy) { bottom = o.top - 18 * sc; moved = true; }
          }
        }
        if (bottom - h < top) ok = false;
        placed.push({ left, right: left + w, top: bottom - h, bottom });
        res[id] = { left, bottom, h, sc };
      }
      if (ok) break;
    }
    for (const id of ids) {
      const it = this.items[id], p = pts[id], r = res[id];
      it.el.style.transformOrigin = '0 0';
      it.el.style.transform = `translate(${r.left}px, ${r.bottom - r.h}px) scale(${r.sc})`;
      it.lead.style.transform = `translate(${p.x}px, ${r.bottom}px)`; it.lead.style.height = Math.max(0, p.y - r.bottom + 4) + 'px';
    }
  }
}
