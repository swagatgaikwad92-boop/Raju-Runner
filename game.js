'use strict';
/* =====================================================================
   game.js -- game logic, rendering orchestration, UI, progression, saves
   (visuals live in art.js, sound in audio.js)
   ===================================================================== */
(() => {
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d', { alpha: false });
const LANES = [-110, 0, 110], LANE_W = 110;
const BASE = 14, MAXS = 30, GRAV = 2400, JV = 800, SLIDE_T = 0.6, CHASE_T = 10;
const PDUR = { mag: 8, shield: 12, mult: 10, boost: 5, slow: 6 };

/* ---------------- SAVE SYSTEM ---------------- */
const SAVE_KEY = 'mumbaiMayhemRunner.v1';
const defSave = () => ({ coins: 0, best: 0, bestDist: 0, tCoins: 0, tDist: 0, tJumps: 0, tSlides: 0, tPower: 0, runs: 0,
  owned: ['classic'], sel: 'classic', rail: false, chai: false, dur: 0, theme: 'street', mis: null, ach: {},
  set: { sound: true, voice: false, arrows: true, big: false, contrast: false, calm: false } });
let save = null;
function loadSave() {
  try { const r = localStorage.getItem(SAVE_KEY); if (r) { const o = JSON.parse(r), d = defSave(); save = Object.assign(d, o); save.set = Object.assign(d.set, o.set || {}); } } catch (e) {}
  if (!save) save = defSave();
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

/* ---------------- MISSIONS (offline, seeded by date) ---------------- */
const MTYPES = [
  { id: 'coins', txt: n => 'Collect ' + n + ' coins', t: [60, 100, 160], r: 60 },
  { id: 'dist', txt: n => 'Run ' + n + ' metres', t: [800, 1500, 2500], r: 80 },
  { id: 'jumps', txt: n => 'Jump ' + n + ' times', t: [15, 25, 40], r: 50 },
  { id: 'slides', txt: n => 'Slide ' + n + ' times', t: [10, 18, 30], r: 50 },
  { id: 'power', txt: n => 'Grab ' + n + ' power-ups', t: [2, 4, 6], r: 70 },
  { id: 'score', txt: n => 'Score ' + n + ' in a single run', t: [1500, 3000, 5000], r: 90, single: true },
  { id: 'bus', txt: n => 'Dodge ' + n + ' buses', t: [8, 15, 25], r: 60 }
];
function todayKey() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function ensureMissions() {
  const day = todayKey(); if (save.mis && save.mis.day === day) return;
  const rnd = mulberry32(hashStr(day)), pool = MTYPES.slice(), list = [];
  for (let i = 0; i < 3; i++) { const m = pool.splice(Math.floor(rnd() * pool.length), 1)[0], tier = Math.floor(rnd() * 3); list.push({ id: m.id, target: m.t[tier], prog: 0, done: false, reward: m.r + tier * 30 }); }
  save.mis = { day, list }; persist();
}
function missionAdd(id, n) {
  for (const m of save.mis.list) {
    if (m.id !== id || m.done) continue;
    const def = MTYPES.find(x => x.id === id); m.prog = def.single ? Math.max(m.prog, n) : m.prog + n;
    if (m.prog >= m.target) { m.done = true; m.prog = m.target; save.coins += m.reward; toast('Mission done! +' + m.reward + ' coins'); Sound.power(); }
  }
}

/* ---------------- ACHIEVEMENTS ---------------- */
const ACHS = [
  { id: 'first', name: 'First Run', desc: 'Finish a run', ok: () => save.runs >= 1 },
  { id: 'c100', name: 'Pocket Money', desc: 'Collect 100 coins in total', ok: () => save.tCoins >= 100 },
  { id: 'c1000', name: 'Seth Material', desc: 'Collect 1000 coins in total', ok: () => save.tCoins >= 1000 },
  { id: 'd500', name: 'Marine Drive', desc: 'Run 500 m in one go', ok: () => save.bestDist >= 500 },
  { id: 'd2000', name: 'Local Train Speed', desc: 'Run 2000 m in one go', ok: () => save.bestDist >= 2000 },
  { id: 's5000', name: 'Mayhem Master', desc: 'Score 5000 in one run', ok: () => save.best >= 5000 },
  { id: 'j50', name: 'Kangaroo', desc: 'Jump 50 times in total', ok: () => save.tJumps >= 50 },
  { id: 'p10', name: 'Power Hungry', desc: 'Grab 10 power-ups in total', ok: () => save.tPower >= 10 },
  { id: 'fashion', name: 'Fashionista', desc: 'Unlock a costume', ok: () => save.owned.length > 1 }
];
function checkAch() { for (const a of ACHS) if (!save.ach[a.id] && a.ok()) { save.ach[a.id] = true; save.coins += 50; toast('Achievement: ' + a.name + '  +50'); } }

/* ---------------- CANVAS / LAYOUT ---------------- */
let S = 1, dpr = 1, bg = null, bgTheme = '', bgH = 0, menuScroll = 0, menuT = 0, lastTs = 0;
function resize() {
  const r = canvas.getBoundingClientRect(); if (r.width < 10) return;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
  S = canvas.width / 400; View.W = 400; View.H = canvas.height / S; View.HZ = View.H * 0.3; View.GY = View.H * 0.8;
  bg = null;
  const land = window.innerWidth > window.innerHeight && window.matchMedia && matchMedia('(pointer:coarse)').matches;
  $('rotate').classList.toggle('hidden', !land);
}
function buildBg() {
  const th = Assets.themes[save.theme], W = 460; bgH = Math.ceil(View.H * 0.3) + 2;
  bg = document.createElement('canvas'); bg.width = Math.ceil(W * S); bg.height = Math.ceil(bgH * S); bgTheme = save.theme;
  const b = bg.getContext('2d'); b.scale(S, S);
  const g = b.createLinearGradient(0, 0, 0, bgH); g.addColorStop(0, th.skyTop); g.addColorStop(1, th.skyBot); b.fillStyle = g; b.fillRect(0, 0, W, bgH);
  const sg = b.createRadialGradient(300, bgH * .6, 4, 300, bgH * .6, 90); sg.addColorStop(0, th.sun); sg.addColorStop(1, 'rgba(255,240,180,0)'); b.fillStyle = sg; b.fillRect(0, 0, W, bgH);
  const r = mulberry32(save.theme === 'rail' ? 99 : 7);
  for (const [col, hh, ww] of [[th.far, 70, 30], [th.far2, 46, 24]]) {
    b.fillStyle = col; let x = -10;
    while (x < W) { const w = ww + r() * 26, h = hh * (.5 + r() * .8); b.fillRect(x, bgH - h, w, h); if (r() < .4) b.fillRect(x + w * .3, bgH - h - 10, w * .15, 10); x += w + 2; }
  }
}
const clouds = [{ x: 40, y: 40, s: 1, v: 4 }, { x: 180, y: 70, s: .7, v: 3 }, { x: 320, y: 30, s: 1.2, v: 5 }, { x: 420, y: 90, s: .8, v: 3.5 }];

/* ---------------- GAME STATE ---------------- */
let state = 'menu', G = null;
const P = []; for (let i = 0; i < 140; i++) P.push({ life: 0, x: 0, y: 0, vx: 0, vy: 0, max: 1, size: 3, col: '#fff', g: 0 }); let pi = 0;
function puff(x, y, vx, vy, life, size, col, g) { const p = P[pi++ % P.length]; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.max = life; p.size = size; p.col = col; p.g = g || 0; }
function newRun() {
  const dm = 1 + 0.25 * (save ? save.dur : 0);
  const r = { t: 0, rt: 0, dist: 0, speed: BASE, obs: [], items: [], spawnD: 40, prevFree: [0, 1, 2], px: 1, lane: 1, y: 0, vy: 0, slide: 0, queueSlide: false,
    coinsR: 0, coinScore: 0, score: 0, pu: { mag: 0, shield: 0, mult: 0, boost: 0, slow: 0 }, dm, invuln: 0, stumbleT: 0, chase: 0, dead: false, deadT: 0,
    jumps: 0, slides: 0, powers: 0, shake: 0, look: 0, exprT: 0, nextPw: 150, lastSay: -9, meters: 0, streak: 0, dust: 0, banked: false, newBest: false };
  if (save && save.chai) r.pu.shield = PDUR.shield * dm;
  return r;
}

/* ---------------- SPAWNING ---------------- */
function pickType(dist) {
  const pool = [['scooter', 3, 0], ['cone', 3, 0], ['barrier', 3, 0], ['pit', 3, 0], ['bus', 3, 0], ['cart', 2, 100], ['vendor', 2, 150], ['over', 2, 120], ['auto', 2, 250]];
  const av = pool.filter(p => dist >= p[2]); let tot = 0; for (const p of av) tot += p[1];
  let r = Math.random() * tot; for (const p of av) { if ((r -= p[1]) < 0) return p[0]; } return 'cone';
}
function spawnRow(d0) {
  const lvl = Math.min(1, G.dist / 2500);
  let n = 1; if (Math.random() < 0.25 + 0.4 * lvl) n++; if (G.dist > 400 && Math.random() < 0.1 + 0.25 * lvl) n++;
  const lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, n);
  const row = lanes.map(l => ({ lane: l, type: pickType(G.dist) }));
  const freeOf = () => [0, 1, 2].filter(l => !row.some(r => r.lane === l && ObsDefs[r.type].kind === 'solid'));
  let free = freeOf(), ok = free.filter(l => G.prevFree.some(pf => Math.abs(pf - l) <= 1));
  if (!ok.length) { const rr = row.find(r => r.lane === G.prevFree[0]); if (rr) rr.type = 'cone'; free = freeOf(); }
  let rowLen = 1;
  for (const r of row) {
    const def = ObsDefs[r.type]; rowLen = Math.max(rowLen, def.len);
    G.obs.push({ type: r.type, lane: r.lane, d: d0, v: Math.floor(Math.random() * 4), seed: Math.random() * 6, hit: false, pass: false, extra: r.type === 'auto' ? 3 : 0 });
  }
  G.prevFree = free;
  const gap = G.speed * (1.5 - 0.6 * lvl) + rowLen;
  const next = d0 + gap;
  // coin arcs above low obstacles
  for (const r of row) { const def = ObsDefs[r.type]; if ((def.kind === 'low' || def.kind === 'pit') && Math.random() < 0.55) for (let i = 0; i < 5; i++) G.items.push({ kind: 'coin', fx: r.lane, d: d0 + def.len / 2 + (i - 2) * 1.7, h: [45, 85, 115, 85, 45][i], seed: i, got: false }); }
  // trail in a free lane after the row
  const tl = free[Math.floor(Math.random() * free.length)], start = d0 + rowLen + 1.5, end = next - 2, cnt = Math.min(9, Math.floor((end - start) / 2.1));
  const pwAt = G.dist >= G.nextPw ? Math.floor(cnt / 2) : -1;
  for (let i = 0; i < cnt; i++) {
    const d = start + i * 2.1;
    if (i === pwAt) { const types = Object.keys(PowerInfo); G.items.push({ kind: 'pw', ptype: types[Math.floor(Math.random() * types.length)], fx: tl, d, h: 0, seed: 0, got: false }); G.nextPw = G.dist + 350 + Math.random() * 250; }
    else G.items.push({ kind: Math.random() < 0.04 ? 'token' : 'coin', fx: tl, d, h: 42, seed: i * .7, got: false });
  }
  G.spawnD = next;
}

/* ---------------- INPUT ACTIONS ---------------- */
function laneMove(dir) {
  if (state !== 'playing' || G.dead) return;
  const n = Math.max(0, Math.min(2, G.lane + dir)); if (n === G.lane) return; G.lane = n; G.look = dir; Sound.lane();
}
function doJump() {
  if (state !== 'playing' || G.dead) return;
  if (G.y <= 2) { G.vy = JV; G.slide = 0; G.queueSlide = false; G.jumps++; save.tJumps++; missionAdd('jumps', 1); Sound.jump(); if (Math.random() < .12) say(pick(Assets.heroLines.jump)); for (let i = 0; i < 5; i++) puff(heroX(), View.GY, (Math.random() - .5) * 90, -20 - Math.random() * 30, .4, 4, '#e5e7eb', 80); }
}
function doSlide() {
  if (state !== 'playing' || G.dead) return;
  if (G.y > 2) { G.vy = -1000; G.queueSlide = true; } else startSlide();
}
function startSlide() { if (G.slide > 0) return; G.slide = SLIDE_T; G.slides++; save.tSlides++; missionAdd('slides', 1); Sound.slide(); }
function heroX() { return View.X((G.px - 1) * LANE_W, 0); }
let sayHide = 0;
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function say(text, chaser) {
  if (!G || G.t - G.lastSay < 1.4 && !chaser) return; G.lastSay = G.t;
  const el = $('speech'); el.textContent = text; el.style.background = chaser ? '#ffedd5' : '#fff'; el.style.color = chaser ? '#9a3412' : '#222';
  el.classList.remove('hidden'); clearTimeout(sayHide); sayHide = setTimeout(() => el.classList.add('hidden'), 1300); Sound.say(text);
}
function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.remove('hidden'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.add('hidden'), 2200); }

/* ---------------- UPDATE ---------------- */
function activate(type) {
  G.pu[type] = PDUR[type] * G.dm; G.powers++; save.tPower++; missionAdd('power', 1); Sound.power();
  say(pick(Assets.heroLines[type === 'shield' ? 'shield' : type === 'mag' ? 'magnet' : type]));
  for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28; puff(heroX(), View.GY - 60, Math.cos(a) * 140, Math.sin(a) * 140, .5, 4, PowerInfo[type].color, 0); }
}
function collide(o) {
  if (G.invuln > 0) return;
  if (G.pu.boost > 0) { o.smash = true; G.shake = .25; Sound.hit(); for (let i = 0; i < 14; i++) puff(heroX(), View.GY - 40, (Math.random() - .5) * 400, -Math.random() * 300, .6, 5, '#fb923c', 600); return; }
  o.hit = true;
  if (G.pu.shield > 0) { G.pu.shield = 0; G.invuln = 1.3; Sound.shield(); say(pick(Assets.heroLines.shield)); for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28; puff(heroX(), View.GY - 60, Math.cos(a) * 200, Math.sin(a) * 200, .5, 4, '#67e8f9', 0); } return; }
  G.shake = .5; Sound.hit();
  for (let i = 0; i < 10; i++) puff(heroX(), View.GY - 50, (Math.random() - .5) * 300, -Math.random() * 260, .6, 5, '#fde047', 700);
  if (G.chase > 0) { die(); return; }
  G.chase = CHASE_T; G.stumbleT = 0.9; G.invuln = 1.6; say(pick(Assets.heroLines.hit)); setTimeout(() => { if (state === 'playing' && G.chase > 0) say(pick(Assets.chaserLines), true); }, 900);
}
function die() { G.dead = true; G.deadT = 0; G.stumbleT = 0; Sound.over(); Sound.stopAll(); G.shake = .8; say('Pakad liya!', true); }
function update(dt) {
  dt = Math.min(dt, 0.05);
  const slow = G.pu.slow > 0 ? 0.6 : 1, wdt = dt * slow;
  G.t += dt; G.shake = Math.max(0, G.shake - dt * 1.6);
  for (const k in G.pu) if (G.pu[k] > 0) G.pu[k] = Math.max(0, G.pu[k] - dt);
  if (G.invuln > 0) G.invuln -= dt; if (G.stumbleT > 0) G.stumbleT -= dt; if (G.exprT > 0) G.exprT -= dt;
  if (G.chase > 0 && !G.dead) { G.chase -= dt; if (G.chase <= 0) { G.chase = 0; say(pick(Assets.heroLines.safe)); } }
  G.look *= Math.max(0, 1 - dt * 6);
  // speed
  let target = BASE + (MAXS - BASE) * (1 - Math.exp(-G.dist / 1800));
  if (G.pu.boost > 0) target *= 1.6; if (G.stumbleT > 0) target *= 0.55; if (G.dead) target = 0;
  G.speed += (target - G.speed) * Math.min(1, dt * (G.dead ? 5 : 3));
  const dv = G.speed * wdt; G.dist += dv; G.rt += wdt * G.speed * 0.55;
  const m = Math.floor(G.dist); if (m > G.meters) { missionAdd('dist', m - G.meters); G.meters = m; }
  // player physics
  G.px += (G.lane - G.px) * Math.min(1, dt * 14);
  if (G.y > 0 || G.vy > 0) {
    G.vy -= GRAV * wdt; G.y += G.vy * wdt;
    if (G.y <= 0) { G.y = 0; G.vy = 0; Sound.land(); for (let i = 0; i < 4; i++) puff(heroX(), View.GY, (Math.random() - .5) * 120, -10 - Math.random() * 30, .35, 4, '#d1d5db', 60); if (G.queueSlide) { G.queueSlide = false; startSlide(); } }
  }
  if (G.slide > 0) G.slide -= wdt;
  if (!G.dead && G.y <= 0 && G.dust <= 0) { G.dust = .09; puff(heroX() + (Math.random() - .5) * 14, View.GY, (Math.random() - .5) * 40, -10 - Math.random() * 20, .35, 3.5, 'rgba(230,230,230,.8)', 40); } G.dust -= dt;
  // world
  for (const o of G.obs) { o.d -= (dv + o.extra * wdt); }
  for (const it of G.items) it.d -= dv;
  G.spawnD -= dv; while (G.spawnD < 72 && !G.dead) spawnRow(G.spawnD);
  // collisions
  if (!G.dead) for (const o of G.obs) {
    if (o.hit || o.smash) continue; const def = ObsDefs[o.type];
    if (Math.abs(G.px - o.lane) < 0.6 && o.d < 0.8 && o.d + def.len > -0.4) {
      let h = false;
      if (def.kind === 'solid') h = true; else if (def.kind === 'low' || def.kind === 'pit') h = G.y < def.clear; else if (def.kind === 'over') h = G.slide <= 0 && G.y < 108;
      if (h) collide(o);
    }
    if (!o.pass && o.d + def.len < -0.4) {
      o.pass = true;
      if (!o.hit) { if (o.type === 'bus') missionAdd('bus', 1); if (Math.abs(G.px - o.lane) < 1.2 && Math.random() < .25) say(pick(Assets.heroLines.near)); }
    }
  }
  // items
  const magnet = G.pu.mag > 0;
  for (const it of G.items) {
    if (it.got) continue;
    if (magnet && it.kind !== 'pw' && it.d < 18 && it.d > -1 && Math.abs(it.fx - G.px) < 1.9) it.mag = true;
    if (it.mag) { it.fx += (G.px - it.fx) * Math.min(1, dt * 12); it.d -= (it.d) * Math.min(1, dt * 7); it.h += (45 + G.y - it.h) * Math.min(1, dt * 8); }
    if (it.d < 1.0 && it.d > -1.2 && Math.abs(it.fx - G.px) < 0.65 && it.h <= G.y + (G.slide > 0 ? 62 : 128) && it.h >= G.y - 18 && !G.dead) {
      it.got = true;
      if (it.kind === 'pw') activate(it.ptype);
      else {
        const val = (it.kind === 'token' ? 10 : 1) * (G.pu.mult > 0 ? 2 : 1);
        G.coinsR += val; G.coinScore += val * (it.kind === 'token' ? 10 : 10); save.tCoins += val; missionAdd('coins', val); G.exprT = .6; G.streak++;
        if (it.kind === 'token') { Sound.token(); say('+₹100 bonus!'); } else Sound.coin();
        if (G.streak % 15 === 0) say(pick(Assets.heroLines.coin));
        for (let i = 0; i < 4; i++) puff(heroX(), View.GY - 50, (Math.random() - .5) * 200, -80 - Math.random() * 120, .4, 3.5, '#ffd23f', 300);
      }
    }
  }
  // cleanup (in place)
  let w = 0; for (let i = 0; i < G.obs.length; i++) { const o = G.obs[i]; if (!o.smash && o.d + ObsDefs[o.type].len > -5) G.obs[w++] = o; } G.obs.length = w;
  w = 0; for (let i = 0; i < G.items.length; i++) { const it = G.items[i]; if (!it.got && it.d > -5) G.items[w++] = it; } G.items.length = w;
  // particles
  for (const p of P) if (p.life > 0) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; }
  G.score = Math.floor(G.dist) + G.coinScore; missionAdd('score', G.score);
  if (G.dead) { G.deadT += dt; if (G.deadT > 1.2) endRun(); }
  updateHUD();
}

/* ---------------- RENDER ---------------- */
function render(dt) {
  const W = View.W, H = View.H, inRun = state !== 'menu', th = Assets.themes[save.theme];
  if (!bg || bgTheme !== save.theme) buildBg();
  ctx.setTransform(S, 0, 0, S, 0, 0);
  const dist = inRun ? G.dist : menuScroll, T = inRun ? G.t : menuT, pxl = inRun ? G.px : 1;
  const shk = inRun && !save.set.calm ? (Math.random() - .5) * G.shake * 22 : 0;
  View.CX = W / 2 - (pxl - 1) * 30 + shk; View.HZ = H * 0.3 + (inRun ? Math.sin(G.rt * 2) * 1.2 : 0); View.GY = H * 0.8;
  // sky + clouds
  ctx.drawImage(bg, -30 - (View.CX - W / 2) * 0.15, 0, 460, bgH);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (const c of clouds) { c.x -= c.v * dt; if (c.x < -60) c.x = W + 60; ctx.beginPath(); ctx.ellipse(c.x, c.y * (H / 700 + .4), 26 * c.s, 9 * c.s, 0, 0, 7); ctx.ellipse(c.x + 16 * c.s, c.y * (H / 700 + .4) - 6 * c.s, 18 * c.s, 9 * c.s, 0, 0, 7); ctx.fill(); }
  // ground
  ctx.fillStyle = th.ground; ctx.fillRect(0, View.HZ, W, H - View.HZ);
  const pb = (H - View.HZ) / (View.GY - View.HZ), CX = View.CX, HZ = View.HZ;
  // sidewalks + road
  ctx.fillStyle = th.side;
  poly(ctx, [CX + 160 * pb, H, CX + 218 * pb, H, CX, HZ], th.side); poly(ctx, [CX - 160 * pb, H, CX - 218 * pb, H, CX, HZ], th.side);
  const rg = ctx.createLinearGradient(0, HZ, 0, H); rg.addColorStop(0, '#7b7b8d'); rg.addColorStop(1, '#43434f');
  poly(ctx, [CX, HZ, CX + 165 * pb, H, CX - 165 * pb, H], rg);
  const mod6 = dist % 6, par = Math.floor(dist / 6);
  for (let k = -1; k < 14; k++) { // scrolling shade bands + kerbs + dashes
    const d = k * 6 - mod6, d2 = d + 6; if (d2 < -4.4) continue; const e = (k + par) & 1, y1 = View.Y(d, 0), y2 = View.Y(d2, 0);
    if (e) poly(ctx, [View.X(-165, d), y1, View.X(165, d), y1, View.X(165, d2), y2, View.X(-165, d2), y2], 'rgba(255,255,255,.045)');
    for (const s of [-1, 1]) poly(ctx, [View.X(165 * s, d), y1, View.X(176 * s, d), y1, View.X(176 * s, d2), y2, View.X(165 * s, d2), y2], e ? '#ef4444' : '#f8fafc');
    for (const lx of [-55, 55]) { const d3 = d + 3.2; poly(ctx, [View.X(lx - 2.5, d), y1, View.X(lx + 2.5, d), y1, View.X(lx + 2.5, d3), View.Y(d3, 0), View.X(lx - 2.5, d3), View.Y(d3, 0)], '#f8fafc'); }
  }
  if (save.theme === 'rail') drawRailSide(ctx, dist, T);
  // buildings
  const kFar = Math.floor((dist + FAR_D) / SEG), kNear = Math.floor((dist - 6) / SEG);
  for (let k = kFar; k >= kNear; k--) {
    const dA = k * SEG - dist;
    for (const side of [-1, 1]) { drawBuilding(ctx, k, side, dA, save.theme, T); if (save.theme === 'street' && bldStyle(k, side, 'street').chai) drawChaiStall(ctx, side, dA + 4); }
  }
  // poles & wires
  const j0 = Math.floor((dist - 6) / 18), j1 = Math.floor((dist + FAR_D) / 18);
  for (let j = j1; j >= j0; j--) { const d = j * 18 - dist; drawWires(ctx, d, d + 18, j); drawPole(ctx, -1, d); drawPole(ctx, 1, d); }
  // haze
  const hz = ctx.createLinearGradient(0, HZ - 25, 0, HZ + 90); hz.addColorStop(0, 'rgba(255,225,190,0)'); hz.addColorStop(.3, 'rgba(255,225,190,.8)'); hz.addColorStop(1, 'rgba(255,225,190,0)');
  ctx.fillStyle = hz; ctx.fillRect(0, HZ - 25, W, 115);
  if (!inRun) { // menu hero
    drawHero(ctx, W / 2, H * 0.6, 1.5, { t: menuT * 9, pose: 'run', expr: 'happy', costume: costume(), blink: (menuT % 3) < .12, look: Math.sin(menuT) });
    return;
  }
  // entities far -> near
  const ents = [];
  for (const o of G.obs) ents.push(o); for (const it of G.items) ents.push(it);
  ents.sort((a, b) => (b.d + (b.type ? ObsDefs[b.type].len : 0)) - (a.d + (a.type ? ObsDefs[a.type].len : 0)));
  const behind = [];
  for (const e of ents) {
    if (e.type) { if (e.d < 0 && e.d + ObsDefs[e.type].len < 0.5) behind.push(e); else drawObstacle(ctx, e, T); }
    else { const lx = (e.fx - 1) * LANE_W; if (e.kind === 'pw') drawPickup(ctx, lx, e.d, e.ptype, T); else drawCoin(ctx, lx, e.d, e.h, T, e.seed, e.kind === 'token'); }
  }
  // hero
  const hx = View.CX + (G.px - 1) * LANE_W, hy = View.GY - G.y;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(hx, View.GY + 2, 30 - Math.min(14, G.y * .1), 8, 0, 0, 7); ctx.fill();
  const pose = G.dead || G.stumbleT > 0 ? 'hit' : G.y > 2 ? 'jump' : G.slide > 0 ? 'slide' : 'run';
  const expr = G.dead || G.stumbleT > 0 ? 'dizzy' : G.chase > 0 ? 'scared' : (G.exprT > 0 || G.pu.boost > 0) ? 'happy' : 'run';
  const flick = G.invuln > 0 && G.pu.shield <= 0 && !G.dead && Math.floor(G.t * 14) % 2 === 0;
  if (G.pu.boost > 0) for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? '#fde047' : '#fb923c'; ctx.beginPath(); ctx.moveTo(hx - 14 + i * 14, hy - 30); ctx.lineTo(hx - 8 + i * 14, hy + 40 + Math.random() * 30); ctx.lineTo(hx - 20 + i * 14, hy - 30); ctx.fill(); }
  if (!flick) drawHero(ctx, hx, hy, 0.95, { t: G.rt * 2.2, pose, expr, costume: costume(), blink: (G.t % 3.2) < .12, look: G.look });
  if (G.pu.shield > 0 && (G.pu.shield > 2 || Math.floor(G.t * 8) % 2)) { ctx.strokeStyle = 'rgba(103,232,249,.9)'; ctx.fillStyle = 'rgba(103,232,249,.18)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(hx, hy - 62, 74 + Math.sin(G.t * 6) * 3, 0, 7); ctx.fill(); ctx.stroke(); }
  if (G.pu.mag > 0) { ctx.strokeStyle = 'rgba(239,68,68,.55)'; ctx.lineWidth = 3; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(hx, hy - 60, 60 + ((G.t * 60 + i * 30) % 60), 0, 7); ctx.stroke(); } }
  for (const e of behind) drawObstacle(ctx, e, T);
  // chaser
  if (G.chase > 0 || G.dead) { const c = G.dead ? 1.2 : Math.min(1, G.chase / CHASE_T * 1.4); drawChaser(ctx, hx + 46 + Math.sin(G.t * 2) * 10, View.GY + 14 + 40 * c, 0.55 + 0.3 * c, G.t * 6, 'angry'); }
  // particles
  for (const p of P) if (p.life > 0) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
  // speed lines & screen effects
  if ((G.speed > 22 || G.pu.boost > 0) && !save.set.calm) { ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28 + Math.floor(G.t * 18) * .5, r0 = 150 + ((G.t * 900 + i * 53) % 120), r1 = r0 + 60; ctx.moveTo(W / 2 + Math.cos(a) * r0 * .9, HZ + 60 + Math.sin(a) * r0 * 1.2); ctx.lineTo(W / 2 + Math.cos(a) * r1 * .9, HZ + 60 + Math.sin(a) * r1 * 1.2); } ctx.stroke(); }
  if (G.pu.slow > 0) { ctx.fillStyle = 'rgba(140,80,220,.14)'; ctx.fillRect(0, 0, W, H); }
  if (G.pu.boost > 0) { const bgr = ctx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .7); bgr.addColorStop(0, 'rgba(251,146,60,0)'); bgr.addColorStop(1, 'rgba(251,146,60,.4)'); ctx.fillStyle = bgr; ctx.fillRect(0, 0, W, H); }
  if (G.dead) { ctx.fillStyle = 'rgba(180,0,0,' + Math.min(.35, G.deadT * .4) + ')'; ctx.fillRect(0, 0, W, H); }
}
function costume() { return Assets.costumes.find(c => c.id === save.sel) || Assets.costumes[0]; }

/* ---------------- HUD ---------------- */
const pbEls = {}, hudCache = {};
function buildHud() {
  const box = $('powerBars');
  for (const k of Object.keys(PowerInfo)) {
    const d = document.createElement('div'); d.className = 'pb'; d.style.display = 'none';
    d.innerHTML = '<span class="ic" style="background:' + PowerInfo[k].color + '">' + PowerInfo[k].label + '</span><span class="nm">' + PowerInfo[k].name + '</span><span class="t"><i style="background:' + PowerInfo[k].color + '"></i></span>';
    box.appendChild(d); pbEls[k] = { el: d, bar: d.querySelector('i') };
  }
  $('speech').setAttribute('role', 'status'); $('toast').setAttribute('role', 'status');
}
function setTxt(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updateHUD() {
  setTxt('hudScore', G.score); setTxt('hudDist', Math.floor(G.dist) + 'm'); setTxt('hudCoins', G.coinsR);
  for (const k in pbEls) { const v = G.pu[k], e = pbEls[k], on = v > 0; if (e.on !== on) { e.on = on; e.el.style.display = on ? 'flex' : 'none'; } if (on) e.bar.style.width = Math.min(100, v / (PDUR[k] * G.dm) * 100) + '%'; }
}

/* ---------------- FLOW ---------------- */
const SCREENS = ['menu', 'panel', 'pause', 'over'];
function show(name) { for (const s of SCREENS) $(s).classList.toggle('hidden', s !== name); }
function showMenu() {
  state = 'menu'; ensureMissions(); show('menu'); $('hud').classList.add('hidden'); $('speech').classList.add('hidden');
  $('menuCoins').textContent = save.coins; $('menuBest').textContent = 'Best score ' + save.best + '  ·  Best distance ' + save.bestDist + ' m';
  Sound.stopAll(); if (Sound.ctx) Sound.startMusic();
}
function startRun() {
  Sound.init(); ensureMissions(); G = newRun(); for (const k in hudCache) delete hudCache[k]; for (const k in pbEls) pbEls[k].on = undefined;
  for (const p of P) p.life = 0; state = 'playing'; show(null); $('hud').classList.remove('hidden'); $('speech').classList.add('hidden');
  Sound.stopAll(); Sound.startMusic(); lastTs = 0; updateHUD();
}
function pauseGame() { if (state !== 'playing' || G.dead) return; state = 'paused'; show('pause'); Sound.stopAll(); Sound.ui(); }
function resumeGame() { if (state !== 'paused') return; state = 'playing'; show(null); Sound.startMusic(); lastTs = 0; }
let overRaf = 0;
function endRun() {
  state = 'over'; const sc = G.score, dist = Math.floor(G.dist);
  save.coins += G.coinsR; save.runs++; save.tDist += dist; G.newBest = sc > save.best;
  if (sc > save.best) save.best = sc; if (dist > save.bestDist) save.bestDist = dist;
  checkAch(); persist(); Sound.stopAll();
  $('hud').classList.add('hidden'); show('over');
  $('overQuip').textContent = pick(Assets.quips); $('overDist').textContent = dist + 'm'; $('overCoins').textContent = G.coinsR; $('overBest').textContent = save.best;
  $('overNew').classList.toggle('hidden', !G.newBest);
  const el = $('overScore'), t0 = performance.now(); cancelAnimationFrame(overRaf);
  const step = now => { const k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(sc * e); el.style.transform = 'scale(' + (1 + .15 * Math.sin(k * 3.14)) + ')'; if (k < 1) overRaf = requestAnimationFrame(step); };
  overRaf = requestAnimationFrame(step);
}

/* ---------------- PANELS ---------------- */
let panelName = '';
function openPanel(name) { panelName = name; $('menu').classList.add('hidden'); $('panel').classList.remove('hidden'); renderPanel(); Sound.ui(); }
function closePanel() { $('panel').classList.add('hidden'); showMenu(); Sound.ui(); }
function swatch(c) { return 'background:linear-gradient(135deg,' + c.shirt + ' 55%,' + c.pants + ' 55%)'; }
function renderPanel() {
  const t = $('panelTitle'), b = $('panelBody'); let h = '';
  const coinsLine = '<div class="menu-coins" style="justify-content:center;margin-bottom:6px"><span class="coin-ico"></span><b>' + save.coins + '</b></div>';
  if (panelName === 'chars') {
    t.textContent = 'Characters & Costumes'; h = coinsLine + '<small>Play as ' + Assets.heroName + ' — pick an outfit!</small>';
    for (const c of Assets.costumes) {
      const own = save.owned.includes(c.id), sel = save.sel === c.id;
      h += '<div class="item' + (sel ? ' sel' : '') + '"><div class="swatch" style="' + swatch(c) + '"></div><div class="meta"><b>' + c.name + '</b><small>' + (own ? 'Unlocked' : c.price + ' coins') + '</small></div>' +
        (own ? '<button class="sm-btn' + (sel ? ' off' : '') + '" data-act="sel" data-id="' + c.id + '">' + (sel ? 'Selected' : 'Select') + '</button>' : '<button class="sm-btn alt" data-act="buyc" data-id="' + c.id + '">Buy ' + c.price + '</button>') + '</div>';
    }
  } else if (panelName === 'missions') {
    t.textContent = 'Daily Missions'; h = '<small>Fresh missions every day — they work offline!</small>';
    for (const m of save.mis.list) { const d = MTYPES.find(x => x.id === m.id); h += '<div class="item"><div class="meta"><b>' + d.txt(m.target) + '</b><small>' + (m.done ? '<span class="done">Completed ✓</span>' : m.prog + ' / ' + m.target) + ' · Reward ' + m.reward + '</small><div class="bar"><i style="width:' + Math.min(100, m.prog / m.target * 100) + '%"></i></div></div></div>'; }
  } else if (panelName === 'shop') {
    t.textContent = 'Shop'; h = coinsLine;
    h += '<div class="item"><div class="swatch" style="background:linear-gradient(#5b3f8f,#ff9f55)"></div><div class="meta"><b>Railway-Side Theme</b><small>Tracks, masts and a passing local train</small></div>' +
      (save.rail ? '<button class="sm-btn' + (save.theme === 'rail' ? ' off' : '') + '" data-act="theme" data-id="rail">' + (save.theme === 'rail' ? 'Active' : 'Equip') + '</button>' : '<button class="sm-btn alt" data-act="buyrail">Buy 800</button>') + '</div>';
    if (save.rail) h += '<div class="item"><div class="swatch" style="background:linear-gradient(#3ab0e8,#ffd9a8)"></div><div class="meta"><b>Street Theme</b><small>Busy Mumbai street</small></div><button class="sm-btn' + (save.theme === 'street' ? ' off' : '') + '" data-act="theme" data-id="street">' + (save.theme === 'street' ? 'Active' : 'Equip') + '</button></div>';
    h += '<div class="item"><div class="swatch" style="background:#06b6d4"></div><div class="meta"><b>Chai Boost</b><small>Start every run with a shield</small></div>' + (save.chai ? '<span class="done">Owned ✓</span>' : '<button class="sm-btn alt" data-act="buychai">Buy 400</button>') + '</div>';
    const cost = 250 * (save.dur + 1);
    h += '<div class="item"><div class="swatch" style="background:#22c55e"></div><div class="meta"><b>Power-up Duration  Lv ' + save.dur + '/3</b><small>+25% power-up time per level</small></div>' + (save.dur >= 3 ? '<span class="done">MAX ✓</span>' : '<button class="sm-btn alt" data-act="buydur">Buy ' + cost + '</button>') + '</div>';
  } else if (panelName === 'ach') {
    t.textContent = 'Achievements'; h = '<small>+50 coins for each</small>';
    for (const a of ACHS) h += '<div class="item"><div class="meta"><b>' + a.name + (save.ach[a.id] ? ' <span class="done">✓</span>' : '') + '</b><small>' + a.desc + '</small></div></div>';
  } else if (panelName === 'settings') {
    t.textContent = 'Settings'; const s = save.set;
    const row = (k, l) => '<div class="setrow"><span>' + l + '</span><button class="sm-btn' + (s[k] ? '' : ' off') + '" data-act="set" data-id="' + k + '" aria-pressed="' + !!s[k] + '">' + (s[k] ? 'ON' : 'OFF') + '</button></div>';
    h = row('sound', 'Sound & music') + row('voice', 'Spoken voice lines') + row('arrows', 'On-screen arrows') + row('big', 'Big text') + row('contrast', 'High contrast') + row('calm', 'Calm mode (no shake / speed lines)') +
      '<div class="setrow"><span>Reset all progress</span><button class="sm-btn alt" data-act="reset">Reset</button></div>';
  }
  b.innerHTML = h;
}
function applySettings() {
  const s = save.set; Sound.on = s.sound; Sound.voice = s.voice; if (Sound.master) Sound.master.gain.value = s.sound ? 0.9 : 0;
  document.body.classList.toggle('big-text', s.big); document.body.classList.toggle('contrast', s.contrast); document.body.classList.toggle('no-arrows', !s.arrows);
}
let resetArmed = false;
$('panelBody').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]'); if (!btn) return; Sound.init();
  const act = btn.dataset.act, id = btn.dataset.id; let changed = true;
  const pay = n => { if (save.coins < n) { toast('Not enough coins!'); Sound.hit(); return false; } save.coins -= n; Sound.buy(); return true; };
  if (act === 'sel') { save.sel = id; Sound.ui(); }
  else if (act === 'buyc') { const c = Assets.costumes.find(x => x.id === id); if (pay(c.price)) { save.owned.push(id); save.sel = id; checkAch(); } }
  else if (act === 'theme') { save.theme = id; Sound.ui(); }
  else if (act === 'buyrail') { if (pay(800)) { save.rail = true; save.theme = 'rail'; } }
  else if (act === 'buychai') { if (pay(400)) save.chai = true; }
  else if (act === 'buydur') { if (save.dur < 3 && pay(250 * (save.dur + 1))) save.dur++; }
  else if (act === 'set') { save.set[id] = !save.set[id]; applySettings(); Sound.ui(); if (id === 'sound' && !save.set.sound) Sound.stopAll(); }
  else if (act === 'reset') { if (!resetArmed) { resetArmed = true; btn.textContent = 'Tap again!'; setTimeout(() => { resetArmed = false; }, 3000); changed = false; } else { resetArmed = false; save = defSave(); applySettings(); ensureMissions(); toast('Progress reset'); } }
  if (changed) { persist(); renderPanel(); }
});
$('panelClose').addEventListener('click', closePanel);

/* ---------------- INPUT WIRING ---------------- */
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => { Sound.init(); openPanel(b.dataset.open); }));
$('btnPlay').addEventListener('click', startRun); $('btnRestart').addEventListener('click', startRun);
$('btnOverMenu').addEventListener('click', showMenu); $('btnPause').addEventListener('click', pauseGame);
$('btnResume').addEventListener('click', resumeGame); $('btnPauseRestart').addEventListener('click', startRun); $('btnPauseMenu').addEventListener('click', showMenu);
for (const [id, fn] of [['btnLeft', () => laneMove(-1)], ['btnRight', () => laneMove(1)], ['btnJump', doJump], ['btnSlide', doSlide]]) $(id).addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
let sw = null;
canvas.addEventListener('pointerdown', e => { sw = { x: e.clientX, y: e.clientY, id: e.pointerId, done: false }; });
canvas.addEventListener('pointermove', e => {
  if (!sw || sw.done || e.pointerId !== sw.id) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y, th = 26;
  if (Math.abs(dx) < th && Math.abs(dy) < th) return; sw.done = true;
  if (Math.abs(dx) > Math.abs(dy)) laneMove(dx > 0 ? 1 : -1); else if (dy < 0) doJump(); else doSlide();
});
const endSw = () => { sw = null; }; canvas.addEventListener('pointerup', endSw); canvas.addEventListener('pointercancel', endSw);
window.addEventListener('keydown', e => {
  const k = e.key; if (k === 'ArrowLeft' || k === 'a' || k === 'A') laneMove(-1); else if (k === 'ArrowRight' || k === 'd' || k === 'D') laneMove(1);
  else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') { if (state === 'playing') { e.preventDefault(); doJump(); } }
  else if (k === 'ArrowDown' || k === 's' || k === 'S') { if (state === 'playing') { e.preventDefault(); doSlide(); } }
  else if (k === 'p' || k === 'P' || k === 'Escape') { if (state === 'playing') pauseGame(); else if (state === 'paused') resumeGame(); }
  else if (k === 'Enter' && state === 'menu' && $('panel').classList.contains('hidden')) startRun();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
window.addEventListener('blur', pauseGame);
window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 200));
['gesturestart', 'contextmenu'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));

/* ---------------- MAIN LOOP ---------------- */
function frame(ts) {
  requestAnimationFrame(frame);
  let dt = lastTs ? (ts - lastTs) / 1000 : 0.016; lastTs = ts; if (!(dt > 0) || dt > 0.25) dt = 0.016;
  if (state === 'playing') update(dt); else if (state === 'menu') { menuScroll += dt * 9; menuT += dt; }
  render(state === 'paused' ? 0 : dt);
}
function boot() {
  loadSave(); ensureMissions(); G = newRun(); applySettings(); buildHud(); resize(); showMenu();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  requestAnimationFrame(frame);
}
// first user gesture unlocks audio
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { Sound.init(); if (Sound.ctx && state === 'menu' && !Sound.musicTimer) Sound.startMusic(); }, { once: false, passive: true }));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
window.__MMR = { get G() { return G; }, get state() { return state; }, get save() { return save; }, startRun, update, render, laneMove, doJump, doSlide, spawnRow, collide, endRun, openPanel, renderPanel, showMenu, pauseGame, resumeGame };
})();
