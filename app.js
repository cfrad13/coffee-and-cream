// ═══════════════════════════════════════════════════════════════
// Coffee & Cream — app.js (v11 redesign)
// ═══════════════════════════════════════════════════════════════

const APP_VERSION = 'v11.0';
const PATCH_NOTES = [
  {
    version: 'v11.0',
    date: '2026-04-24',
    title: 'Nouveau design & bibliothèque de grains',
    items: [
      { tag: 'DESIGN', text: "Redesign complet — thème sombre espresso avec crema dorée" },
      { tag: 'DESIGN', text: "Basculement thème clair papier, Fraunces + Inter + JetBrains Mono" },
      { tag: 'NOUVEAU', text: "Bibliothèque de grains avec jauge de fraîcheur et quantité restante" },
      { tag: 'NOUVEAU', text: "Timer manomètre inspiré d'une machine espresso" },
      { tag: 'NOUVEAU', text: "Écran d'accueil refait — patch notes & onboarding" },
    ],
  },
  {
    version: 'v10',
    date: '2026-03-15',
    title: 'Multi-user & verdict d\'extraction',
    items: [
      { tag: 'NOUVEAU', text: "Filtrage par utilisateur dans le Journal" },
      { tag: 'NOUVEAU', text: "Verdict live pendant l'extraction (under/target/over)" },
      { tag: 'NOUVEAU', text: "Clone de recettes entre utilisateurs" },
    ],
  },
];

// Supabase
const SUPABASE_URL = 'https://csqpojanecdhqplkyoxn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcXBvamFuZWNkaHFwbGt5b3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNTYwMDcsImV4cCI6MjA5MDgzMjAwN30.chzdYaeWzXJf9wGbVoegvgPXC3FNy21NXN2nCMLv92Y';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── State ──
let FV = {};
FL.forEach(l => FV[l] = 2);
let cCat = null, cKey = null, cR = null, tI = null, el = 0, run = false, isQC = false;
let my = [];
let tRat = 0, tAr = [], dIdx = -1;
let curLiquids = {};
let currentUser = null;
let currentGrinder = localStorage.getItem('cc_grinder') || 'baratza';
let grindersData = [];
var grinderUUIDs = {};
var allUsers = [];
var usersById = {};
var journalFilter = { type: 'mine', userId: null };
let currentTarget = null;
let prevScreen = 'home';

// Theme
let currentTheme = localStorage.getItem('cc_theme') || 'dark';

// Beans
window.BEANS = [];
let selectedBeanId = null;
let editingBean = null;

const USER_GRINDER_DEFAULTS = { Eric: 'kitchenaid' };

// ── Theme ──
function applyTheme(t) {
  currentTheme = t;
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('cc_theme', t);
  // Update browser theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#0f0a07' : '#f7efdd');
  renderThemeIcon();
}
function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}
function renderThemeIcon() {
  const el = document.getElementById('theme-icon');
  if (!el) return;
  el.innerHTML = currentTheme === 'dark'
    ? `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M14.5 11.5A6 6 0 018 5a6 6 0 00.5 11.5 6 6 0 006-5z" fill="currentColor"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3.5" fill="currentColor"/><g stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="10" y1="2" x2="10" y2="4"/><line x1="10" y1="16" x2="10" y2="18"/><line x1="2" y1="10" x2="4" y2="10"/><line x1="16" y1="10" x2="18" y2="10"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="14.4" y1="14.4" x2="15.8" y2="15.8"/><line x1="4.2" y1="15.8" x2="5.6" y2="14.4"/><line x1="14.4" y1="5.6" x2="15.8" y2="4.2"/></g></svg>`;
}

// ── User helpers ──
function userColorFor(u) {
  if (u && u.color) return u.color;
  if (u && u.name === 'Christian') return '#c77a4a';
  if (u && u.name === 'Eric')      return '#7fae6e';
  if (u && u.name === 'Perron')    return '#b8842f';
  return '#8a7a6a';
}
function userInitialsFor(u) {
  if (u && u.initials) return u.initials;
  if (u && u.name) return u.name.slice(0, 2).toUpperCase();
  return '??';
}
function ubadgeHTML(userId, size) {
  const u = usersById[userId] || null;
  const col = userColorFor(u);
  const ini = userInitialsFor(u);
  const sz = size === 'lg' ? 32 : 26;
  return `<span class="cc-ubadge" style="background:linear-gradient(135deg, ${col}, ${col}99);width:${sz}px;height:${sz}px;font-size:${sz * 0.38}px;" title="${u ? u.name : 'inconnu'}">${ini}</span>`;
}

// ── Init ──
async function initApp() {
  applyTheme(currentTheme);
  window.BEANS = beansLoad();

  const [grindersRes, usersRes] = await Promise.all([
    sb.from('grinders').select('*'),
    sb.from('users').select('*').order('name')
  ]);
  if (grindersRes.data) {
    grindersData = grindersRes.data;
    grindersRes.data.forEach(g => {
      if (g.brand === 'Baratza') grinderUUIDs.baratza = g.id;
      if (g.brand === 'KitchenAid') grinderUUIDs.kitchenaid = g.id;
    });
  }
  if (usersRes.data) {
    allUsers = usersRes.data;
    usersById = Object.fromEntries(allUsers.map(u => [u.id, u]));
  }

  const savedUser = localStorage.getItem('cc_user_id');
  if (savedUser && usersById[savedUser]) {
    currentUser = usersById[savedUser];
    await loadBrews();
    afterLogin();
    return;
  }
  renderLoginScreen();
}

function afterLogin() {
  // Onboarding: first visit → welcome, else patch if new version
  const hasSeenWelcome = localStorage.getItem('cc_seen_welcome') === '1';
  const lastSeen = localStorage.getItem('cc_last_seen_version');
  if (!hasSeenWelcome) {
    renderWelcome(0);
    showScreen('welcome');
    return;
  }
  if (lastSeen !== APP_VERSION) {
    renderPatchNotes();
    showScreen('patch');
    return;
  }
  goHome();
}

function goHome() {
  showScreen('home');
  renderCats();
  switchTab('journal');
}

function renderLoginScreen() {
  if (!allUsers.length) {
    sb.from('users').select('*').order('name').then(({ data }) => {
      if (data) {
        allUsers = data;
        usersById = Object.fromEntries(allUsers.map(u => [u.id, u]));
        renderLoginScreen();
      }
    });
  }
  const container = document.getElementById('user-buttons');
  container.innerHTML = '';
  allUsers.forEach(u => {
    const b = document.createElement('button');
    b.className = 'cc-user-btn';
    const col = userColorFor(u);
    b.innerHTML = `<span class="cc-user-dot" style="background:linear-gradient(135deg, ${col}, ${col}99);">${userInitialsFor(u)}</span><span style="flex:1;text-align:left;">${u.name}</span><span style="color:var(--fg-ghost);font-size:18px;">›</span>`;
    b.onclick = () => selectUser(u);
    container.appendChild(b);
  });
  showScreen('login');
}

async function selectUser(u) {
  currentUser = u;
  localStorage.setItem('cc_user_id', u.id);
  if (!localStorage.getItem('cc_grinder') && USER_GRINDER_DEFAULTS[u.name]) {
    currentGrinder = USER_GRINDER_DEFAULTS[u.name];
    localStorage.setItem('cc_grinder', currentGrinder);
  }
  await loadBrews();
  afterLogin();
}

function switchUser() {
  localStorage.removeItem('cc_user_id');
  currentUser = null;
  renderLoginScreen();
}

// ── Supabase CRUD ──
async function loadBrews() {
  const { data } = await sb.from('brews').select('*').order('created_at', { ascending: false }).limit(100);
  my = (data || []).map(mapBrewFromDB);
  updCount();
}

function mapBrewFromDB(row) {
  const fp = row.flavor_profile || {};
  const created = row.created_at ? new Date(row.created_at) : new Date();
  return {
    dbId: row.id,
    cat: fp.cat || '', key: row.recipe_key, name: row.recipe_name, catName: fp.catName || '',
    ct: fp.ct || row.recipe_name,
    dose: row.dose_g || 0, ratio: fp.ratio || 0, yield: row.yield_ml || 0,
    cn: fp.cn || '', ro: fp.ro || '', or: fp.or || '',
    gs: row.grind_setting, gt: fp.gt || '', gsLabel: fp.gsLabel || '',
    grinder: row.grinder_id === grinderUUIDs.kitchenaid ? 'kitchenaid' : 'baratza',
    liqs: fp.liqs || {},
    rat: row.rating || 0, fl: fp.fl || {}, ar: row.aromas || [],
    notes: row.notes,
    date: created.toLocaleDateString('fr-CA'),
    time: created.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }),
    id: row.id, fav: row.is_favorite || false,
    user_id: row.user_id, user_name: fp.user_name || '',
    brew_time_s: row.brew_time_s || null,
    extraction_verdict: row.extraction_verdict || null,
    beanId: fp.beanId || null
  };
}

async function saveToDB(rec, opts) {
  const fp = {
    cat: rec.cat, catName: rec.catName, ct: rec.ct,
    ratio: rec.ratio,
    cn: rec.cn, ro: rec.ro, or: rec.or,
    gt: rec.gt, gsLabel: rec.gsLabel,
    liqs: rec.liqs, fl: rec.fl,
    beanId: rec.beanId || null,
    user_name: currentUser.name
  };
  if (opts && opts.cloned_from_dbid) fp.cloned_from_dbid = opts.cloned_from_dbid;
  const row = {
    user_id: currentUser.id,
    recipe_key: rec.key,
    recipe_name: rec.name,
    grinder_id: grinderUUIDs[rec.grinder] || null,
    grind_setting: rec.gs || null,
    dose_g: rec.dose,
    yield_ml: rec.yield,
    brew_time_s: rec.brew_time_s || null,
    extraction_verdict: rec.extraction_verdict || null,
    rating: Math.max(rec.rat || 1, 1),
    aromas: rec.ar || [],
    notes: rec.notes || null,
    is_favorite: false,
    flavor_profile: fp
  };
  const { data, error } = await sb.from('brews').insert(row).select().single();
  if (error) console.error('saveToDB error:', JSON.stringify(error));
  return data;
}
async function toggleFavDB(dbId, fav) {
  await sb.from('brews').update({ is_favorite: fav }).eq('id', dbId);
}
async function deleteFromDB(dbId) {
  await sb.from('brews').delete().eq('id', dbId);
}

// ── Grinder UI ──
function renderGrinderSelector(containerId, prefix) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  Object.entries(GRINDERS).forEach(([key, g]) => {
    const b = document.createElement('button');
    b.className = 'cc-grinder-btn' + (key === currentGrinder ? ' active' : '');
    b.textContent = g.name;
    b.onclick = () => {
      currentGrinder = key;
      localStorage.setItem('cc_grinder', key);
      renderGrinderSelector(containerId, prefix);
      applyGrinderToSlider(prefix);
    };
    container.appendChild(b);
  });
}
function applyGrinderToSlider(prefix) {
  const g = GRINDERS[currentGrinder];
  const sliderId = prefix === 'qc' ? 'qc-gs' : 'grind-size';
  const valId = prefix === 'qc' ? 'qc-gs-val' : 'grind-size-val';
  const minLblId = prefix === 'qc' ? 'qc-grind-min-label' : 'grind-min-label';
  const maxLblId = prefix === 'qc' ? 'qc-grind-max-label' : 'grind-max-label';
  const slider = document.getElementById(sliderId);
  slider.min = g.min;
  slider.max = g.max;
  slider.value = gDefault(cR, currentGrinder);
  document.getElementById(minLblId).textContent = g.minLabel;
  document.getElementById(maxLblId).textContent = g.maxLabel;
  updGrindLabel(sliderId, valId);
}
function updGrindLabel(sliderId, valId) {
  const v = parseInt(document.getElementById(sliderId).value);
  document.getElementById(valId).innerHTML = `${v} <span style="font-weight:400;color:var(--fg-dim);font-size:11px;">${gLabel(v, currentGrinder)}</span>`;
}

// ── Liquids ──
function renderLiquids(containerId, recipe) {
  const c = document.getElementById(containerId);
  c.innerHTML = '';
  curLiquids = {};
  if (!recipe || !recipe.liquids) return;
  recipe.liquids.forEach((liq, i) => {
    curLiquids[liq.name] = liq.def;
    const row = document.createElement('div');
    row.className = 'cc-liq-row';
    row.innerHTML = `<span class="cc-liq-label">${liq.name}</span><input type="range" class="cc-rng cc-liq-range" min="${liq.min}" max="${liq.max}" step="5" value="${liq.def}" id="liq-r-${containerId}-${i}"><input type="number" class="cc-liq-input" value="${liq.def}" min="${liq.min}" max="${liq.max}" id="liq-i-${containerId}-${i}"><span class="cc-liq-unit">ml</span>`;
    c.appendChild(row);
    const slider = row.querySelector('input[type=range]');
    const input = row.querySelector('input[type=number]');
    slider.oninput = () => { input.value = slider.value; curLiquids[liq.name] = parseInt(slider.value); };
    input.oninput = () => { let v = parseInt(input.value) || liq.def; v = Math.max(liq.min, Math.min(liq.max, v)); slider.value = v; curLiquids[liq.name] = v; };
  });
}
function getLiquidsFromUI(prefix) {
  const obj = {};
  const container = document.getElementById(prefix);
  if (!container) return obj;
  container.querySelectorAll('.cc-liq-row').forEach(row => {
    const label = row.querySelector('.cc-liq-label').textContent;
    const input = row.querySelector('input[type=number]');
    obj[label] = parseInt(input.value) || 0;
  });
  return obj;
}

// ── Autocomplete ──
function getUsed(f) {
  const s = new Set();
  my.forEach(r => { if (r[f] && r[f].trim()) s.add(r[f].trim()); });
  return [...s].sort();
}
function showAC(inp, type) {
  const val = inp.value.toLowerCase().trim();
  const f = type === 'cn' || type === 'qcn' ? 'cn' : 'ro';
  const items = getUsed(f).filter(i => i.toLowerCase().includes(val) && i.toLowerCase() !== val);
  const d = document.getElementById('ac-' + type);
  if (!val || !items.length) { d.classList.remove('show'); d.innerHTML = ''; return; }
  d.innerHTML = items.slice(0, 5).map(i => `<button class="cc-aci" onmousedown="pickAC('${inp.id}','${type}',\`${i.replace(/`/g, '')}\`)">${i}</button>`).join('');
  d.classList.add('show');
  inp.addEventListener('blur', () => setTimeout(() => d.classList.remove('show'), 150), { once: true });
}
function pickAC(id, type, val) {
  document.getElementById(id).value = val;
  document.getElementById('ac-' + type).classList.remove('show');
}

// ── Helpers ──
function updCount() {
  const el = document.getElementById('bc-num');
  if (el) el.textContent = my.length;
}
function fmt(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

// ── Categories ──
function renderCats() {
  const e = document.getElementById('category-list');
  if (!e) return;
  e.innerHTML = '';
  for (const [k, c] of Object.entries(RR)) {
    const n = Object.keys(c.subs).length;
    const b = document.createElement('button');
    b.className = 'cc-cat';
    const glyph = k.charAt(0).toUpperCase();
    b.innerHTML = `<div class="cc-cat-glyph">${glyph}</div><div class="cc-cat-text"><div class="title">${c.name}</div><div class="desc">${n} recette${n > 1 ? 's' : ''}</div></div><span class="cc-cat-chev">›</span>`;
    b.onclick = () => showSubs(k);
    e.appendChild(b);
  }
  updCount();
}

function showSubs(ck) {
  cCat = ck;
  document.getElementById('sub-title').textContent = RR[ck].name;
  const e = document.getElementById('sub-list');
  e.innerHTML = '';
  for (const [k, r] of Object.entries(RR[ck].subs)) {
    const b = document.createElement('button');
    b.className = 'cc-sub';
    b.innerHTML = `<div><div class="cc-sub-name">${r.name}</div><div class="cc-sub-desc">${r.desc}</div></div><span style="color:var(--fg-ghost);font-size:20px;">›</span>`;
    b.onclick = () => selRec(ck, k);
    e.appendChild(b);
  }
  showScreen('sub');
}

// ── Recipe ──
function selRec(ck, rk) {
  cCat = ck; cKey = rk; cR = RR[ck].subs[rk]; isQC = false;
  const r = cR;
  document.getElementById('recipe-title').textContent = r.name;
  document.getElementById('recipe-desc').textContent = r.desc;
  const rs = document.getElementById('ratio-slider');
  rs.min = r.ratio[0]; rs.max = r.ratio[1]; rs.step = r.rs; rs.value = r.rd;
  document.getElementById('ratio-min').textContent = '1:' + r.ratio[0];
  document.getElementById('ratio-max').textContent = '1:' + r.ratio[1];
  const ds = document.getElementById('dose-slider');
  ds.min = r.dose[0]; ds.max = r.dose[1]; ds.step = r.ds; ds.value = r.dd;

  renderGrinderSelector('grinder-sel', 'main');
  applyGrinderToSlider('main');
  const gs = document.getElementById('grind-size');
  gs.oninput = () => updGrindLabel('grind-size', 'grind-size-val');
  document.getElementById('grind-time').value = '';

  renderLiquids('liquid-fields', r);
  const mi = document.getElementById('milk-info');
  if (r.extra) {
    mi.style.display = 'block';
    mi.innerHTML = `<div class="cc-card tight" style="background:rgba(199,122,74,0.08);border-color:rgba(199,122,74,0.25);font-size:12px;color:var(--fg-muted);">${r.extra}</div>`;
  } else mi.style.display = 'none';
  document.getElementById('params-info').innerHTML = `<div>Mouture recommandée : <span style="color:var(--crema);">${r.grind}</span></div><div>Température : <span style="color:var(--crema);">${r.temp}</span></div>`;
  document.getElementById('yield-lbl').textContent = r.name.includes('Cold') ? 'ml eau' : 'ml tasse';
  document.getElementById('coffee-name').value = '';
  document.getElementById('coffee-roaster').value = '';
  document.getElementById('coffee-origin').value = '';

  selectedBeanId = (window.BEANS[0] && window.BEANS[0].id) || null;
  renderBeanPicker();
  updRec();
  rs.oninput = updRec;
  ds.oninput = updRec;
  showScreen('recipe');
}

function updRec() {
  const ratio = parseFloat(document.getElementById('ratio-slider').value);
  const dose = parseFloat(document.getElementById('dose-slider').value);
  const yld = Math.round(dose * ratio);
  document.getElementById('ratio-label').textContent = '1:' + ratio.toFixed(1);
  document.getElementById('ratio-display').textContent = '1:' + ratio.toFixed(1);
  document.getElementById('dose-val').textContent = dose % 1 === 0 ? dose : dose.toFixed(1);
  document.getElementById('dose-slider-val').textContent = (dose % 1 === 0 ? dose : dose.toFixed(1)) + 'g';
  document.getElementById('yield-val').textContent = yld;
  const sp = document.getElementById('steps-preview');
  sp.innerHTML = '';
  cR.steps.forEach((s, i) => {
    if (!s.d) return;
    const d = document.createElement('div');
    d.style = 'display:flex;align-items:center;gap:12px;padding:6px 0;font-size:13px;color:var(--fg-muted);';
    d.innerHTML = `<div style="width:22px;height:22px;border-radius:50%;background:var(--bg-hi);display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:11px;color:var(--crema);">${i + 1}</div><span style="flex:1;font-family:'Fraunces',serif;">${s.n}</span><span style="color:var(--fg-ghost);font-size:11px;font-variant-numeric:tabular-nums;">${fmt(s.d)}</span>`;
    sp.appendChild(d);
  });
}

// ── Bean picker on Recipe screen ──
function renderBeanPicker() {
  const c = document.getElementById('bean-picker');
  if (!c) return;
  c.innerHTML = '';
  window.BEANS.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'cc-bean-pill' + (selectedBeanId === b.id ? ' active' : '');
    btn.innerHTML = `<div class="cc-bean-pill-swatch">${beanBagSVG(b.color, b.roast, 28)}</div><div class="cc-bean-pill-text"><div class="n">${b.name}</div><div class="r">${b.roaster || ''}</div></div>`;
    btn.onclick = () => { selectedBeanId = b.id; renderBeanPicker(); };
    c.appendChild(btn);
  });
  // Custom option
  const custom = document.createElement('button');
  custom.className = 'cc-bean-pill ghost' + (selectedBeanId === '__custom__' ? ' active' : '');
  custom.innerHTML = `<div class="cc-bean-pill-swatch ghost">✎</div><div class="cc-bean-pill-text"><div class="n">Autre café</div><div class="r">Saisie libre</div></div>`;
  custom.onclick = () => { selectedBeanId = '__custom__'; renderBeanPicker(); };
  c.appendChild(custom);
  // Add new
  const add = document.createElement('button');
  add.className = 'cc-bean-pill ghost';
  add.innerHTML = `<div class="cc-bean-pill-swatch ghost">+</div><div class="cc-bean-pill-text"><div class="n">Nouveau sac</div><div class="r">Ajouter au répertoire</div></div>`;
  add.onclick = () => openBeanEditor();
  c.appendChild(add);

  renderBeanSelectedBox();
}

function renderBeanSelectedBox() {
  const box = document.getElementById('bean-selected-box');
  const customBox = document.getElementById('custom-coffee-box');
  if (!box || !customBox) return;
  const isCustom = selectedBeanId === '__custom__';
  const b = beanById(selectedBeanId);
  if (isCustom) {
    box.innerHTML = '';
    customBox.style.display = 'block';
  } else if (b) {
    customBox.style.display = 'none';
    box.innerHTML = `<div class="cc-bean-selected">
      <div class="cc-bean-selected-name">${b.name}</div>
      <div class="cc-bean-selected-meta">${[b.origin, b.process].filter(Boolean).join(' · ')}</div>
      ${(b.notes || []).length ? `<div class="cc-bean-selected-notes">${b.notes.map(n => `<span class="cc-bean-note">${n}</span>`).join('')}</div>` : ''}
    </div>`;
  } else {
    box.innerHTML = '';
    customBox.style.display = 'block';
  }
}

// ── Timer (gauge) ──
function buildGaugeTicks() {
  const g = document.getElementById('gauge-ticks');
  if (!g || g.childElementCount > 0) return;
  const R = 112;
  let html = '';
  for (let i = 0; i < 28; i++) {
    const a = (i / 27) * 270 - 135;
    const rad = (a - 90) * Math.PI / 180;
    const isMajor = i % 3 === 0;
    const r1 = R + 2, r2 = isMajor ? R - 10 : R - 5;
    const x1 = 130 + r1 * Math.cos(rad);
    const y1 = 130 + r1 * Math.sin(rad);
    const x2 = 130 + r2 * Math.cos(rad);
    const y2 = 130 + r2 * Math.sin(rad);
    html += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${isMajor ? 'rgba(233,169,98,0.55)' : 'rgba(210,175,135,0.2)'}" stroke-width="${isMajor ? 1.5 : 1}"/>`;
  }
  g.innerHTML = html;
}

function startTimer() {
  el = 0; run = false;
  document.getElementById('timer-title').textContent = cR.name;
  const as = cR.steps.filter(s => s.d > 0);
  const tot = as.reduce((a, s) => a + s.d, 0);
  document.getElementById('timer-total').textContent = 'Total ' + fmt(tot);
  document.getElementById('timer-step-name').textContent = as[0] ? as[0].n : '';
  renderTS();

  const dose  = parseFloat(document.getElementById(isQC ? 'qc-dose'  : 'dose-slider' ).value);
  const ratio = parseFloat(document.getElementById(isQC ? 'qc-ratio' : 'ratio-slider').value);
  currentTarget = calculerTempsCible(cCat, dose, ratio);
  setupTargetUI();
  buildGaugeTicks();
  updTD();
  updGauge();
  document.getElementById('btn-start').textContent = 'Démarrer';
  document.getElementById('btn-next').style.display = 'none';
  showScreen('timer');
}

function setupTargetUI() {
  const zone = document.getElementById('target-zone');
  if (!currentTarget) { zone.style.display = 'none'; return; }
  zone.style.display = 'block';
  updTargetProgress();
}

function updTargetProgress() {
  if (!currentTarget) return;
  const max = currentTarget.max;
  const pct = Math.min((el / max) * 100, 100);
  const bar = document.getElementById('target-progress');
  const zone = document.getElementById('target-zone-bar');
  const verdictEl = document.getElementById('target-verdict');
  const minPct = (currentTarget.min / max) * 100;
  zone.style.left = minPct + '%';
  zone.style.width = (100 - minPct) + '%';
  const v = verdictLive(el, currentTarget);
  const col = verdictColor(v);
  bar.style.width = pct + '%';
  bar.style.background = col;
  verdictEl.style.color = col;
  if (v === 'under')        verdictEl.textContent = `Dans ${fmtSec(currentTarget.min - el)}`;
  else if (v === 'target')  verdictEl.textContent = 'Dans la zone cible';
  else if (v === 'warning') verdictEl.textContent = `+${el - currentTarget.max}s — limite proche`;
  else if (v === 'over')    verdictEl.textContent = `+${el - currentTarget.max}s — sur-extrait`;
  else                      verdictEl.textContent = '';
}

function verdictColor(v) {
  switch (v) {
    case 'over':    return 'var(--bad)';
    case 'warning': return 'var(--warn)';
    case 'target':  return 'var(--ok)';
    case 'under':   return 'var(--under)';
    default:        return 'var(--fg)';
  }
}

function updGauge() {
  const max = currentTarget ? currentTarget.max * 1.3 : 60;
  const progress = Math.min(1, el / max);
  const angle = progress * 270 - 135;
  const C = 2 * Math.PI * 112;
  const v = currentTarget ? verdictLive(el, currentTarget) : null;
  const col = verdictColor(v);
  // Progress arc
  const prog = document.getElementById('gauge-prog');
  prog.setAttribute('stroke', (v === 'target' || v === 'over' || v === 'under' || v === 'warning') ? col : 'var(--crema)');
  prog.setAttribute('stroke-dashoffset', C - progress * 0.75 * C);
  prog.style.filter = `drop-shadow(0 0 6px ${col})`;
  // Band
  if (currentTarget) {
    const bandStart = currentTarget.min / max;
    const bandEnd = currentTarget.max / max;
    const band = document.getElementById('gauge-band');
    const bandLen = (bandEnd - bandStart) * 0.75 * C;
    band.setAttribute('stroke-dasharray', `${bandLen} ${C}`);
    band.setAttribute('transform', `rotate(${-135 + bandStart * 270} 130 130) rotate(-90 130 130)`);
  } else {
    document.getElementById('gauge-band').setAttribute('stroke-dasharray', '0 9999');
  }
  // Needle
  const needle = document.getElementById('gauge-needle');
  needle.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
  needle.style.background = `linear-gradient(180deg, ${col}, ${col}66)`;
  needle.style.boxShadow = `0 0 8px ${col}`;
  // Digital
  document.getElementById('timer-display').style.color = col;
  document.getElementById('timer-display').style.textShadow = `0 0 14px ${col}55`;
}

function renderTS() {
  const c = document.getElementById('timer-steps');
  c.innerHTML = '';
  cR.steps.filter(s => s.d > 0).forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 'cc-step';
    d.id = 'ts-' + i;
    d.innerHTML = `<div class="cc-step-num">${i + 1}</div><div class="cc-step-name">${s.n}</div><div class="cc-step-time">${fmt(s.d)}</div>`;
    c.appendChild(d);
  });
}

function toggleTimer() {
  if (run) {
    clearInterval(tI); run = false;
    document.getElementById('btn-start').textContent = 'Reprendre';
  } else {
    run = true;
    document.getElementById('btn-start').textContent = 'Pause';
    tI = setInterval(() => {
      el++;
      updTD();
      updSH();
      updTargetProgress();
      updGauge();
      const tot = cR.steps.filter(s => s.d > 0).reduce((a, s) => a + s.d, 0);
      if (el >= tot) {
        clearInterval(tI); run = false;
        document.getElementById('btn-start').textContent = 'Terminé';
        document.getElementById('btn-next').style.display = 'inline-flex';
        setTimeout(() => showScreen('smoke'), 600);
      }
    }, 1000);
  }
}

function goToSmoke() { showScreen('smoke'); }

function resetTimer() {
  clearInterval(tI); el = 0; run = false;
  updTD(); renderTS();
  updTargetProgress();
  updGauge();
  document.getElementById('btn-start').textContent = 'Démarrer';
  document.getElementById('btn-next').style.display = 'none';
  document.getElementById('timer-step-name').textContent = cR.steps.filter(s => s.d > 0)[0]?.n || '';
}

function stopTimer() { clearInterval(tI); run = false; }
function updTD() { document.getElementById('timer-display').textContent = fmt(el); }

function updSH() {
  const steps = cR.steps.filter(s => s.d > 0);
  let cum = 0, cn = '', activeIdx = 0;
  steps.forEach((s, i) => {
    const e = document.getElementById('ts-' + i);
    e.classList.remove('active', 'done');
    if (el >= cum + s.d) { e.classList.add('done'); }
    else if (el >= cum) { e.classList.add('active'); cn = s.n; activeIdx = i; }
    cum += s.d;
  });
  document.getElementById('timer-step-name').textContent = cn || 'Terminé';
}

// ── Smoke ──
function skipSmoke() { cancelTast(); }

// ── Quick create ──
function openQC() {
  isQC = true; tRat = 0; tAr = [];
  FL.forEach(l => FV[l] = 2);
  document.getElementById('cust-title').value = '';
  document.getElementById('tnotes').value = '';
  const sel = document.getElementById('qc-method');
  sel.innerHTML = '';
  for (const [ck, cat] of Object.entries(RR)) {
    for (const [rk, r] of Object.entries(cat.subs)) {
      const o = document.createElement('option');
      o.value = ck + '.' + rk;
      o.textContent = cat.name + ' — ' + r.name;
      sel.appendChild(o);
    }
  }
  document.getElementById('qc-section').style.display = 'block';
  updQC(); renderRat(); drawW(); renderAT();
  document.getElementById('qc-cn').value = '';
  document.getElementById('qc-ro').value = '';
  document.getElementById('qc-or').value = '';
  document.getElementById('qc-gt').value = '';
  renderTastingVerdict();
  showScreen('tasting');
}

function updQC() {
  const [ck, rk] = document.getElementById('qc-method').value.split('.');
  cCat = ck; cKey = rk; cR = RR[ck].subs[rk];
  const r = cR;
  const ds = document.getElementById('qc-dose');
  ds.min = r.dose[0]; ds.max = r.dose[1]; ds.step = r.ds; ds.value = r.dd;
  document.getElementById('qc-dv').textContent = (r.dd % 1 === 0 ? r.dd : r.dd.toFixed(1)) + 'g';
  ds.oninput = () => { document.getElementById('qc-dv').textContent = (parseFloat(ds.value) % 1 === 0 ? parseFloat(ds.value) : parseFloat(ds.value).toFixed(1)) + 'g'; };
  const rs = document.getElementById('qc-ratio');
  rs.min = r.ratio[0]; rs.max = r.ratio[1]; rs.step = r.rs; rs.value = r.rd;
  document.getElementById('qc-rv').textContent = '1:' + r.rd.toFixed(1);
  rs.oninput = () => { document.getElementById('qc-rv').textContent = '1:' + parseFloat(rs.value).toFixed(1); };

  renderGrinderSelector('qc-grinder-sel', 'qc');
  applyGrinderToSlider('qc');
  const gs = document.getElementById('qc-gs');
  gs.oninput = () => updGrindLabel('qc-gs', 'qc-gs-val');

  renderLiquids('qc-liquid-fields', r);
}

// ── Tasting ──
function showTasting() {
  if (!isQC) document.getElementById('qc-section').style.display = 'none';
  tRat = 0; tAr = [];
  FL.forEach(l => FV[l] = 2);
  document.getElementById('cust-title').value = '';
  document.getElementById('tnotes').value = '';
  renderRat(); drawW(); renderAT();
  renderTastingVerdict();
  showScreen('tasting');
}

function renderTastingVerdict() {
  const box = document.getElementById('tasting-verdict');
  if (isQC || !currentTarget || !el) { box.style.display = 'none'; return; }
  const v = verdictExtraction(el, currentTarget);
  if (!v) { box.style.display = 'none'; return; }
  const cls = { target: 'cc-verdict target', under: 'cc-verdict under', over: 'cc-verdict over' }[v];
  const label = labelVerdict(v);
  const detail = `Temps ${fmtSec(el)} · Cible ${fmtSec(currentTarget.min)}–${fmtSec(currentTarget.max)} (idéal ${fmtSec(currentTarget.ideal)})`;
  box.className = cls + ' cc-mb-10';
  box.style.display = 'flex';
  box.innerHTML = `<div class="cc-verdict-title">${label} — ${fmtSec(el)}</div><div class="cc-verdict-detail">${detail}</div>`;
}

function tastBack() {
  if (isQC) { isQC = false; goHome(); }
  else showScreen('smoke');
}
function cancelTast() { isQC = false; goHome(); }

// ── Rating ──
function renderRat() {
  const c = document.getElementById('stars');
  c.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement('button');
    b.className = 'cc-star' + (i <= tRat ? ' on' : '');
    b.textContent = '★';
    b.onclick = () => { tRat = i; renderRat(); };
    c.appendChild(b);
  }
}

// ── Flavor wheel ──
function drawW() {
  const svg = document.getElementById('fw'), cx = 130, cy = 130, inner = 45, outer = 115, n = FL.length;
  let h = `<defs>`;
  for (let i = 0; i < n; i++) {
    h += `<radialGradient id="fw${i}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#c77a4a" stop-opacity="0.4"/><stop offset="1" stop-color="#8c4a28" stop-opacity="0.9"/></radialGradient>`;
  }
  h += `</defs>`;
  for (let i = 0; i < n; i++) {
    const f = FL[i];
    const a1 = (i / n) * 2 * Math.PI - Math.PI / 2;
    const a2 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const val = FV[f] || 0;
    const r = inner + (outer - inner) * (val / 5);
    const x1 = cx + inner * Math.cos(a1), y1 = cy + inner * Math.sin(a1);
    const x2 = cx + r * Math.cos(a1), y2 = cy + r * Math.sin(a1);
    const x3 = cx + r * Math.cos(a2), y3 = cy + r * Math.sin(a2);
    const x4 = cx + inner * Math.cos(a2), y4 = cy + inner * Math.sin(a2);
    const la = (a1 + a2) / 2;
    const lx = cx + (outer + 10) * Math.cos(la);
    const ly = cy + (outer + 10) * Math.sin(la);
    h += `<g data-flavor="${f}" style="cursor:pointer;">`;
    h += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x3.toFixed(1)} ${y3.toFixed(1)} L${x4.toFixed(1)} ${y4.toFixed(1)} A${inner} ${inner} 0 0 0 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${val > 0 ? 'url(#fw' + i + ')' : 'rgba(210,175,135,0.08)'}" stroke="rgba(15,10,7,0.6)" stroke-width="1.5"/>`;
    h += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="${val > 0 ? '#e9a962' : '#7a6b5a'}" font-size="9" font-family="Inter" style="pointer-events:none;">${f}</text>`;
    h += `</g>`;
  }
  h += `<circle cx="${cx}" cy="${cy}" r="${inner - 2}" fill="${currentTheme === 'dark' ? '#181210' : '#fcf5e4'}" stroke="rgba(210,175,135,0.12)"/>`;
  h += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="#e9a962" font-family="Fraunces" font-size="11" font-style="italic">saveurs</text>`;
  h += `<text x="${cx}" y="${cy + 10}" text-anchor="middle" fill="#7a6b5a" font-size="8" letter-spacing="1.5">TAP TO RATE</text>`;
  svg.innerHTML = h;
  svg.querySelectorAll('g[data-flavor]').forEach(g => {
    g.addEventListener('click', () => {
      const f = g.dataset.flavor;
      FV[f] = (FV[f] || 0) >= 5 ? 0 : (FV[f] || 0) + 1;
      drawW();
    });
  });
}

function drawDW(el, vals) {
  const cx = 100, cy = 100, inner = 32, outer = 85, n = FL.length;
  let h = `<svg width="200" height="200" viewBox="0 0 200 200" style="display:block;margin:0 auto;"><defs>`;
  for (let i = 0; i < n; i++) h += `<radialGradient id="dw${i}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#c77a4a" stop-opacity="0.4"/><stop offset="1" stop-color="#8c4a28" stop-opacity="0.9"/></radialGradient>`;
  h += `</defs>`;
  for (let i = 0; i < n; i++) {
    const f = FL[i];
    const a1 = (i / n) * 2 * Math.PI - Math.PI / 2;
    const a2 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const val = vals[f] || 0;
    const r = inner + (outer - inner) * (val / 5);
    const x1 = cx + inner * Math.cos(a1), y1 = cy + inner * Math.sin(a1);
    const x2 = cx + r * Math.cos(a1), y2 = cy + r * Math.sin(a1);
    const x3 = cx + r * Math.cos(a2), y3 = cy + r * Math.sin(a2);
    const x4 = cx + inner * Math.cos(a2), y4 = cy + inner * Math.sin(a2);
    h += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x3.toFixed(1)} ${y3.toFixed(1)} L${x4.toFixed(1)} ${y4.toFixed(1)} A${inner} ${inner} 0 0 0 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${val > 0 ? 'url(#dw' + i + ')' : 'rgba(210,175,135,0.08)'}" stroke="rgba(15,10,7,0.6)" stroke-width="1"/>`;
  }
  h += `<circle cx="${cx}" cy="${cy}" r="${inner - 2}" fill="${currentTheme === 'dark' ? '#181210' : '#fcf5e4'}" stroke="rgba(210,175,135,0.12)"/>`;
  h += `</svg>`;
  el.innerHTML = h;
}

// ── Aroma tags ──
function renderAT() {
  const c = document.getElementById('atags');
  c.innerHTML = '';
  AT.forEach(t => {
    const b = document.createElement('button');
    b.className = 'cc-tag' + (tAr.includes(t) ? ' on' : '');
    b.textContent = t;
    b.onclick = () => { const i = tAr.indexOf(t); if (i > -1) tAr.splice(i, 1); else tAr.push(t); renderAT(); };
    c.appendChild(b);
  });
}

// ── Save ──
async function saveRec() {
  let dose, ratio, cn, ro, or, gs, gt, liqs;
  if (isQC) {
    dose = parseFloat(document.getElementById('qc-dose').value);
    ratio = parseFloat(document.getElementById('qc-ratio').value);
    cn = document.getElementById('qc-cn').value;
    ro = document.getElementById('qc-ro').value;
    or = document.getElementById('qc-or').value;
    gs = parseInt(document.getElementById('qc-gs').value);
    gt = document.getElementById('qc-gt').value;
    liqs = getLiquidsFromUI('qc-liquid-fields');
  } else {
    dose = parseFloat(document.getElementById('dose-slider').value);
    ratio = parseFloat(document.getElementById('ratio-slider').value);
    const isCustom = selectedBeanId === '__custom__';
    const b = beanById(selectedBeanId);
    if (isCustom || !b) {
      cn = document.getElementById('coffee-name').value;
      ro = document.getElementById('coffee-roaster').value;
      or = document.getElementById('coffee-origin').value;
    } else {
      cn = b.name;
      ro = b.roaster || '';
      or = b.origin || '';
    }
    gs = parseInt(document.getElementById('grind-size').value);
    gt = document.getElementById('grind-time').value;
    liqs = getLiquidsFromUI('liquid-fields');
  }
  let extractionVerdict = null, brewTimeS = null;
  if (!isQC && currentTarget && el > 0) {
    extractionVerdict = verdictExtraction(el, currentTarget);
    brewTimeS = el;
  }
  const rec = {
    cat: cCat, key: cKey, name: cR.name, catName: RR[cCat].name,
    ct: document.getElementById('cust-title').value || cR.name,
    dose, ratio, yield: Math.round(dose * ratio), cn, ro, or, gs, gt,
    gsLabel: gLabel(gs, currentGrinder), grinder: currentGrinder, liqs,
    rat: tRat, fl: { ...FV }, ar: [...tAr],
    notes: document.getElementById('tnotes').value,
    brew_time_s: brewTimeS,
    extraction_verdict: extractionVerdict,
    beanId: (!isQC && selectedBeanId && selectedBeanId !== '__custom__') ? selectedBeanId : null,
    date: new Date().toLocaleDateString('fr-CA'),
    time: new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }),
    id: Date.now(), fav: false
  };
  const saved = await saveToDB(rec);
  if (saved) my.unshift(mapBrewFromDB(saved));

  // Decrement bean weight
  if (rec.beanId && rec.dose) {
    const idx = window.BEANS.findIndex(x => x.id === rec.beanId);
    if (idx >= 0) {
      window.BEANS[idx].weightLeft = Math.max(0, (window.BEANS[idx].weightLeft || 0) - rec.dose);
      beansSave(window.BEANS);
    }
  }

  isQC = false;
  goHome();
}

// ── Journal ──
function filteredBrews() {
  if (journalFilter.type === 'mine' && currentUser) return my.filter(r => r.user_id === currentUser.id);
  if (journalFilter.type === 'user' && journalFilter.userId) return my.filter(r => r.user_id === journalFilter.userId);
  if (journalFilter.type === 'favs') return my.filter(r => r.fav);
  return my;
}

function renderJournalFilter() {
  const c = document.getElementById('journal-filter');
  const active = (t) => journalFilter.type === t ? ' active' : '';
  let userPillLabel = 'Par user';
  if (journalFilter.type === 'user' && journalFilter.userId) {
    const u = usersById[journalFilter.userId];
    if (u) userPillLabel = `${ubadgeHTML(u.id)} ${u.name}`;
  }
  c.innerHTML = `
    <button class="cc-seg-pill${active('mine')}" onclick="setJournalFilter('mine')">Miennes</button>
    <button class="cc-seg-pill${active('user')}" onclick="toggleUserPicker()">${userPillLabel}</button>
    <button class="cc-seg-pill${active('favs')}" onclick="setJournalFilter('favs')">Favoris</button>`;
  const picker = document.getElementById('journal-userpick');
  if (journalFilter.type === 'user' || journalFilter._pickerOpen) {
    picker.style.display = 'flex';
    picker.innerHTML = allUsers.map(u => {
      const isActive = journalFilter.userId === u.id ? ' active' : '';
      return `<button class="cc-user-pick-btn${isActive}" onclick="setUserFilter('${u.id}')">${ubadgeHTML(u.id)}${u.name}</button>`;
    }).join('');
  } else {
    picker.style.display = 'none';
  }
}

function setJournalFilter(type) {
  journalFilter = { type, userId: null };
  renderJournalFilter();
  renderJournal();
}
function toggleUserPicker() {
  if (journalFilter.type === 'user') journalFilter = { type: 'all', userId: null };
  else journalFilter = { type: 'user', userId: null, _pickerOpen: true };
  renderJournalFilter();
  renderJournal();
}
function setUserFilter(userId) {
  journalFilter = { type: 'user', userId };
  renderJournalFilter();
  renderJournal();
}

function verdictDotColor(v) {
  if (v === 'target') return 'var(--ok)';
  if (v === 'over') return 'var(--bad)';
  if (v === 'warning') return 'var(--warn)';
  if (v === 'under') return 'var(--under)';
  return 'var(--fg-dim)';
}

// Swipe-to-delete on journal cards. Tap to open detail; swipe left to reveal delete.
function attachSwipe(wrap, card, onTap) {
  let startX = 0, startY = 0, dragging = false, decided = false, opened = false, pid = null;
  const REVEAL = 96;
  const THRESHOLD = 40;

  const closeAllOther = () => {
    document.querySelectorAll('.cc-swipe-wrap.open').forEach(w => { if (w !== wrap) w.classList.remove('open'); });
  };

  card.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startX = e.clientX; startY = e.clientY;
    dragging = true; decided = false;
    pid = e.pointerId;
    opened = wrap.classList.contains('open');
  });
  card.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) < Math.abs(dy)) { dragging = false; return; }
      decided = true;
      wrap.classList.add('dragging');
      closeAllOther();
      try { card.setPointerCapture(pid); } catch (_) {}
    }
    const base = opened ? -REVEAL : 0;
    let x = Math.max(-REVEAL - 20, Math.min(0, base + dx));
    card.style.transform = `translateX(${x}px)`;
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    wrap.classList.remove('dragging');
    if (!decided) return;
    const dx = (e.clientX || 0) - startX;
    const final = (opened ? -REVEAL : 0) + dx;
    const willOpen = final < -THRESHOLD;
    wrap.classList.toggle('open', willOpen);
    card.style.transform = '';
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);

  card.addEventListener('click', (e) => {
    if (decided) {
      e.preventDefault(); e.stopPropagation();
      decided = false;
      return;
    }
    if (wrap.classList.contains('open')) {
      e.preventDefault(); e.stopPropagation();
      wrap.classList.remove('open');
      return;
    }
    if (onTap) onTap();
  }, true);
}

async function delBrewByDbId(dbId) {
  if (!dbId) return;
  const idx = my.findIndex(r => r.dbId === dbId);
  if (idx < 0) return;
  // Sécurité : seul le propriétaire peut supprimer
  if (!currentUser || my[idx].user_id !== currentUser.id) return;
  if (!confirm('Supprimer cette recette ?')) return;
  await deleteFromDB(dbId);
  my.splice(idx, 1);
  renderJournal();
  updCount();
}

function renderJournal() {
  const list = document.getElementById('journal-list');
  const empty = document.getElementById('journal-empty');
  list.innerHTML = '';
  const items = filteredBrews();
  if (!items.length) {
    empty.style.display = 'block';
    empty.textContent = journalFilter.type === 'favs' ? 'Aucun favori' : 'Aucune recette';
    updCount();
    return;
  }
  empty.style.display = 'none';
  items.forEach((r) => {
    const myIdx = my.indexOf(r);
    const isMine = currentUser && r.user_id === currentUser.id;

    const d = document.createElement('div');
    d.className = 'cc-journal-card';
    let stars = '';
    for (let j = 0; j < 5; j++) stars += `<span class="${j < r.rat ? '' : 'off'}">★</span>`;
    const isOther = r.user_id && currentUser && r.user_id !== currentUser.id;
    const cloneBtn = isOther ? `<button class="cc-clone-btn" onclick="event.stopPropagation();cloneBrew('${r.dbId}')">Cloner</button>` : '';
    const badge = r.user_id ? ubadgeHTML(r.user_id) : '';
    const vdot = r.extraction_verdict ? `<div class="cc-verdict-dot" style="color:${verdictDotColor(r.extraction_verdict)};background:${verdictDotColor(r.extraction_verdict)};"></div>` : '';
    d.innerHTML = `
      <button class="cc-fav-btn" onclick="event.stopPropagation();togFav(${myIdx})" style="color:${r.fav ? 'var(--copper)' : 'var(--fg-ghost)'};">${r.fav ? '♥' : '♡'}</button>
      <div class="cc-journal-head">
        <div style="display:flex;align-items:flex-start;gap:10px;flex:1;min-width:0;padding-right:28px;">
          ${badge}
          <div style="flex:1;min-width:0;">
            <div class="cc-journal-title">${r.ct}</div>
            <div class="cc-journal-sub">${r.name}${r.cn ? ' · ' + r.cn : ''}${r.ro ? ' · ' + r.ro : ''}</div>
          </div>
        </div>
        ${vdot}
      </div>
      <div class="cc-journal-meta">
        <span class="cc-stars">${stars}</span>
        <span>·</span>
        <span><span class="mv">${(r.dose % 1 === 0 ? r.dose : r.dose.toFixed(1))}g</span> → ${r.brew_time_s ? fmtSec(r.brew_time_s) : '—'}</span>
        <span style="margin-left:auto;color:var(--fg-ghost);">${r.date.slice(5)}</span>
        ${cloneBtn}
      </div>`;

    if (isMine) {
      const wrap = document.createElement('div');
      wrap.className = 'cc-swipe-wrap';
      const delBtn = document.createElement('button');
      delBtn.className = 'cc-swipe-delete';
      delBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 6h12M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2m-6 0l.8 10a1 1 0 001 .9h4.4a1 1 0 001-.9L15 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Supprimer</span>`;
      delBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); delBrewByDbId(r.dbId); };
      wrap.appendChild(delBtn);
      wrap.appendChild(d);
      attachSwipe(wrap, d, () => showDet(myIdx));
      list.appendChild(wrap);
    } else {
      d.onclick = () => showDet(myIdx);
      list.appendChild(d);
    }
  });
  updCount();
}

async function togFav(i) {
  my[i].fav = !my[i].fav;
  await toggleFavDB(my[i].dbId, my[i].fav);
  renderJournal();
}

async function cloneBrew(dbId) {
  const src = my.find(r => r.dbId === dbId);
  if (!src || !currentUser) return;
  const rec = {
    cat: src.cat, key: src.key, name: src.name, catName: src.catName,
    ct: src.ct + ' (copie)',
    dose: src.dose, ratio: src.ratio, yield: src.yield,
    cn: src.cn, ro: src.ro, or: src.or,
    gs: src.gs, gt: src.gt, gsLabel: src.gsLabel, grinder: src.grinder,
    liqs: { ...(src.liqs || {}) },
    rat: src.rat, fl: { ...(src.fl || {}) }, ar: [...(src.ar || [])],
    notes: src.notes || '',
    beanId: src.beanId || null
  };
  const saved = await saveToDB(rec, { cloned_from_dbid: dbId });
  if (saved) {
    my.unshift(mapBrewFromDB(saved));
    renderJournal();
  }
}

// ── Detail ──
function showDet(i) {
  dIdx = i;
  const r = my[i], c = document.getElementById('det-content');
  let st = '';
  for (let j = 0; j < 5; j++) st += `<span class="cc-star${j < r.rat ? ' on' : ''}" style="pointer-events:none;font-size:22px;">★</span>`;
  const grinderInfo = GRINDERS[r.grinder] || GRINDERS.baratza;
  const grindMax = grinderInfo.max;
  const grindPct = ((r.gs || 0) / grindMax * 100);
  const grindHTML = r.gs ? `<div class="cc-card tight cc-mb-10"><div class="cc-label">Mouture</div><div style="font-size:12px;color:var(--fg-muted);margin-bottom:6px;">${grinderInfo.name}</div><div style="display:flex;align-items:center;gap:10px;"><div style="flex:1;height:4px;background:var(--line-hi);border-radius:2px;"><div style="height:100%;width:${grindPct.toFixed(0)}%;background:var(--copper);border-radius:2px;"></div></div><div style="font-family:'Fraunces',serif;font-size:14px;color:var(--crema);">${r.gs}</div><div style="font-size:12px;color:var(--fg-muted);">${r.gsLabel || gLabel(r.gs, r.grinder)}</div></div>${r.gt ? `<div style="font-size:12px;color:var(--fg-muted);margin-top:8px;">Temps : ${r.gt}</div>` : ''}</div>` : '';
  const liqHTML = r.liqs && Object.keys(r.liqs).length ? `<div class="cc-card tight cc-mb-10"><div class="cc-label">Liquides</div>${Object.entries(r.liqs).map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:var(--fg-muted);">${k}</span><span style="color:var(--crema);font-family:'Fraunces',serif;">${v} ml</span></div>`).join('')}</div>` : '';
  const u = r.user_id ? usersById[r.user_id] : null;
  const userTag = u ? `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:8px;">${ubadgeHTML(u.id)}<span style="font-size:12px;color:var(--fg-muted);">${u.name}</span></span>` : '';
  const isOther = r.user_id && currentUser && r.user_id !== currentUser.id;
  const cloneBtnDet = isOther ? `<button class="cc-clone-btn" style="margin-top:12px;width:100%;padding:10px;" onclick="cloneBrew('${r.dbId}')">Cloner cette recette</button>` : '';
  const vrdHTML = r.extraction_verdict ? (() => {
    const v = r.extraction_verdict;
    const cls = { target: 'cc-verdict target', under: 'cc-verdict under', over: 'cc-verdict over' }[v];
    const label = labelVerdict(v);
    const timeStr = r.brew_time_s ? `Temps réel ${fmtSec(r.brew_time_s)}` : '';
    return `<div class="${cls}" style="margin-bottom:10px;"><div class="cc-verdict-title">${label}</div><div class="cc-verdict-detail">${timeStr}</div></div>`;
  })() : '';
  const beanLinked = r.beanId ? beanById(r.beanId) : null;
  const beanHTML = beanLinked ? `<div class="cc-card tight cc-mb-10"><div class="cc-label">Sac de café</div><div style="display:flex;align-items:center;gap:12px;">${beanBagSVG(beanLinked.color, beanLinked.roast, 40)}<div><div style="font-family:'Fraunces',serif;font-size:15px;">${beanLinked.name}</div><div style="font-size:11px;color:var(--fg-muted);">${beanLinked.roaster || ''}</div></div></div></div>` : '';
  c.innerHTML = `
    ${vrdHTML}
    <div class="cc-card tight cc-mb-10">
      <div class="cc-display" style="font-size:22px;margin-bottom:4px;">${r.ct}</div>
      <div style="font-size:13px;color:var(--fg-muted);display:flex;align-items:center;">${r.name} · ${r.catName}${userTag}</div>
      <div style="font-size:11px;color:var(--fg-ghost);margin-top:4px;">${r.date} · ${r.time}</div>
      <div style="margin-top:10px;display:flex;gap:2px;">${st}</div>
      ${cloneBtnDet}
    </div>
    <div class="cc-stats-grid">
      <div class="cc-stat"><div class="v">${r.dose % 1 === 0 ? r.dose : r.dose.toFixed(1)}</div><div class="l">g café</div></div>
      <div class="cc-stat"><div class="v">1:${typeof r.ratio === 'number' ? r.ratio.toFixed(1) : r.ratio}</div><div class="l">ratio</div></div>
      <div class="cc-stat"><div class="v">${r.yield}</div><div class="l">ml</div></div>
    </div>
    ${beanHTML}
    ${!beanLinked ? `<div class="cc-card tight cc-mb-10"><div class="cc-label">Café</div><div style="font-family:'Fraunces',serif;font-size:15px;">${r.cn || 'Non spécifié'}</div>${r.ro ? `<div style="font-size:12px;color:var(--fg-muted);margin-top:3px;">${r.ro}</div>` : ''}${r.or ? `<div style="font-size:12px;color:var(--fg-dim);margin-top:2px;">Origine : ${r.or}</div>` : ''}</div>` : ''}
    ${liqHTML}
    ${grindHTML}
    ${r.fl ? `<div class="cc-card tight cc-mb-10"><div class="cc-label">Roue des saveurs</div><div id="det-wh"></div></div>` : ''}
    ${r.ar && r.ar.length ? `<div class="cc-card tight cc-mb-10"><div class="cc-label">Arômes</div><div style="display:flex;flex-wrap:wrap;gap:6px;">${r.ar.map(a => `<span class="cc-tag on">${a}</span>`).join('')}</div></div>` : ''}
    ${r.notes ? `<div class="cc-card tight cc-mb-10"><div class="cc-label">Notes</div><div style="font-size:13px;color:var(--fg-muted);line-height:1.6;">${r.notes}</div></div>` : ''}`;
  if (r.fl) { const w = document.getElementById('det-wh'); if (w) drawDW(w, r.fl); }
  showScreen('detail');
}

async function delRec() {
  if (dIdx > -1) {
    const rec = my[dIdx];
    if (rec.dbId) await deleteFromDB(rec.dbId);
    my.splice(dIdx, 1);
    goHome();
  }
}

// ── Navigation ──
function switchTab(t) {
  if (t === 'mesrecettes') { t = 'journal'; journalFilter = { type: 'mine', userId: null }; }
  else if (t === 'favoris') { t = 'journal'; journalFilter = { type: 'favs', userId: null }; }
  document.querySelectorAll('.cc-tab').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.cc-tab[data-tab="${t}"]`);
  if (btn) btn.classList.add('active');
  document.getElementById('tab-recettes').style.display = t === 'recettes' ? 'block' : 'none';
  document.getElementById('tab-journal').style.display  = t === 'journal'  ? 'block' : 'none';
  if (t === 'journal') {
    renderJournalFilter();
    renderJournal();
  }
}

function goBack() { showScreen('sub'); }

function showScreen(n) {
  document.querySelectorAll('.scr').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + n).classList.add('active');
  window.scrollTo(0, 0);
  // Bottom nav visible on main screens
  const navScreens = ['home', 'beans', 'patch'];
  const nav = document.getElementById('bottom-nav');
  if (nav) {
    nav.style.display = navScreens.includes(n) ? 'flex' : 'none';
    nav.querySelectorAll('.cc-bnav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.nav === n);
    });
  }
}

function navTo(n) {
  if (n === 'home') goHome();
  else if (n === 'beans') openBeans();
  else if (n === 'patch') { renderPatchNotes(true); showScreen('patch'); }
}

// ── Beans ──
function openBeans() {
  const list = document.getElementById('beans-list');
  const headline = document.getElementById('beans-headline');
  const beans = window.BEANS;
  headline.innerHTML = `${beans.length} <em style="font-style:italic;color:var(--copper);">sac${beans.length > 1 ? 's' : ''}</em> au répertoire`;
  list.innerHTML = '';
  beans.forEach((b) => {
    const pct = b.weight ? Math.round((b.weightLeft / b.weight) * 100) : 0;
    const fresh = beanFreshness(b.roastDate);
    const gaugeCol = pct < 25 ? 'var(--bad)' : pct < 50 ? 'var(--warn)' : 'var(--copper)';
    const div = document.createElement('button');
    div.className = 'cc-bean-card';
    div.innerHTML = `
      <div class="cc-bean-head">
        <div class="cc-bean-swatch">${beanBagSVG(b.color, b.roast, 52)}</div>
        <div class="cc-bean-info">
          <div class="cc-bean-name">${b.name}</div>
          <div class="cc-bean-meta">${[b.roaster, b.process].filter(Boolean).join(' · ')}</div>
          <div class="cc-bean-notes">${(b.notes || []).slice(0, 3).map(n => `<span class="cc-bean-note">${n}</span>`).join('')}</div>
        </div>
      </div>
      <div class="cc-bean-foot">
        <div class="cc-bean-gauge">
          <div class="cc-bean-gauge-track"><div class="cc-bean-gauge-fill" style="width:${pct}%;background:${gaugeCol};"></div></div>
          <div class="cc-bean-gauge-val">${b.weightLeft}g / ${b.weight}g</div>
        </div>
        <div class="cc-bean-fresh" style="color:${fresh.color};"><span class="dot" style="background:${fresh.color};"></span>${fresh.label} · ${beanDaysAgoLabel(b.roastDate)}</div>
      </div>`;
    div.onclick = () => openBeanDetail(b.id);
    list.appendChild(div);
  });
  showScreen('beans');
}

function openBeanDetail(id) {
  const b = beanById(id);
  if (!b) return;
  document.getElementById('bean-detail-title').textContent = b.origin || 'Sac';
  const c = document.getElementById('bean-detail-content');
  const linkedBrews = my.filter(x => x.beanId === id);
  const avgRating = linkedBrews.length ? (linkedBrews.reduce((a, x) => a + x.rat, 0) / linkedBrews.length).toFixed(1) : '—';
  const pct = b.weight ? Math.round((b.weightLeft / b.weight) * 100) : 0;
  const linkedHTML = linkedBrews.length
    ? linkedBrews.map((x, i) => {
        const vcol = verdictDotColor(x.extraction_verdict);
        return `<div class="cc-journal-card" onclick="showDet(${my.indexOf(x)})">
          <div class="cc-journal-head"><div><div class="cc-journal-title">${x.ct}</div><div class="cc-journal-sub">${x.date.slice(5)} · ${x.brew_time_s ? fmtSec(x.brew_time_s) : '—'}</div></div>${x.extraction_verdict ? `<div class="cc-verdict-dot" style="color:${vcol};background:${vcol};"></div>` : ''}</div>
          <div class="cc-journal-meta"><span class="cc-stars">${Array.from({length:5},(_, j)=>`<span class="${j < x.rat ? '' : 'off'}">★</span>`).join('')}</span></div>
        </div>`;
      }).join('')
    : `<div class="cc-empty">Pas encore d'extraction avec ce grain</div>`;
  c.innerHTML = `
    <div class="cc-bean-hero" style="background:linear-gradient(135deg, ${b.color}44, transparent), radial-gradient(circle at 70% 30%, ${b.color}88, transparent 50%);">
      <div class="cc-eyebrow" style="color:var(--copper);">${(b.roaster || '').toUpperCase()}</div>
      <div class="cc-display" style="font-size:28px;margin-top:6px;line-height:1.1;">${b.name}</div>
      <div style="font-size:13px;color:var(--fg-muted);margin-top:8px;font-family:'Fraunces',serif;font-style:italic;">${[b.origin, b.process, 'Torréfaction ' + (b.roast || '').toLowerCase()].filter(Boolean).join(' · ')}</div>
    </div>
    <div class="cc-bean-stats">
      <div class="cc-bean-stat"><div class="val">${b.weightLeft}g</div><div class="lbl">restant · ${pct}%</div></div>
      <div class="cc-bean-stat"><div class="val">${linkedBrews.length}</div><div class="lbl">extractions</div></div>
      <div class="cc-bean-stat"><div class="val">${avgRating}</div><div class="lbl">note moy.</div></div>
    </div>
    <div class="cc-eyebrow" style="margin-bottom:10px;">NOTES DE DÉGUSTATION</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">${(b.notes || []).map(n => `<span class="cc-bean-note">${n}</span>`).join('')}</div>
    <div class="cc-eyebrow" style="margin-bottom:10px;">HISTORIQUE</div>
    ${linkedHTML}
    <button class="cc-btn-ghost cc-tap" style="margin-top:20px;" onclick="openBeanEditor('${b.id}')">Modifier ce sac</button>`;
  showScreen('bean-detail');
}

function openBeanEditor(id) {
  editingBean = id ? beanById(id) : null;
  document.getElementById('bean-editor-title').textContent = editingBean ? 'Modifier le sac' : 'Nouveau sac';
  document.getElementById('bean-name').value = editingBean?.name || '';
  document.getElementById('bean-roaster').value = editingBean?.roaster || '';
  document.getElementById('bean-origin').value = editingBean?.origin || '';
  document.getElementById('bean-process').value = editingBean?.process || '';
  document.getElementById('bean-roast').value = editingBean?.roast || 'Medium';
  document.getElementById('bean-roast-date').value = editingBean?.roastDate || new Date().toISOString().slice(0, 10);
  document.getElementById('bean-weight').value = editingBean?.weight || 340;
  document.getElementById('bean-weight-left').value = editingBean?.weightLeft ?? (editingBean?.weight || 340);
  document.getElementById('bean-notes').value = (editingBean?.notes || []).join(', ');
  document.getElementById('bean-color').value = editingBean?.color || '#8c4a28';
  document.getElementById('bean-delete-btn').style.display = editingBean ? 'block' : 'none';
  showScreen('bean-editor');
}

function saveBean() {
  const notesRaw = document.getElementById('bean-notes').value;
  const notes = notesRaw.split(',').map(s => s.trim()).filter(Boolean);
  const weight = parseInt(document.getElementById('bean-weight').value) || 340;
  const weightLeft = parseInt(document.getElementById('bean-weight-left').value);
  const data = {
    id: editingBean ? editingBean.id : 'bean-' + Date.now(),
    name: document.getElementById('bean-name').value.trim() || 'Sans nom',
    roaster: document.getElementById('bean-roaster').value.trim(),
    origin: document.getElementById('bean-origin').value.trim(),
    process: document.getElementById('bean-process').value.trim(),
    roast: document.getElementById('bean-roast').value,
    roastDate: document.getElementById('bean-roast-date').value,
    weight,
    weightLeft: isNaN(weightLeft) ? weight : weightLeft,
    notes,
    color: document.getElementById('bean-color').value
  };
  if (editingBean) {
    const idx = window.BEANS.findIndex(x => x.id === editingBean.id);
    if (idx >= 0) window.BEANS[idx] = data;
  } else {
    window.BEANS.unshift(data);
  }
  beansSave(window.BEANS);
  editingBean = null;
  openBeans();
}

function deleteBean() {
  if (!editingBean) return;
  if (!confirm('Supprimer ce sac ?')) return;
  window.BEANS = window.BEANS.filter(x => x.id !== editingBean.id);
  beansSave(window.BEANS);
  editingBean = null;
  openBeans();
}

// ── Onboarding ──
const WELCOME_SLIDES = [
  {
    eyebrow: 'BIENVENUE',
    title: `Ton journal de <em style="font-style:italic;color:var(--copper);">barista</em>`,
    body: "Chaque tasse est une mesure. Chaque geste, une hypothèse. Coffee & Cream te guide de la dose à la première gorgée.",
    art: `<svg width="200" height="200" viewBox="0 0 200 200"><defs><radialGradient id="onb1" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#c77a4a" stop-opacity="0.5"/><stop offset="1" stop-color="#c77a4a" stop-opacity="0"/></radialGradient></defs><circle cx="100" cy="100" r="90" fill="url(#onb1)"/><circle cx="100" cy="100" r="60" fill="none" stroke="#c77a4a" stroke-width="1.5" opacity="0.5"/><circle cx="100" cy="100" r="40" fill="#1a0f08" stroke="#e9a962" stroke-width="1"/><ellipse cx="100" cy="96" rx="32" ry="6" fill="#4a2418"/><path d="M90 80 Q88 70 92 64 M100 80 Q98 68 102 60 M110 80 Q108 70 112 66" stroke="rgba(220,205,185,0.6)" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`
  },
  {
    eyebrow: 'PRINCIPE',
    title: `Mesure, goûte, <em style="font-style:italic;color:var(--copper);">ajuste</em>`,
    body: "Un timer intelligent t'indique la zone d'extraction cible selon ta dose. Pas de hasard — juste la bonne sensorialité.",
    art: `<svg width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="#181210" stroke="rgba(233,169,98,0.2)"/><circle cx="100" cy="100" r="70" fill="none" stroke="rgba(127,174,110,0.4)" stroke-width="6" stroke-dasharray="60 400" transform="rotate(-20 100 100)"/><line x1="100" y1="100" x2="100" y2="45" stroke="#7fae6e" stroke-width="2" stroke-linecap="round" style="filter:drop-shadow(0 0 4px #7fae6e);"/><circle cx="100" cy="100" r="7" fill="#c77a4a"/><text x="100" y="135" fill="#7fae6e" font-size="14" font-family="Fraunces" text-anchor="middle">0:27</text></svg>`
  },
  {
    eyebrow: 'PRÊT·E',
    title: `Le goût est <em style="font-style:italic;color:var(--copper);">subjectif</em>`,
    body: "Note ce que tu perçois : étoiles, arômes, sensation. Ton journal révèle ton palais au fil des tasses.",
    art: `<svg width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="70" fill="none" stroke="rgba(233,169,98,0.2)"/><g transform="translate(100 100)">${[0,1,2,3,4].map(i => `<path transform="rotate(${i * 72})" d="M0 -18 L4 -6 L17 -6 L7 2 L11 14 L0 6 L-11 14 L-7 2 L-17 -6 L-4 -6 Z" fill="${i < 4 ? '#e9a962' : 'rgba(233,169,98,0.2)'}"/>`).join('')}</g></svg>`
  }
];

function renderWelcome(step) {
  const body = document.getElementById('welcome-body');
  const s = WELCOME_SLIDES[step];
  const last = step === WELCOME_SLIDES.length - 1;
  body.innerHTML = `
    <button onclick="finishWelcome()" style="position:absolute;top:60px;right:24px;background:none;border:none;color:var(--fg-muted);font-size:12px;letter-spacing:1.2px;cursor:pointer;padding:8px;font-family:inherit;">PASSER</button>
    <div class="cc-fade-in" style="display:flex;flex-direction:column;align-items:center;flex:1;justify-content:center;margin:auto 0;">
      <div style="margin:0 auto 32px;">${s.art}</div>
      <div class="cc-eyebrow" style="color:var(--copper);margin-bottom:12px;">${s.eyebrow}</div>
      <div class="cc-display" style="font-size:30px;line-height:1.1;margin-bottom:18px;max-width:300px;">${s.title}</div>
      <div style="font-size:14px;line-height:1.55;color:var(--fg-muted);max-width:280px;font-family:'Fraunces',serif;">${s.body}</div>
    </div>
    <div style="display:flex;justify-content:center;gap:6px;margin-bottom:24px;">
      ${WELCOME_SLIDES.map((_, i) => `<div style="width:${i === step ? 22 : 6}px;height:6px;border-radius:3px;background:${i === step ? 'var(--copper)' : 'rgba(233,169,98,0.2)'};transition:width .3s ease, background .3s ease;"></div>`).join('')}
    </div>
    <button class="cc-btn-primary cc-tap" onclick="${last ? 'finishWelcome()' : `renderWelcome(${step + 1})`}">${last ? 'Commencer' : 'Suivant'}</button>`;
}

function finishWelcome() {
  localStorage.setItem('cc_seen_welcome', '1');
  localStorage.setItem('cc_last_seen_version', APP_VERSION);
  goHome();
}

function renderPatchNotes(manual) {
  const body = document.getElementById('patch-body');
  const latest = PATCH_NOTES[0];
  const older = PATCH_NOTES.slice(1);
  const tagColor = (tag) =>
    tag === 'NOUVEAU' ? 'var(--ok)' :
    tag === 'DESIGN'  ? 'var(--copper)' :
    tag === 'FIX'     ? 'var(--warn)' :
    'var(--fg-muted)';
  const titleWords = latest.title.split(' ');
  const titleHTML = titleWords.map((w, i) =>
    i === titleWords.length - 1 ? `<em style="font-style:italic;color:var(--copper);">${w}</em>` : w
  ).join(' ');
  body.innerHTML = `
    <div class="cc-fade-in">
      <div style="text-align:center;margin-bottom:28px;">
        <div class="cc-version-badge"><span class="dot"></span>VERSION ${latest.version}</div>
        <div class="cc-display" style="font-size:30px;line-height:1.15;margin-top:14px;">${titleHTML}</div>
        <div style="font-size:12px;color:var(--fg-ghost);margin-top:10px;letter-spacing:0.4px;font-family:'Fraunces',serif;font-style:italic;">Publié le ${latest.date}</div>
      </div>
      <div class="cc-patch-items cc-stagger" style="margin-bottom:28px;">
        ${latest.items.map(it => {
          const col = tagColor(it.tag);
          return `<div class="cc-patch-item"><span class="cc-patch-tag" style="color:${col};border-color:${col}55;background:${col}1a;">${it.tag}</span><div class="cc-patch-text">${it.text}</div></div>`;
        }).join('')}
      </div>
      ${older.length ? `
      <div class="cc-eyebrow" style="margin-bottom:10px;">VERSIONS PRÉCÉDENTES</div>
      <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:28px;">
        ${older.map(v => `<div class="cc-patch-older"><div class="cc-patch-older-head"><span class="v">${v.version}</span><span class="t">${v.title}</span><span class="d">${v.date.slice(5)}</span></div><ul class="cc-patch-older-list">${v.items.map(it => `<li>${it.text}</li>`).join('')}</ul></div>`).join('')}
      </div>` : ''}
    </div>
    <button class="cc-btn-primary cc-tap" onclick="finishPatchNotes()">${manual ? 'Retour' : 'Continuer'}</button>`;
}

function finishPatchNotes() {
  localStorage.setItem('cc_last_seen_version', APP_VERSION);
  goHome();
}

// ── Init ──
initApp();

// Register SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js');
}
