'use strict';
/* =====================================================================
   art.js  --  ALL VISUALS + REPLACEABLE ASSET DATA (no game logic here)
   Everything is drawn procedurally with Canvas, so the game has zero
   external files. To swap in your own artwork, set Assets.heroSprite /
   Assets.chaserSprite to an Image (see drawHero / drawChaser), or edit the
   data in the Assets block below (names, costumes, dialogue lines).
   Characters are ORIGINAL: "Gullu" (hero) and "Seth Motilal" (pursuer).
   ===================================================================== */

/* ---------- REPLACEABLE ASSETS / CONTENT ---------- */
const Assets = {
  heroName: 'Gullu',
  chaserName: 'Seth Motilal',
  heroSprite: null,     // optional Image: if set & loaded, drawn instead of the procedural hero
  chaserSprite: null,   // optional Image for the pursuer
  costumes: [
    { id: 'classic', name: 'Gullu Classic',    price: 0,    shirt: '#ffb703', trim: '#ffffff', pants: '#f4f1de', hair: '#2b1b12', shoe: '#8a4b21', deco: 'kurta',   acc: 'none'   },
    { id: 'cricket', name: 'Gully Cricketer',  price: 300,  shirt: '#2563eb', trim: '#ffffff', pants: '#e5e7eb', hair: '#2b1b12', shoe: '#f8fafc', deco: 'jersey',  acc: 'cap'    },
    { id: 'dabba',   name: 'Dabbawala Dash',   price: 600,  shirt: '#f8fafc', trim: '#94a3b8', pants: '#f8fafc', hair: '#2b1b12', shoe: '#6b4423', deco: 'kurta',   acc: 'topi'   },
    { id: 'disco',   name: 'Disco Gullu',      price: 1000, shirt: '#7c3aed', trim: '#f0abfc', pants: '#111827', hair: '#1a1a1a', shoe: '#f43f5e', deco: 'sequin',  acc: 'shades' },
    { id: 'chai',    name: 'Chaiwala Champ',   price: 1500, shirt: '#16a34a', trim: '#fde68a', pants: '#92400e', hair: '#2b1b12', shoe: '#451a03', deco: 'apron',   acc: 'towel'  },
    { id: 'porter',  name: 'Station Porter',   price: 2200, shirt: '#dc2626', trim: '#fbbf24', pants: '#1f2937', hair: '#2b1b12', shoe: '#111827', deco: 'badge',   acc: 'turban' }
  ],
  heroLines: {
    coin:  ['Paisa hi paisa!', 'Waah, sone jaisa!', 'Cha-ching!', 'Jeb bhar gayi!'],
    jump:  ['Hup!', 'Uchhal!', 'Whee!'],
    hit:   ['Arre baap re!', 'Meri kismat!', 'Ouch, chappal!'],
    near:  ['Bach gaya!', 'Phew!', 'Ek inch se!'],
    shield:['Kavach on!', 'Chai ka kavach!'],
    magnet:['Aa jao coins!'], mult:['Double dhamaka!'], boost:['Rocket mode!'], slow:['Slow-mo style!'],
    safe:  ['Phew, seth peeche reh gaya!']
  },
  chaserLines: ['Rukk, udhaar chukao!', 'Mera paisa!', 'Hisaab barabar karo!', 'Pakdo isko!', 'Ledger khul gaya!'],
  quips: [
    'Hisaab barabar! Seth ne pakad liya!',
    'Arre baap re! Ghar jaane ka time!',
    'Kismat ki ghanti baji!',
    'Bus bola: "Side de, bhai!"',
    'Chai thandi ho gayi!',
    'Traffic police: challan kat gaya!',
    'Pothole 1 - Gullu 0!',
    'Bas, aaj ke liye itna hi!'
  ],
  themes: {
    street: { skyTop: '#3ab0e8', skyBot: '#ffd9a8', sun: '#fff3b0', far: '#8fa3c9', far2: '#6f86b3', ground: '#6b6b78', side: '#c9b79c' },
    rail:   { skyTop: '#5b3f8f', skyBot: '#ff9f55', sun: '#ffe0a0', far: '#8a5a8c', far2: '#6a3f7a', ground: '#7a6f66', side: '#a89f94' }
  }
};

/* ---------- OBSTACLE DEFINITIONS (shape + collision classes) ---------- */
const ObsDefs = {
  bus:     { kind: 'solid', w: 92,  h: 128, len: 6 },
  auto:    { kind: 'solid', w: 68,  h: 84,  len: 2.4 },
  vendor:  { kind: 'solid', w: 92,  h: 112, len: 2 },
  scooter: { kind: 'low',   w: 46,  h: 56,  len: 1.4, clear: 60 },
  cone:    { kind: 'low',   w: 76,  h: 40,  len: 1,   clear: 44 },
  barrier: { kind: 'low',   w: 92,  h: 46,  len: 0.8, clear: 50 },
  cart:    { kind: 'low',   w: 90,  h: 60,  len: 2,   clear: 64 },
  pit:     { kind: 'pit',   w: 84,  h: 0,   len: 2.2, clear: 14 },
  over:    { kind: 'over',  w: 104, h: 104, len: 0.6 }
};

/* ---------- PERSPECTIVE VIEW ---------- */
const View = {
  W: 400, H: 700, CX: 200, HZ: 210, GY: 560, D0: 10,
  p(d) { return 1 / (1 + Math.max(d, -4.5) / this.D0); },
  X(lx, d) { return this.CX + lx * this.p(d); },
  Y(d, h) { const p = this.p(d); return this.HZ + (this.GY - this.HZ) * p - (h || 0) * p; }
};

/* ---------- small helpers ---------- */
const _sh = new Map();
function shade(hex, a) {
  const key = hex + a; let v = _sh.get(key); if (v) return v;
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = a < 0 ? 0 : 255, t = Math.abs(a);
  r = Math.round(r + (f - r) * t); g = Math.round(g + (f - g) * t); b = Math.round(b + (f - b) * t);
  v = 'rgb(' + r + ',' + g + ',' + b + ')'; _sh.set(key, v); return v;
}
function poly(c, pts, fill) {
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath(); c.fillStyle = fill; c.fill();
}
function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function lerp(a, b, t) { return a + (b - a) * t; }

/* 3D-ish box: returns front-face rect */
function box3d(c, lx, d1, len, w, h, lift, colF, colT, colS) {
  const d2 = d1 + len;
  const xl1 = View.X(lx - w / 2, d1), xr1 = View.X(lx + w / 2, d1), xl2 = View.X(lx - w / 2, d2), xr2 = View.X(lx + w / 2, d2);
  const yb1 = View.Y(d1, lift), yt1 = View.Y(d1, lift + h), yb2 = View.Y(d2, lift), yt2 = View.Y(d2, lift + h);
  if (len > 0.01) {
    if (lx < -1) poly(c, [xr1, yt1, xr2, yt2, xr2, yb2, xr1, yb1], colS);
    else if (lx > 1) poly(c, [xl1, yt1, xl2, yt2, xl2, yb2, xl1, yb1], colS);
    poly(c, [xl1, yt1, xr1, yt1, xr2, yt2, xl2, yt2], colT);
  }
  c.fillStyle = colF; c.fillRect(xl1, yt1, xr1 - xl1, yb1 - yt1);
  return { x: xl1, y: yt1, w: xr1 - xl1, h: yb1 - yt1, p: View.p(d1) };
}
function shadow(c, lx, d, len, w) {
  const p = View.p(d + len / 2);
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath();
  c.ellipse(View.X(lx, d + len / 2), View.Y(d + len / 2, 0), w * .55 * p, Math.max(2, 7 * p), 0, 0, 7); c.fill();
}
function txt(c, s, x, y, size, color, align) {
  if (size < 5) return;
  c.font = '900 ' + size + 'px "Trebuchet MS",sans-serif'; c.textAlign = align || 'center'; c.textBaseline = 'middle';
  c.fillStyle = color; c.fillText(s, x, y);
}

/* =====================================================================
   HERO  (Gullu)  -- front-facing cartoon, glancing back at the player
   ===================================================================== */
function drawHero(c, x, y, s, o) {
  if (Assets.heroSprite && Assets.heroSprite.complete && Assets.heroSprite.naturalWidth) {
    const im = Assets.heroSprite, hh = 140 * s, ww = hh * im.naturalWidth / im.naturalHeight;
    c.drawImage(im, x - ww / 2, y - hh, ww, hh); return;
  }
  const co = o.costume, t = o.t, pose = o.pose, skin = '#d99a63', skinD = '#b97a45';
  const bob = pose === 'run' ? Math.abs(Math.sin(t)) * 4 : 0;
  c.save(); c.translate(x, y); c.scale(s, s);
  if (pose === 'slide') { c.scale(1.2, 0.58); }
  if (pose === 'hit') { c.rotate(0.28 * Math.sin(t * 3)); }
  if (pose === 'jump') { c.scale(0.96, 1.06); }
  // legs
  for (let i = -1; i <= 1; i += 2) {
    let a = pose === 'run' ? Math.sin(t + (i > 0 ? 0 : Math.PI)) * 0.85 : pose === 'jump' ? (i > 0 ? 0.75 : -0.45) : pose === 'slide' ? i * 0.5 : i * 0.12;
    const fx = i * 7 + Math.sin(a) * 28, fy = -5 - Math.max(0, Math.sin(a)) * 12;
    c.strokeStyle = co.pants; c.lineWidth = 13; c.lineCap = 'round';
    c.beginPath(); c.moveTo(i * 6, -50); c.lineTo(fx, fy - 4); c.stroke();
    c.fillStyle = co.shoe; c.beginPath(); c.ellipse(fx + 3, fy, 10, 5.5, 0, 0, 7); c.fill();
  }
  // back arm (behind torso)
  const arm = (i) => {
    let b = pose === 'run' ? -Math.sin(t + (i > 0 ? 0 : Math.PI)) * 0.9 : 0;
    let hx = i * 15 + Math.sin(b) * 22 + i * 4, hy = -90 + 24 * Math.cos(b);
    if (pose === 'jump') { hx = i * 26; hy = -122; }
    if (pose === 'hit') { hx = i * 30; hy = -100 + Math.sin(t * 6) * 6; }
    c.strokeStyle = co.shirt; c.lineWidth = 10; c.beginPath(); c.moveTo(i * 15, -90); c.lineTo(hx, hy); c.stroke();
    c.fillStyle = skin; c.beginPath(); c.arc(hx, hy, 5.5, 0, 7); c.fill();
  };
  arm(-1);
  // torso (kurta)
  c.fillStyle = co.shirt; c.beginPath();
  c.moveTo(-16, -96 - bob * .3); c.quadraticCurveTo(0, -102, 16, -96 - bob * .3);
  c.lineTo(20, -40); c.quadraticCurveTo(0, -35, -20, -40); c.closePath(); c.fill();
  c.fillStyle = shade(co.shirt, -.18); c.fillRect(-20, -45, 40, 5);
  if (co.deco === 'kurta') { c.strokeStyle = co.trim; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -96); c.lineTo(0, -42); c.stroke(); c.fillStyle = co.trim; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(0, -86 + k * 14, 2, 0, 7); c.fill(); } }
  if (co.deco === 'jersey') { c.fillStyle = co.trim; c.fillRect(-20, -62, 40, 5); txt(c, '7', 0, -78, 22, co.trim); }
  if (co.deco === 'sequin') { for (let k = 0; k < 14; k++) { c.fillStyle = k % 2 ? co.trim : '#fff'; c.beginPath(); c.arc(-12 + (k * 7) % 26, -90 + ((k * 11) % 40), 2, 0, 7); c.fill(); } }
  if (co.deco === 'apron') { c.fillStyle = '#f8fafc'; c.fillRect(-12, -78, 24, 36); c.fillStyle = co.trim; c.fillRect(-12, -78, 24, 5); }
  if (co.deco === 'badge') { c.fillStyle = co.trim; c.beginPath(); c.arc(8, -80, 6, 0, 7); c.fill(); txt(c, '7', 8, -80, 8, '#7f1d1d'); }
  arm(1);
  if (co.acc === 'towel') { c.fillStyle = '#f8fafc'; c.fillRect(-18, -98 - bob * .3, 12, 22); c.fillStyle = '#ef4444'; c.fillRect(-18, -88, 12, 3); }
  // head
  const hy = -114 - bob;
  c.fillStyle = skinD; c.beginPath(); c.arc(-20, hy + 2, 5.5, 0, 7); c.arc(20, hy + 2, 5.5, 0, 7); c.fill();
  c.fillStyle = skin; c.beginPath(); c.ellipse(0, hy, 20, 21, 0, 0, 7); c.fill();
  // hair (big comedic quiff)
  c.fillStyle = co.hair; c.beginPath();
  const hp = [[-20,-4],[-24,-18],[-14,-30],[-9,-22],[-2,-40],[6,-26],[16,-34],[17,-22],[24,-16],[20,-4],[14,-12],[0,-16],[-14,-12]];
  c.moveTo(hp[0][0], hy + hp[0][1]);
  for (let k = 1; k < hp.length; k++) c.lineTo(hp[k][0], hy + hp[k][1]);
  c.closePath(); c.fill();
  // accessories on head
  if (co.acc === 'cap') { c.fillStyle = co.shirt; c.beginPath(); c.arc(0, hy - 8, 20, Math.PI, 0); c.fill(); c.fillRect(-6, hy - 12, 34, 5); c.fillStyle = '#fff'; c.fillRect(-2, hy - 27, 4, 8); }
  if (co.acc === 'topi') { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-19, hy - 8); c.lineTo(-15, hy - 28); c.lineTo(15, hy - 28); c.lineTo(19, hy - 8); c.closePath(); c.fill(); c.strokeStyle = '#cbd5e1'; c.lineWidth = 1.5; c.stroke(); }
  if (co.acc === 'turban') { c.fillStyle = '#f59e0b'; c.beginPath(); c.ellipse(0, hy - 14, 22, 14, 0, 0, 7); c.fill(); c.strokeStyle = '#b45309'; c.lineWidth = 2; c.beginPath(); c.arc(0, hy - 14, 14, 0.2, 2.9); c.stroke(); }
  // eyes
  const ex = (o.look || 0) * 2.2, ex0 = -7.5, ex1 = 7.5, ey = hy - 1;
  if (co.acc === 'shades') {
    c.fillStyle = '#0f172a'; c.fillRect(-16, ey - 6, 14, 10); c.fillRect(2, ey - 6, 14, 10); c.fillRect(-3, ey - 4, 6, 2);
    c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(-14, ey - 5, 4, 2); c.fillRect(4, ey - 5, 4, 2);
  } else if (o.blink || o.expr === 'dizzy') {
    c.strokeStyle = '#2b1b12'; c.lineWidth = 2.5; c.beginPath();
    if (o.expr === 'dizzy') { for (const e of [ex0, ex1]) { c.moveTo(e - 4, ey - 4); c.lineTo(e + 4, ey + 4); c.moveTo(e + 4, ey - 4); c.lineTo(e - 4, ey + 4); } }
    else { c.moveTo(ex0 - 5, ey); c.lineTo(ex0 + 5, ey); c.moveTo(ex1 - 5, ey); c.lineTo(ex1 + 5, ey); }
    c.stroke();
  } else {
    const big = o.expr === 'scared' ? 8 : 6.5;
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex0, ey, big, big + 1.5, 0, 0, 7); c.ellipse(ex1, ey, big, big + 1.5, 0, 0, 7); c.fill();
    c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(ex0 + ex, ey + 1, 3, 0, 7); c.arc(ex1 + ex, ey + 1, 3, 0, 7); c.fill();
  }
  // brows
  c.strokeStyle = co.hair; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath();
  const bw = o.expr === 'scared' ? -7 : o.expr === 'happy' ? -3 : 1;
  c.moveTo(-13, ey - 9 + bw); c.lineTo(-3, ey - 9 - (o.expr === 'scared' ? -3 : 1));
  c.moveTo(13, ey - 9 + bw); c.lineTo(3, ey - 9 - (o.expr === 'scared' ? -3 : 1)); c.stroke();
  // nose + moustache
  c.fillStyle = skinD; c.beginPath(); c.arc(0, hy + 5, 4.5, 0, 7); c.fill();
  c.fillStyle = co.hair; c.beginPath(); c.moveTo(0, hy + 8); c.quadraticCurveTo(-9, hy + 6, -15, hy + 12); c.quadraticCurveTo(-8, hy + 12, 0, hy + 11);
  c.quadraticCurveTo(8, hy + 12, 15, hy + 12); c.quadraticCurveTo(9, hy + 6, 0, hy + 8); c.fill();
  // mouth
  c.fillStyle = '#7f1d1d';
  if (o.expr === 'scared' || o.expr === 'dizzy') { c.beginPath(); c.ellipse(0, hy + 16, 5, 6 + Math.sin(t * 8) * 1.2, 0, 0, 7); c.fill(); }
  else if (o.expr === 'happy') { c.beginPath(); c.arc(0, hy + 13, 8, 0, Math.PI); c.fill(); c.fillStyle = '#fff'; c.fillRect(-5, hy + 13, 10, 2.5); }
  else { c.strokeStyle = '#7f1d1d'; c.lineWidth = 2; c.beginPath(); c.arc(0, hy + 14, 5, 0.2, Math.PI - 0.2); c.stroke(); }
  if (o.expr === 'dizzy') { for (let k = 0; k < 3; k++) { const a = t * 5 + k * 2.1; star(c, Math.cos(a) * 24, hy - 28 + Math.sin(a) * 6, 5, '#ffd23f'); } }
  c.restore();
}
function hp0(a) { return a[0][0]; }
function star(c, x, y, r, col) {
  c.fillStyle = col; c.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * .45 : r, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}

/* =====================================================================
   CHASER  (Seth Motilal) -- round money-lender with a ledger
   ===================================================================== */
function drawChaser(c, x, y, s, t, mood) {
  if (Assets.chaserSprite && Assets.chaserSprite.complete && Assets.chaserSprite.naturalWidth) {
    const im = Assets.chaserSprite, hh = 150 * s, ww = hh * im.naturalWidth / im.naturalHeight; c.drawImage(im, x - ww / 2, y - hh, ww, hh); return;
  }
  c.save(); c.translate(x, y); c.scale(s, s);
  const bob = Math.abs(Math.sin(t * 1.3)) * 5;
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 2, 34, 8, 0, 0, 7); c.fill();
  for (let i = -1; i <= 1; i += 2) { const a = Math.sin(t * 1.3 + (i > 0 ? 0 : Math.PI)) * 12; c.fillStyle = '#f8fafc'; c.fillRect(i * 12 - 7 + a * .2, -34, 14, 30); c.fillStyle = '#7c2d12'; c.beginPath(); c.ellipse(i * 12 + a, -3, 11, 6, 0, 0, 7); c.fill(); }
  c.fillStyle = '#fef3c7'; c.beginPath(); c.ellipse(0, -62 - bob * .5, 34, 36, 0, 0, 7); c.fill();
  c.strokeStyle = '#d6b66b'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -96); c.lineTo(0, -30); c.stroke();
  // arms: ledger-waving
  c.strokeStyle = '#fef3c7'; c.lineWidth = 11; c.lineCap = 'round';
  const w = Math.sin(t * 4) * 14;
  c.beginPath(); c.moveTo(-30, -82); c.lineTo(-44, -60 + w * .4); c.stroke();
  c.beginPath(); c.moveTo(30, -82); c.lineTo(46, -118 + w); c.stroke();
  c.fillStyle = '#b91c1c'; c.fillRect(34, -150 + w, 26, 32); c.fillStyle = '#fde68a'; c.fillRect(36, -148 + w, 22, 5);
  txt(c, '₹', 47, -132 + w, 14, '#fde68a');
  // head
  const hy = -112 - bob;
  c.fillStyle = '#c98a55'; c.beginPath(); c.arc(0, hy, 22, 0, 7); c.fill();
  c.fillStyle = '#f97316'; c.beginPath(); c.ellipse(0, hy - 16, 25, 15, 0, 0, 7); c.fill();
  c.strokeStyle = '#c2410c'; c.lineWidth = 2; c.beginPath(); c.arc(0, hy - 16, 15, 0.3, 2.8); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-8, hy - 2, 6, 7, 0, 0, 7); c.ellipse(8, hy - 2, 6, 7, 0, 0, 7); c.fill();
  c.fillStyle = '#111'; c.beginPath(); c.arc(-8, hy - 1, 2.8, 0, 7); c.arc(8, hy - 1, 2.8, 0, 7); c.fill();
  c.strokeStyle = '#1a1a1a'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-15, hy - 12); c.lineTo(-3, hy - 7); c.moveTo(15, hy - 12); c.lineTo(3, hy - 7); c.stroke();
  // grand curly moustache
  c.fillStyle = '#1a1a1a'; c.beginPath(); c.moveTo(0, hy + 6); c.quadraticCurveTo(-14, hy + 2, -22, hy + 14); c.quadraticCurveTo(-24, hy + 20, -18, hy + 17);
  c.quadraticCurveTo(-8, hy + 13, 0, hy + 13); c.quadraticCurveTo(8, hy + 13, 18, hy + 17); c.quadraticCurveTo(24, hy + 20, 22, hy + 14); c.quadraticCurveTo(14, hy + 2, 0, hy + 6); c.fill();
  c.fillStyle = '#7f1d1d'; c.beginPath(); c.ellipse(0, hy + 20, 7, 4 + Math.abs(Math.sin(t * 5)) * 3, 0, 0, 7); c.fill();
  c.restore();
}

/* =====================================================================
   OBSTACLES
   ===================================================================== */
const BUS_RED = '#d62828';
function drawObstacle(c, o, t) {
  const def = ObsDefs[o.type], lx = [-110, 0, 110][o.lane], d = o.d, len = def.len;
  if (d + len < -4.4 || d > 80) return;
  const p = View.p(d);
  if (o.type !== 'over') shadow(c, lx, d, len, def.w);
  let f;
  switch (o.type) {
    case 'bus': {
      f = box3d(c, lx, d, len, def.w, def.h, 12, BUS_RED, '#ef6b6b', '#a01919');
      const { x, y, w, h } = f;
      c.fillStyle = '#bfe9ff'; c.fillRect(x + w * .07, y + h * .12, w * .86, h * .3);
      c.fillStyle = BUS_RED; for (let i = 1; i < 4; i++) c.fillRect(x + w * (.07 + .86 * i / 4) - w * .012, y + h * .12, w * .024, h * .3);
      c.fillStyle = '#111'; c.fillRect(x + w * .28, y + h * .02, w * .44, h * .075); txt(c, '332 CST', x + w / 2, y + h * .058, h * .06, '#ffd23f');
      c.fillStyle = '#f5f5f5'; c.fillRect(x, y + h * .52, w, h * .06);
      c.fillStyle = '#fff'; c.fillRect(x + w * .36, y + h * .63, w * .28, h * .12); txt(c, 'MH 01', x + w / 2, y + h * .69, h * .06, '#222');
      c.fillStyle = '#ff2'; c.fillRect(x + w * .06, y + h * .8, w * .1, h * .06); c.fillRect(x + w * .84, y + h * .8, w * .1, h * .06);
      c.fillStyle = '#111'; c.fillRect(x + w * .04, y + h * .9, w * .2, h * .1); c.fillRect(x + w * .76, y + h * .9, w * .2, h * .1);
      txt(c, 'CITY BUS', x + w / 2, y + h * .5, h * .06, '#fff');
      break;
    }
    case 'auto': {
      const wob = Math.sin(t * 9 + o.seed) * 1.2 * p;
      f = box3d(c, lx, d, len, def.w, def.h, 8, '#fbbf24', '#171717', '#b8860b');
      const { x, y, w, h } = f; c.fillStyle = '#171717'; c.fillRect(x, y, w, h * .5);
      c.fillStyle = '#374151'; c.fillRect(x + w * .14 + wob, y + h * .12, w * .72, h * .26);
      c.fillStyle = '#ef4444'; c.fillRect(x + w * .08, y + h * .6, w * .12, h * .1); c.fillRect(x + w * .8, y + h * .6, w * .12, h * .1);
      c.fillStyle = '#fff'; c.fillRect(x + w * .36, y + h * .66, w * .28, h * .12); txt(c, 'AUTO', x + w / 2, y + h * .31, h * .1, '#fbbf24');
      c.fillStyle = '#111'; c.fillRect(x + w * .1, y + h * .88, w * .18, h * .12); c.fillRect(x + w * .72, y + h * .88, w * .18, h * .12);
      break;
    }
    case 'vendor': {
      f = box3d(c, lx, d, len, def.w, def.h * .62, 0, '#92400e', '#c97a3a', '#6b2f0a');
      const { x, y, w, h } = f; const ph = def.h * .38 * p;
      // striped umbrella / awning
      const top = y - ph; for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#fff' : (o.v ? '#ec4899' : '#22c55e'); c.fillRect(x - w * .08 + i * w * 1.16 / 6, top, w * 1.16 / 6 + .5, ph); }
      c.fillStyle = '#7c2d12'; c.fillRect(x + w * .05, y - ph * .1, w * .06, ph * .1);
      const cols = ['#ef4444', '#facc15', '#f97316', '#84cc16']; for (let i = 0; i < 6; i++) { c.fillStyle = cols[(i + o.v) % 4]; c.beginPath(); c.arc(x + w * (.12 + i * .15), y + h * .22, w * .06, 0, 7); c.fill(); }
      txt(c, 'FRESH', x + w / 2, y + h * .65, h * .18, '#fde68a'); c.fillStyle = '#111'; c.fillRect(x + w * .08, y + h * .88, w * .16, h * .12); c.fillRect(x + w * .76, y + h * .88, w * .16, h * .12);
      break;
    }
    case 'scooter': {
      const col = ['#ef476f', '#06b6d4', '#8b5cf6', '#22c55e'][o.v % 4];
      f = box3d(c, lx, d, len, def.w, def.h, 0, col, shade(col, .25), shade(col, -.3));
      const { x, y, w, h } = f;
      c.fillStyle = '#111'; c.fillRect(x + w * .3, y + h * .55, w * .4, h * .45);
      c.fillStyle = '#111'; c.fillRect(x + w * .1, y + h * .05, w * .8, h * .12);
      if (o.v % 2) { c.fillStyle = '#fbbf24'; c.beginPath(); c.arc(x + w / 2, y - h * .05, w * .22, Math.PI, 0); c.fill(); }
      c.fillStyle = '#ff3b3b'; c.fillRect(x + w * .4, y + h * .3, w * .2, h * .12);
      break;
    }
    case 'cone': {
      for (let i = -1; i <= 1; i++) {
        const cx = View.X(lx + i * 24, d), by = View.Y(d, 0), cw = 16 * p, ch = 38 * p;
        poly(c, [cx - cw, by, cx + cw, by, cx + cw * .25, by - ch, cx - cw * .25, by - ch], '#ff7a00');
        poly(c, [cx - cw * .7, by - ch * .35, cx + cw * .7, by - ch * .35, cx + cw * .5, by - ch * .6, cx - cw * .5, by - ch * .6], '#fff');
        c.fillStyle = '#e65100'; c.fillRect(cx - cw * 1.2, by - 3 * p, cw * 2.4, 4 * p);
      }
      break;
    }
    case 'barrier': {
      const x1 = View.X(lx - def.w / 2, d), x2 = View.X(lx + def.w / 2, d), yb = View.Y(d, 0), yh = View.Y(d, def.h), th = 16 * p;
      c.fillStyle = '#6b7280'; c.fillRect(x1, yh, 5 * p, yb - yh); c.fillRect(x2 - 5 * p, yh, 5 * p, yb - yh);
      for (let k = 0; k < 2; k++) {
        const yy = yh + k * th * 1.4; const n = 6, bw = (x2 - x1) / n;
        for (let i = 0; i < n; i++) { c.fillStyle = i % 2 ? '#fff' : '#ef4444'; c.fillRect(x1 + i * bw, yy, bw + .5, th); }
      }
      break;
    }
    case 'cart': {
      f = box3d(c, lx, d, len, def.w, def.h * .55, 10, '#a16207', '#d4a24a', '#6b4510');
      const { x, y, w, h } = f; c.fillStyle = '#facc15';
      for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(x + w * (.1 + i * .13), y - h * .08 + (i % 2) * h * .08, w * .07, 0, 7); c.fill(); }
      c.fillStyle = '#111'; c.beginPath(); c.arc(x + w * .12, y + h * 1.08, w * .1, 0, 7); c.arc(x + w * .88, y + h * 1.08, w * .1, 0, 7); c.fill();
      txt(c, 'KELA', x + w / 2, y + h * .5, h * .35, '#fde68a');
      break;
    }
    case 'pit': {
      const x = View.X(lx, d + len / 2), y = View.Y(d + len / 2, 0), pp = View.p(d + len / 2);
      c.fillStyle = '#26262c'; c.beginPath(); c.ellipse(x, y, def.w * .5 * pp, 13 * pp, 0, 0, 7); c.fill();
      c.fillStyle = '#4b5563'; c.beginPath(); c.ellipse(x, y - 1 * pp, def.w * .42 * pp, 9 * pp, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(96,165,250,.5)'; c.beginPath(); c.ellipse(x, y, def.w * .3 * pp, 5 * pp, 0, 0, 7); c.fill();
      break;
    }
    case 'over': {
      const x1 = View.X(lx - def.w / 2, d), x2 = View.X(lx + def.w / 2, d), yb = View.Y(d, 0), ytop = View.Y(d, 104), ybeam = View.Y(d, 62);
      c.fillStyle = '#6b7280'; c.fillRect(x1, ytop, 6 * p, yb - ytop); c.fillRect(x2 - 6 * p, ytop, 6 * p, yb - ytop);
      const n = 8, bw = (x2 - x1) / n; for (let i = 0; i < n; i++) { c.fillStyle = i % 2 ? '#fff' : '#ff7a00'; c.fillRect(x1 + i * bw, ytop, bw + .5, ybeam - ytop); }
      c.fillStyle = '#111'; c.fillRect(x1, ytop, x2 - x1, 3 * p); c.fillRect(x1, ybeam - 3 * p, x2 - x1, 3 * p);
      txt(c, 'KAAM CHALU', (x1 + x2) / 2, (ytop + ybeam) / 2, 11 * p, '#111');
      // warning lamp
      if (Math.sin(t * 8) > 0) { c.fillStyle = '#fde047'; c.beginPath(); c.arc((x1 + x2) / 2, ytop - 6 * p, 5 * p, 0, 7); c.fill(); }
      break;
    }
  }
}

/* =====================================================================
   COLLECTIBLES
   ===================================================================== */
const PowerInfo = {
  mag:    { color: '#ef4444', label: 'M',  name: 'Magnet' },
  shield: { color: '#06b6d4', label: 'S',  name: 'Shield' },
  mult:   { color: '#22c55e', label: '×2', name: 'Coin ×2' },
  boost:  { color: '#f97316', label: 'Z',  name: 'Zoom' },
  slow:   { color: '#a855f7', label: 'SL', name: 'Slow-mo' }
};
function drawCoin(c, lx, d, h, t, seed, token) {
  const p = View.p(d), x = View.X(lx, d), y = View.Y(d, h);
  const r = (token ? 17 : 12) * p, sx = Math.max(.25, Math.abs(Math.cos(t * 5 + seed)));
  if (r < 1.5) return;
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x, View.Y(d, 0), r * .8, r * .25, 0, 0, 7); c.fill();
  c.fillStyle = token ? '#ffb703' : '#ffc300'; c.strokeStyle = token ? '#9a3412' : '#b45309'; c.lineWidth = Math.max(1, 2 * p);
  c.beginPath(); c.ellipse(x, y, r * sx, r, 0, 0, 7); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x - r * sx * .3, y - r * .3, r * sx * .25, r * .3, 0, 0, 7); c.fill();
  if (r > 9) txt(c, token ? '100' : '₹', x, y + 1, r * (token ? .75 : 1.1), '#92400e');
}
function drawPickup(c, lx, d, type, t) {
  const p = View.p(d), info = PowerInfo[type], bobY = Math.sin(t * 4) * 6, x = View.X(lx, d), y = View.Y(d, 62 + bobY), r = 21 * p;
  if (r < 2) return;
  const g = c.createRadialGradient(x, y, r * .2, x, y, r * 2); g.addColorStop(0, info.color + 'cc'); g.addColorStop(1, info.color + '00');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2, 0, 7); c.fill();
  c.fillStyle = info.color; c.strokeStyle = '#fff'; c.lineWidth = 3 * p; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.stroke();
  txt(c, info.label, x, y + 1, r * (info.label.length > 1 ? .95 : 1.3), '#fff');
  const sx = x + Math.cos(t * 3) * r * 1.3, sy = y + Math.sin(t * 3) * r * 1.3; star(c, sx, sy, r * .3, '#fff');
}

/* =====================================================================
   WORLD SCENERY
   ===================================================================== */
const BLD_COLS = ['#ff8fab', '#4cc9f0', '#ffd166', '#f78c6b', '#b79ced', '#7bd389', '#ffadad', '#8ecae6'];
const SHOPS = ['CHAI', 'PAAN', 'SWEETS', 'TAILOR', 'CHEMIST', 'MOBILES', 'JUICE', 'STORES', 'VADA PAV', 'BAKERY'];
const bldCache = new Map();
function bldStyle(k, side, theme) {
  const key = k * 4 + (side > 0 ? 1 : 0) + (theme === 'rail' ? 2 : 0);
  let v = bldCache.get(key); if (v) return v;
  const r = mulberry32(key * 7919 + 13);
  v = { h: 150 + r() * 200, col: BLD_COLS[Math.floor(r() * BLD_COLS.length)], floors: 3 + Math.floor(r() * 3), shop: SHOPS[Math.floor(r() * SHOPS.length)],
        awn: BLD_COLS[Math.floor(r() * BLD_COLS.length)], lit: r(), cloth: Math.floor(r() * 3), chai: r() < .16 };
  if (theme === 'rail' && side < 0) { v.h = 40; v.col = '#a8a29e'; } // fence only on the rail side
  if (theme === 'rail' && side > 0) { v.h = 90 + r() * 70; v.col = ['#cbd5e1', '#d6c7a1', '#bfc9d6'][Math.floor(r() * 3)]; }
  if (bldCache.size > 300) bldCache.clear();
  bldCache.set(key, v); return v;
}
const SEG = 12;
function bilerp(a, b, c2, d2, u, v) { // a=bottom-near b=bottom-far c2=top-near d2=top-far
  const bx = lerp(a[0], b[0], u), by = lerp(a[1], b[1], u), tx = lerp(c2[0], d2[0], u), ty = lerp(c2[1], d2[1], u);
  return [lerp(bx, tx, v), lerp(by, ty, v)];
}
function drawBuilding(c, k, side, dA, theme, t) {
  const st = bldStyle(k, side, theme), dB = dA + SEG; if (dB < -4.4) return;
  const EX = 214 * side, depth = 140 * side, H = st.h;
  const a = [View.X(EX, dA), View.Y(dA, 0)], b = [View.X(EX, dB), View.Y(dB, 0)];
  const ca = [a[0], View.Y(dA, H)], cb = [b[0], View.Y(dB, H)];
  const p = View.p(dA);
  // end face (visible when nearer building taller)
  poly(c, [View.X(EX, dA), View.Y(dA, 0), View.X(EX + depth, dA), View.Y(dA, 0), View.X(EX + depth, dA), View.Y(dA, H), View.X(EX, dA), View.Y(dA, H)], shade(st.col, -.35));
  // main wall
  poly(c, [a[0], a[1], b[0], b[1], cb[0], cb[1], ca[0], ca[1]], st.col);
  poly(c, [ca[0], ca[1], cb[0], cb[1], cb[0], cb[1] - 6 * View.p(dB), ca[0], ca[1] - 6 * p], shade(st.col, -.3)); // parapet
  if (p < .16) return;
  const rail = theme === 'rail' && side < 0;
  if (rail) { // low concrete fence with posts
    for (let i = 0; i < 4; i++) { const q = bilerp(a, b, ca, cb, i / 4 + .03, .2); c.fillStyle = '#9ca3af'; c.fillRect(q[0] - 2 * p, q[1] - 14 * p, 4 * p, 18 * p); }
    return;
  }
  // ground-floor shop: awning + sign
  const shopH = .28;
  const s0 = bilerp(a, b, ca, cb, .08, 0), s1 = bilerp(a, b, ca, cb, .92, 0), s2 = bilerp(a, b, ca, cb, .92, shopH * (H > 0 ? 1 : 0)), s3 = bilerp(a, b, ca, cb, .08, shopH);
  const shopTop = Math.min(H * shopH, 70);
  const q0 = bilerp(a, b, ca, cb, .08, shopTop / H), q1 = bilerp(a, b, ca, cb, .92, shopTop / H);
  poly(c, [s0[0], s0[1], s1[0], s1[1], q1[0], q1[1], q0[0], q0[1]], '#2d2a3a');
  // awning stripes
  const aw0 = bilerp(a, b, ca, cb, .05, (shopTop + 14) / H), aw1 = bilerp(a, b, ca, cb, .95, (shopTop + 14) / H);
  const ns = 6; for (let i = 0; i < ns; i++) {
    const u0 = .05 + .9 * i / ns, u1 = .05 + .9 * (i + 1) / ns;
    const A = bilerp(a, b, ca, cb, u0, shopTop / H), B = bilerp(a, b, ca, cb, u1, shopTop / H), C = bilerp(a, b, ca, cb, u1, (shopTop + 14) / H), D = bilerp(a, b, ca, cb, u0, (shopTop + 14) / H);
    poly(c, [A[0], A[1], B[0], B[1], C[0], C[1], D[0], D[1]], i % 2 ? '#fff' : st.awn);
  }
  if (p > .42) { const sc = bilerp(a, b, ca, cb, .5, (shopTop + 26) / H); c.fillStyle = '#111'; const sw = 56 * p; c.fillRect(sc[0] - sw / 2, sc[1] - 7 * p, sw, 13 * p); txt(c, theme === 'rail' ? 'LOCAL' : st.shop, sc[0], sc[1], 9 * p, '#ffd23f'); }
  // windows
  const f0 = (shopTop + 40) / H, rows = st.floors, step = (1 - f0 - .06) / rows;
  for (let r = 0; r < rows; r++) for (let col = 0; col < 3; col++) {
    const u = .18 + col * .28, v = f0 + r * step + step * .1;
    const w0 = bilerp(a, b, ca, cb, u, v), w1 = bilerp(a, b, ca, cb, u + .14, v), w2 = bilerp(a, b, ca, cb, u + .14, v + step * .62), w3 = bilerp(a, b, ca, cb, u, v + step * .62);
    const lit = ((k * 7 + r * 3 + col) % 5) < 2;
    poly(c, [w0[0], w0[1], w1[0], w1[1], w2[0], w2[1], w3[0], w3[1]], lit ? '#ffe9a8' : '#33415c');
    if (p > .3) { const bk = bilerp(a, b, ca, cb, u + .07, v + step * .05); c.fillStyle = shade(st.col, -.4); c.fillRect(bk[0] - 9 * p, bk[1] - 2 * p, 18 * p, 3 * p); if ((r + col + st.cloth) % 4 === 0) { c.fillStyle = ['#ef4444', '#facc15', '#3b82f6'][st.cloth]; c.fillRect(bk[0] - 4 * p, bk[1] + 1 * p, 8 * p, 9 * p); } }
  }
}
function drawChaiStall(c, side, d) {
  const lx = 192 * side, w = 52, h = 66, len = 3.2; if (d + len < -4.4) return;
  shadow(c, lx, d, len, w);
  const f = box3d(c, lx, d, len, w, h, 0, '#7c4a1d', '#c98a4b', '#5a3414'); const p = View.p(d);
  const top = f.y - 16 * p; for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#fff' : '#dc2626'; c.fillRect(f.x - 3 * p + i * (f.w + 6 * p) / 6, top, (f.w + 6 * p) / 6 + .5, 18 * p); }
  txt(c, 'CHAI', f.x + f.w / 2, f.y + f.h * .35, 11 * p, '#fde68a');
  c.fillStyle = '#d4d4d8'; c.fillRect(f.x + f.w * .2, f.y + f.h * .52, f.w * .25, f.h * .2); c.fillStyle = '#f97316'; c.fillRect(f.x + f.w * .6, f.y + f.h * .5, f.w * .12, f.h * .22);
}
function drawPole(c, side, d) {
  const lx = 186 * side, p = View.p(d); if (p < .1 || d < -4.4) return;
  const x = View.X(lx, d), yb = View.Y(d, 0), yt = View.Y(d, 235), ax = View.X(lx - 38 * side, d);
  c.strokeStyle = '#3f3f46'; c.lineWidth = 5 * p; c.beginPath(); c.moveTo(x, yb); c.lineTo(x, yt); c.lineTo(ax, yt - 6 * p); c.stroke();
  c.fillStyle = '#fff3b0'; c.beginPath(); c.ellipse(ax, yt - 4 * p, 8 * p, 4 * p, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,243,176,.22)'; c.beginPath(); c.ellipse(ax, yt + 4 * p, 18 * p, 8 * p, 0, 0, 7); c.fill();
}
function wire(c, x1, y1, x2, y2, sag, w) { c.strokeStyle = 'rgba(30,30,40,.8)'; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + sag, x2, y2); c.stroke(); }
function drawWires(c, d, dNext, idx) {
  const pa = View.p(d), pb = View.p(dNext); if (pa < .1) return;
  for (const side of [-1, 1]) {
    const xa = View.X(186 * side, d), ya = View.Y(d, 235), xb = View.X(186 * side, dNext), yb = View.Y(dNext, 235);
    wire(c, xa, ya, xb, yb, 6 * pa, Math.max(1, 1.3 * pa)); wire(c, xa, ya + 7 * pa, xb, yb + 7 * pb, 6 * pa, Math.max(1, 1.1 * pa));
  }
  if (idx % 3 === 0 && d > -3) { // festive toran bunting across the road
    const xa = View.X(-186, d), xb = View.X(186, d), y0 = View.Y(d, 215), sag = 22 * pa;
    wire(c, xa, y0, xb, y0, sag, Math.max(1, 1.4 * pa));
    const cols = ['#ff9f1c', '#ff3d7f', '#14b8a6', '#fde047'];
    for (let i = 1; i < 14; i++) {
      const u = i / 14, bx = lerp(xa, xb, u), by = y0 + sag * 2 * u * (1 - u) * .5 + 0; c.fillStyle = cols[i % 4];
      c.beginPath(); c.moveTo(bx - 5 * pa, by); c.lineTo(bx + 5 * pa, by); c.lineTo(bx, by + 12 * pa); c.fill();
    }
  }
}
/* railway theme: tracks, sleepers, masts, a passing local train */
function drawRailSide(c, dist, t) {
  for (let k = 0; k < 20; k++) {
    const d = k * 4 - (dist % 4); if (d < -4) continue;
    const y1 = View.Y(d, 0), y2 = View.Y(d + 2, 0);
    poly(c, [View.X(-330, d), y1, View.X(-250, d), y1, View.X(-250, d + 2), y2, View.X(-330, d + 2), y2], '#5b4636');
  }
  for (const lx of [-312, -268]) {
    c.strokeStyle = '#d1d5db'; c.lineWidth = 3; c.beginPath(); c.moveTo(View.X(lx, -4), View.Y(-4, 0)); c.lineTo(View.X(lx, FAR_D), View.Y(FAR_D, 0)); c.stroke();
  }
  for (let k = 0; k < 6; k++) {
    const d = k * 16 - (dist % 16); if (d < -4) continue; const p = View.p(d), x = View.X(-345, d), yb = View.Y(d, 0), yt = View.Y(d, 250);
    c.strokeStyle = '#4b5563'; c.lineWidth = 4 * p; c.beginPath(); c.moveTo(x, yb); c.lineTo(x, yt); c.moveTo(x - 24 * p, yt + 10 * p); c.lineTo(x + 40 * p, yt + 10 * p); c.stroke();
  }
  // passing train (relative motion)
  const off = ((t * 9) % 120); const d0 = 140 - off * 1.4 - 30;
  const len = 48, d1 = d0; if (d1 + len > -4 && d1 < FAR_D) {
    const lx = -290, yb1 = View.Y(d1, 0), yt1 = View.Y(d1, 90), yb2 = View.Y(d1 + len, 0), yt2 = View.Y(d1 + len, 90), x1 = View.X(lx + 38, d1), x2 = View.X(lx + 38, d1 + len);
    poly(c, [x1, yt1, x2, yt2, x2, yb2, x1, yb1], '#2563eb');
    for (let i = 0; i < 12; i++) { const u = i / 12 + .02; const A = [lerp(x1, x2, u), lerp(yb1, yb2, u)], T = [lerp(x1, x2, u), lerp(yt1, yt2, u)], B = [lerp(x1, x2, u + .05), lerp(yb1, yb2, u + .05)], T2 = [lerp(x1, x2, u + .05), lerp(yt1, yt2, u + .05)];
      const m = (pt, pb, v) => [pt[0], lerp(pb[1], pt[1], v)];
      const w0 = m(T, A, .35), w1 = m(T, A, .8); const w2 = [T2[0], lerp(B[1], T2[1], .8)], w3 = [T2[0], lerp(B[1], T2[1], .35)];
      poly(c, [w1[0], w1[1], w2[0], w2[1], w3[0], w3[1], w0[0], w0[1]], '#fde68a'); }
  }
}
const FAR_D = 72;
