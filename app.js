// Supabase init
const SUPABASE_URL = 'https://csqpojanecdhqplkyoxn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcXBvamFuZWNkaHFwbGt5b3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNTYwMDcsImV4cCI6MjA5MDgzMjAwN30.chzdYaeWzXJf9wGbVoegvgPXC3FNy21NXN2nCMLv92Y';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let FV = {};
FL.forEach(l => FV[l] = 2);
let cCat = null, cKey = null, cR = null, tI = null, el = 0, run = false, isQC = false;
let my = [];
let tRat = 0, tAr = [], dIdx = -1;
let curLiquids = {};
let currentUser = null;
let currentGrinder = localStorage.getItem('cc_grinder') || 'baratza';
let grindersData = [];

// ── User Selection ──
const USER_GRINDER_DEFAULTS = { Eric: 'kitchenaid' };

async function initApp() {
  // Load grinders from Supabase
  const { data: gd } = await sb.from('grinders').select('*');
  if (gd) grindersData = gd;

  const savedUser = localStorage.getItem('cc_user_id');
  if (savedUser) {
    const { data } = await sb.from('users').select('*').eq('id', savedUser).single();
    if (data) {
      currentUser = data;
      await loadBrews();
      showScreen('home');
      renderCats();
      return;
    }
  }
  await renderLoginScreen();
}

async function renderLoginScreen() {
  const { data: users } = await sb.from('users').select('*').order('name');
  const container = document.getElementById('user-buttons');
  container.innerHTML = '';
  (users || []).forEach(u => {
    const b = document.createElement('button');
    b.className = 'user-btn';
    b.innerHTML = `<span style="font-size:16px;font-weight:500;">${u.name}</span>`;
    b.onclick = () => selectUser(u);
    container.appendChild(b);
  });
}

async function selectUser(u) {
  currentUser = u;
  localStorage.setItem('cc_user_id', u.id);
  // Set default grinder per user if not already saved
  if (!localStorage.getItem('cc_grinder') && USER_GRINDER_DEFAULTS[u.name]) {
    currentGrinder = USER_GRINDER_DEFAULTS[u.name];
    localStorage.setItem('cc_grinder', currentGrinder);
  }
  await loadBrews();
  showScreen('home');
  renderCats();
}

function switchUser() {
  localStorage.removeItem('cc_user_id');
  currentUser = null;
  showScreen('login');
  renderLoginScreen();
}

// ── Supabase CRUD ──
async function loadBrews() {
  const { data } = await sb.from('brews').select('*').order('created_at', { ascending: false }).limit(100);
  my = (data || []).map(mapBrewFromDB);
  updCount();
}

function mapBrewFromDB(row) {
  return {
    dbId: row.id,
    cat: row.category, key: row.recipe_key, name: row.recipe_name, catName: row.category_name,
    ct: row.custom_title || row.recipe_name,
    dose: row.dose, ratio: row.ratio, yield: row.yield_ml,
    cn: row.coffee_name, ro: row.roaster, or: row.origin,
    gs: row.grind_size, gt: row.grind_time, gsLabel: row.grind_label,
    grinder: row.grinder_id,
    liqs: row.liquids || {},
    rat: row.rating, fl: row.flavors || {}, ar: row.aromas || [],
    notes: row.notes,
    date: row.brew_date, time: row.brew_time,
    id: row.id, fav: row.is_favorite || false,
    user_id: row.user_id, user_name: row.user_name
  };
}

async function saveToDB(rec) {
  const row = {
    user_id: currentUser.id,
    user_name: currentUser.name,
    category: rec.cat, recipe_key: rec.key, recipe_name: rec.name, category_name: rec.catName,
    custom_title: rec.ct,
    dose: rec.dose, ratio: rec.ratio, yield_ml: rec.yield,
    coffee_name: rec.cn, roaster: rec.ro, origin: rec.or,
    grind_size: rec.gs, grind_time: rec.gt, grind_label: rec.gsLabel,
    grinder_id: rec.grinder,
    liquids: rec.liqs,
    rating: rec.rat, flavors: rec.fl, aromas: rec.ar,
    notes: rec.notes,
    brew_date: rec.date, brew_time: rec.time,
    is_favorite: false
  };
  const { data } = await sb.from('brews').insert(row).select().single();
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
    b.className = 'grinder-btn' + (key === currentGrinder ? ' active' : '');
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
  document.getElementById(valId).innerHTML = `${v} <span style="font-weight:400;color:#7a6b5a;">${gLabel(v, currentGrinder)}</span>`;
}

// ── Liquids UI ──
function renderLiquids(containerId, recipe) {
  const c = document.getElementById(containerId);
  c.innerHTML = '';
  curLiquids = {};
  if (!recipe || !recipe.liquids) return;
  recipe.liquids.forEach((liq, i) => {
    curLiquids[liq.name] = liq.def;
    const row = document.createElement('div');
    row.className = 'liq-row';
    row.innerHTML = `<span class="liq-label">${liq.name}</span><input type="range" class="rng liq-range" min="${liq.min}" max="${liq.max}" step="5" value="${liq.def}" id="liq-r-${containerId}-${i}"><input type="number" class="liq-input" value="${liq.def}" min="${liq.min}" max="${liq.max}" id="liq-i-${containerId}-${i}"><span class="liq-val">ml</span>`;
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
  const rows = container.querySelectorAll('.liq-row');
  rows.forEach(row => {
    const label = row.querySelector('.liq-label').textContent;
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
  d.innerHTML = items.slice(0, 5).map(i => `<button class="aci" onmousedown="pickAC('${inp.id}','${type}',\`${i.replace(/`/g, '')}\`)">${i}</button>`).join('');
  d.classList.add('show');
  inp.addEventListener('blur', () => setTimeout(() => d.classList.remove('show'), 150), { once: true });
}

function pickAC(id, type, val) {
  document.getElementById(id).value = val;
  document.getElementById('ac-' + type).classList.remove('show');
}

// ── Helpers ──
function updGL(sid, lid) {
  updGrindLabel(sid, lid);
}

function updCount() {
  document.getElementById('bc-num').textContent = my.length;
}

function fmt(s) {
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// ── Categories ──
function renderCats() {
  const e = document.getElementById('category-list');
  e.innerHTML = '';
  // Add user header with switch button
  const header = document.getElementById('user-header');
  if (header) header.remove();
  const hdr = document.createElement('div');
  hdr.id = 'user-header';
  hdr.style = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
  hdr.innerHTML = `<span class="user-badge">${currentUser?.name || ''}</span><button onclick="switchUser()" style="background:none;border:none;font-size:11px;color:#ae5630;cursor:pointer;font-family:inherit;">Changer</button>`;
  e.parentElement.insertBefore(hdr, e);

  for (const [k, c] of Object.entries(RR)) {
    const n = Object.keys(c.subs).length;
    const b = document.createElement('button');
    b.className = 'cat-card';
    b.innerHTML = `<div class="ci">${IC[k]}</div><div style="flex:1;"><div style="font-size:15px;font-weight:500;">${c.name}</div><div style="font-size:12px;color:#7a6b5a;margin-top:3px;">${n} recette${n > 1 ? 's' : ''}</div></div><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" fill="none" stroke="#c4b6a4" stroke-width="1.2" stroke-linecap="round"/></svg>`;
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
    b.className = 'sub-card';
    b.innerHTML = `<div style="flex:1;"><div style="font-size:14px;font-weight:500;">${r.name}</div><div style="font-size:12px;color:#7a6b5a;margin-top:3px;">${r.desc}</div></div><svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink:0;"><path d="M6 4l4 4-4 4" fill="none" stroke="#c4b6a4" stroke-width="1.2" stroke-linecap="round"/></svg>`;
    b.onclick = () => selRec(ck, k);
    e.appendChild(b);
  }
  showScreen('sub');
}

// ── Recipe selection ──
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

  // Grinder
  renderGrinderSelector('grinder-sel', 'main');
  applyGrinderToSlider('main');
  const gs = document.getElementById('grind-size');
  gs.oninput = () => updGrindLabel('grind-size', 'grind-size-val');
  document.getElementById('grind-time').value = '';

  renderLiquids('liquid-fields', r);
  const mi = document.getElementById('milk-info');
  if (r.extra) {
    mi.style.display = 'block';
    mi.innerHTML = `<div style="background:#fdf3e8;border-left:2px solid #ae5630;border-radius:0;padding:10px 14px;font-size:12px;color:#5a4a3a;">${r.extra}</div>`;
  } else mi.style.display = 'none';
  document.getElementById('params-info').innerHTML = `<span style="color:#ae5630;">Mouture</span> ${r.grind}<br><span style="color:#ae5630;">Temp.</span> ${r.temp}`;
  document.getElementById('yield-lbl').textContent = r.name.includes('Cold') ? 'ml eau' : 'ml tasse';
  document.getElementById('coffee-name').value = '';
  document.getElementById('coffee-roaster').value = '';
  document.getElementById('coffee-origin').value = '';
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
  document.getElementById('dose-slider-val').textContent = (dose % 1 === 0 ? dose : dose.toFixed(1)) + ' g';
  document.getElementById('yield-val').textContent = yld;
  const sp = document.getElementById('steps-preview');
  sp.innerHTML = '';
  cR.steps.forEach((s, i) => {
    if (!s.d) return;
    const d = document.createElement('div');
    d.className = 'srow';
    d.innerHTML = `<div class="snum">${i + 1}</div><div style="flex:1;font-size:13px;color:#3b2e22;">${s.n}</div><div style="font-size:13px;color:#ae5630;font-variant-numeric:tabular-nums;">${fmt(s.d)}</div>`;
    sp.appendChild(d);
  });
}

// ── Timer ──
function startTimer() {
  el = 0; run = false;
  document.getElementById('timer-title').textContent = cR.name;
  const as = cR.steps.filter(s => s.d > 0);
  const tot = as.reduce((a, s) => a + s.d, 0);
  document.getElementById('timer-total').textContent = 'Total ' + fmt(tot);
  document.getElementById('timer-step-name').textContent = as[0] ? as[0].n : '';
  document.getElementById('prog').style.strokeDashoffset = '553';
  renderTS();
  updTD();
  document.getElementById('btn-start').textContent = 'Démarrer';
  showScreen('timer');
}

function renderTS() {
  const c = document.getElementById('timer-steps');
  c.innerHTML = '';
  cR.steps.filter(s => s.d > 0).forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 'tsc'; d.id = 'ts-' + i;
    d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;"><div style="display:flex;align-items:center;gap:8px;"><div class="snum">${i + 1}</div><div style="font-size:13px;font-weight:500;color:#3b2e22;">${s.n}</div></div><div style="font-size:13px;color:#ae5630;font-variant-numeric:tabular-nums;">${fmt(s.d)}</div></div><div style="margin-top:6px;height:2px;background:#e8ddd0;border-radius:1px;overflow:hidden;"><div id="pb-${i}" style="height:100%;width:0%;background:#ae5630;border-radius:1px;transition:width .4s;"></div></div>`;
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
      const tot = cR.steps.filter(s => s.d > 0).reduce((a, s) => a + s.d, 0);
      document.getElementById('prog').style.strokeDashoffset = String(553 - (553 * Math.min(el / tot, 1)));
      if (el >= tot) {
        clearInterval(tI); run = false;
        document.getElementById('btn-start').textContent = 'Terminé';
        setTimeout(() => showScreen('smoke'), 600);
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(tI); el = 0; run = false;
  updTD(); renderTS();
  document.getElementById('btn-start').textContent = 'Démarrer';
  document.getElementById('prog').style.strokeDashoffset = '553';
  document.getElementById('timer-step-name').textContent = cR.steps.filter(s => s.d > 0)[0]?.n || '';
}

function stopTimer() { clearInterval(tI); run = false; }
function updTD() { document.getElementById('timer-display').textContent = fmt(el); }

function updSH() {
  const steps = cR.steps.filter(s => s.d > 0);
  let cum = 0, cn = '';
  steps.forEach((s, i) => {
    const e = document.getElementById('ts-' + i), b = document.getElementById('pb-' + i);
    e.classList.remove('act', 'done');
    if (el >= cum + s.d) { e.classList.add('done'); b.style.width = '100%'; }
    else if (el >= cum) { e.classList.add('act'); b.style.width = Math.round(((el - cum) / s.d) * 100) + '%'; cn = s.n; }
    else b.style.width = '0%';
    cum += s.d;
  });
  document.getElementById('timer-step-name').textContent = cn || 'Terminé';
}

// ── Smoke screen ──
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
  showScreen('tasting');
}

function updQC() {
  const [ck, rk] = document.getElementById('qc-method').value.split('.');
  cCat = ck; cKey = rk; cR = RR[ck].subs[rk];
  const r = cR;
  const ds = document.getElementById('qc-dose');
  ds.min = r.dose[0]; ds.max = r.dose[1]; ds.step = r.ds; ds.value = r.dd;
  document.getElementById('qc-dv').textContent = (r.dd % 1 === 0 ? r.dd : r.dd.toFixed(1)) + ' g';
  ds.oninput = () => { document.getElementById('qc-dv').textContent = (parseFloat(ds.value) % 1 === 0 ? parseFloat(ds.value) : parseFloat(ds.value).toFixed(1)) + ' g'; };
  const rs = document.getElementById('qc-ratio');
  rs.min = r.ratio[0]; rs.max = r.ratio[1]; rs.step = r.rs; rs.value = r.rd;
  document.getElementById('qc-rv').textContent = '1:' + r.rd.toFixed(1);
  rs.oninput = () => { document.getElementById('qc-rv').textContent = '1:' + parseFloat(rs.value).toFixed(1); };

  // Grinder
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
  showScreen('tasting');
}

function tastBack() {
  if (isQC) { isQC = false; showScreen('home'); switchTab('mesrecettes'); }
  else showScreen('smoke');
}

function cancelTast() { isQC = false; showScreen('home'); switchTab('recettes'); }

// ── Rating ──
function renderRat() {
  const c = document.getElementById('stars');
  c.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement('button');
    b.className = 'sbtn';
    b.style = 'background:none;border:none;cursor:pointer;padding:3px;';
    b.innerHTML = `<svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="${i <= tRat ? '#ae5630' : '#ebe0d0'}" stroke="${i <= tRat ? '#ae5630' : '#ddd2c2'}" stroke-width="1"/></svg>`;
    b.onclick = () => { tRat = i; renderRat(); };
    c.appendChild(b);
  }
}

// ── Flavor wheel ──
function drawW() {
  const svg = document.getElementById('fw'), cx = 130, cy = 130, mR = 100, n = FL.length;
  let h = '';
  for (let r = 1; r <= 5; r++) h += `<circle cx="${cx}" cy="${cy}" r="${mR * r / 5}" fill="none" stroke="#e8ddd0" stroke-width="0.5"/>`;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 * i / n - Math.PI / 2;
    h += `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * mR}" y2="${cy + Math.sin(a) * mR}" stroke="#e8ddd0" stroke-width="0.5"/>`;
    h += `<text x="${cx + Math.cos(a) * (mR + 14)}" y="${cy + Math.sin(a) * (mR + 14)}" text-anchor="middle" dominant-baseline="central" fill="#7a6b5a" font-size="9" font-family="Inter,sans-serif">${FL[i]}</text>`;
  }
  let pts = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 * i / n - Math.PI / 2;
    pts.push([cx + Math.cos(a) * mR * FV[FL[i]] / 5, cy + Math.sin(a) * mR * FV[FL[i]] / 5]);
  }
  h += `<polygon points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="rgba(174,86,48,0.08)" stroke="#ae5630" stroke-width="1.5"/>`;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 * i / n - Math.PI / 2;
    for (let v = 1; v <= 5; v++) {
      const r = mR * v / 5, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      h += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="${v <= FV[FL[i]] ? '#ae5630' : '#faf5ee'}" stroke="${v <= FV[FL[i]] ? '#ae5630' : '#e8ddd0'}" stroke-width="0.8" style="cursor:pointer;" data-l="${FL[i]}" data-v="${v}"/>`;
    }
  }
  svg.innerHTML = h;
  svg.querySelectorAll('circle[data-l]').forEach(c => {
    c.addEventListener('click', () => { FV[c.dataset.l] = parseInt(c.dataset.v); drawW(); });
  });
}

function drawDW(el, vals) {
  const cx = 100, cy = 100, mR = 80, n = FL.length;
  let h = `<svg width="200" height="200" viewBox="0 0 200 200" style="display:block;margin:0 auto;">`;
  for (let r = 1; r <= 5; r++) h += `<circle cx="${cx}" cy="${cy}" r="${mR * r / 5}" fill="none" stroke="#e8ddd0" stroke-width="0.5"/>`;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 * i / n - Math.PI / 2;
    h += `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * mR}" y2="${cy + Math.sin(a) * mR}" stroke="#e8ddd0" stroke-width="0.5"/>`;
    h += `<text x="${cx + Math.cos(a) * (mR + 12)}" y="${cy + Math.sin(a) * (mR + 12)}" text-anchor="middle" dominant-baseline="central" fill="#7a6b5a" font-size="8" font-family="Inter,sans-serif">${FL[i]}</text>`;
  }
  let pts = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 * i / n - Math.PI / 2, v = vals[FL[i]] || 2;
    pts.push([cx + Math.cos(a) * mR * v / 5, cy + Math.sin(a) * mR * v / 5]);
  }
  h += `<polygon points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="rgba(174,86,48,0.08)" stroke="#ae5630" stroke-width="1.5"/>`;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 * i / n - Math.PI / 2, v = vals[FL[i]] || 2;
    for (let j = 1; j <= 5; j++) {
      const r = mR * j / 5;
      h += `<circle cx="${(cx + Math.cos(a) * r).toFixed(1)}" cy="${(cy + Math.sin(a) * r).toFixed(1)}" r="3.5" fill="${j <= v ? '#ae5630' : '#faf5ee'}" stroke="${j <= v ? '#ae5630' : '#e8ddd0'}" stroke-width="0.5"/>`;
    }
  }
  h += `</svg>`;
  el.innerHTML = h;
}

// ── Aroma tags ──
function renderAT() {
  const c = document.getElementById('atags');
  c.innerHTML = '';
  AT.forEach(t => {
    const b = document.createElement('button');
    b.className = 'atag' + (tAr.includes(t) ? ' sel' : '');
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
    cn = document.getElementById('coffee-name').value;
    ro = document.getElementById('coffee-roaster').value;
    or = document.getElementById('coffee-origin').value;
    gs = parseInt(document.getElementById('grind-size').value);
    gt = document.getElementById('grind-time').value;
    liqs = getLiquidsFromUI('liquid-fields');
  }
  const rec = {
    cat: cCat, key: cKey, name: cR.name, catName: RR[cCat].name,
    ct: document.getElementById('cust-title').value || cR.name,
    dose, ratio, yield: Math.round(dose * ratio), cn, ro, or, gs, gt,
    gsLabel: gLabel(gs, currentGrinder), grinder: currentGrinder, liqs,
    rat: tRat, fl: { ...FV }, ar: [...tAr],
    notes: document.getElementById('tnotes').value,
    date: new Date().toLocaleDateString('fr-CA'),
    time: new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }),
    id: Date.now(), fav: false
  };
  const saved = await saveToDB(rec);
  if (saved) {
    my.unshift(mapBrewFromDB(saved));
  }
  isQC = false;
  showScreen('home');
  switchTab('mesrecettes');
}

// ── My recipes list ──
function renderMy() {
  const e = document.getElementById('my-list'), em = document.getElementById('my-empty');
  e.innerHTML = '';
  if (!my.length) { em.style.display = 'block'; updCount(); return; }
  em.style.display = 'none';
  my.forEach((r, i) => {
    const d = document.createElement('div');
    d.className = 'myc';
    let st = '';
    for (let j = 0; j < 5; j++) st += `<svg width="12" height="12" viewBox="0 0 12 12" style="vertical-align:middle;"><circle cx="6" cy="6" r="5" fill="${j < r.rat ? '#ae5630' : '#e8ddd0'}"/></svg> `;
    const grinderName = GRINDERS[r.grinder]?.name || '';
    const gt = r.gs ? `<span style="font-size:11px;padding:2px 7px;background:#fdf3e8;border:.5px solid #e8ddd0;border-radius:6px;color:#ae5630;">G${r.gs}</span>` : '';
    const userTag = r.user_name && r.user_name !== currentUser?.name ? `<span class="user-badge">${r.user_name}</span>` : '';
    d.innerHTML = `<button class="fh" onclick="event.stopPropagation();togFav(${i})" style="color:${r.fav ? '#ae5630' : '#ddd2c2'};">${r.fav ? '&#9829;' : '&#9825;'}</button><div style="padding-right:28px;"><div style="font-size:15px;font-weight:500;color:#3b2e22;margin-bottom:3px;">${r.ct}</div><div style="font-size:12px;color:#7a6b5a;line-height:1.5;">${r.name} · ${r.cn || '--'}${r.ro ? ' · ' + r.ro : ''}</div><div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap;"><div>${st}</div>${gt}${userTag}<span style="font-size:11px;color:#9a8876;">${r.date}</span></div>${r.ar && r.ar.length ? '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">' + r.ar.map(a => `<span style="font-size:11px;padding:3px 8px;background:#f0e6d8;border-radius:12px;color:#5a4a3a;">${a}</span>`).join('') + '</div>' : ''}</div>`;
    d.onclick = () => showDet(i);
    e.appendChild(d);
  });
  updCount();
}

async function togFav(i) {
  my[i].fav = !my[i].fav;
  await toggleFavDB(my[i].dbId, my[i].fav);
  renderMy();
}

function renderFavs() {
  const e = document.getElementById('fav-list'), em = document.getElementById('fav-empty');
  e.innerHTML = '';
  const f = my.filter(r => r.fav);
  if (!f.length) { em.style.display = 'block'; return; }
  em.style.display = 'none';
  f.forEach(r => {
    const ri = my.indexOf(r), d = document.createElement('div');
    d.className = 'myc';
    let st = '';
    for (let j = 0; j < 5; j++) st += `<svg width="12" height="12" viewBox="0 0 12 12" style="vertical-align:middle;"><circle cx="6" cy="6" r="5" fill="${j < r.rat ? '#ae5630' : '#e8ddd0'}"/></svg> `;
    d.innerHTML = `<div><div style="font-size:15px;font-weight:500;color:#3b2e22;margin-bottom:3px;">${r.ct}</div><div style="font-size:12px;color:#7a6b5a;">${r.cn || ''} ${r.ro ? '· ' + r.ro : ''}</div><div style="margin-top:6px;">${st}</div></div>`;
    d.onclick = () => showDet(ri);
    e.appendChild(d);
  });
}

// ── Detail view ──
function showDet(i) {
  dIdx = i;
  const r = my[i], c = document.getElementById('det-content');
  let st = '';
  for (let j = 0; j < 5; j++) st += `<svg width="16" height="16" viewBox="0 0 16 16" style="vertical-align:middle;"><circle cx="8" cy="8" r="6" fill="${j < r.rat ? '#ae5630' : '#e8ddd0'}" stroke="${j < r.rat ? '#ae5630' : '#ddd2c2'}" stroke-width="0.5"/></svg> `;
  const grinderInfo = GRINDERS[r.grinder] || GRINDERS.baratza;
  const grindMax = grinderInfo.max;
  const grindPct = grinderInfo.inverted ? ((r.gs || 0) / grindMax * 100) : ((r.gs || 0) / grindMax * 100);
  const grindHTML = r.gs ? `<div class="ds"><div class="cl">Mouture</div><div style="font-size:12px;color:#7a6b5a;margin-bottom:6px;">${grinderInfo.name}</div><div style="display:flex;align-items:center;gap:10px;"><div style="flex:1;height:4px;background:#e8ddd0;border-radius:2px;"><div style="height:100%;width:${grindPct.toFixed(0)}%;background:#ae5630;border-radius:2px;"></div></div><div style="font-size:14px;font-weight:500;color:#ae5630;">${r.gs}</div><div style="font-size:12px;color:#7a6b5a;">${r.gsLabel || gLabel(r.gs, r.grinder)}</div></div>${r.gt ? `<div style="font-size:12px;color:#5a4a3a;margin-top:8px;">Temps : ${r.gt}</div>` : ''}</div>` : '';
  const liqHTML = r.liqs && Object.keys(r.liqs).length ? `<div class="ds"><div class="cl">Liquides</div>${Object.entries(r.liqs).map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#5a4a3a;">${k}</span><span style="color:#ae5630;font-weight:500;">${v} ml</span></div>`).join('')}</div>` : '';
  const userTag = r.user_name ? `<span class="user-badge" style="margin-left:8px;">${r.user_name}</span>` : '';
  c.innerHTML = `<div class="ds"><div style="font-size:20px;font-weight:500;color:#3b2e22;margin-bottom:4px;">${r.ct}</div><div style="font-size:13px;color:#7a6b5a;">${r.name} · ${r.catName}${userTag}</div><div style="font-size:12px;color:#9a8876;margin-top:4px;">${r.date} · ${r.time}</div><div style="margin-top:10px;">${st}</div></div><div class="ds"><div class="cl">Café</div><div style="font-size:14px;color:#3b2e22;">${r.cn || 'Non spécifié'}</div>${r.ro ? `<div style="font-size:12px;color:#5a4a3a;margin-top:3px;">${r.ro}</div>` : ''}${r.or ? `<div style="font-size:12px;color:#7a6b5a;margin-top:2px;">Origine : ${r.or}</div>` : ''}</div><div class="ds"><div class="cl">Paramètres</div><div class="mg"><div class="mc"><div class="mcv">${r.dose % 1 === 0 ? r.dose : r.dose.toFixed(1)}</div><div class="mcl">g</div></div><div class="mc"><div class="mcv">1:${typeof r.ratio === 'number' ? r.ratio.toFixed(1) : r.ratio}</div><div class="mcl">ratio</div></div><div class="mc"><div class="mcv">${r.yield}</div><div class="mcl">ml</div></div></div></div>${liqHTML}${grindHTML}${r.fl ? `<div class="ds"><div class="cl">Roue des saveurs</div><div id="det-wh"></div></div>` : ''}${r.ar && r.ar.length ? `<div class="ds"><div class="cl">Arômes</div><div style="display:flex;flex-wrap:wrap;gap:4px;">${r.ar.map(a => `<span style="font-size:12px;padding:5px 12px;background:#f0e6d8;border-radius:14px;color:#ae5630;">${a}</span>`).join('')}</div></div>` : ''}${r.notes ? `<div class="ds"><div class="cl">Notes</div><div style="font-size:13px;color:#5a4a3a;line-height:1.6;">${r.notes}</div></div>` : ''}`;
  if (r.fl) { const w = document.getElementById('det-wh'); if (w) drawDW(w, r.fl); }
  showScreen('detail');
}

async function delRec() {
  if (dIdx > -1) {
    const rec = my[dIdx];
    if (rec.dbId) await deleteFromDB(rec.dbId);
    my.splice(dIdx, 1);
    showScreen('home');
    switchTab('mesrecettes');
  }
}

// ── Navigation ──
function switchTab(t) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${t}"]`).classList.add('active');
  document.getElementById('tab-recettes').style.display = t === 'recettes' ? 'block' : 'none';
  document.getElementById('tab-mesrecettes').style.display = t === 'mesrecettes' ? 'block' : 'none';
  document.getElementById('tab-favoris').style.display = t === 'favoris' ? 'block' : 'none';
  if (t === 'mesrecettes') renderMy();
  if (t === 'favoris') renderFavs();
}

function goBack() { showScreen('sub'); }

function showScreen(n) {
  document.querySelectorAll('.scr').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + n).classList.add('active');
}

// ── Init ──
initApp();

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js');
}
