// ═══════════════════════════════════════════════════════════════
// beans.js — Bibliothèque de sacs de café (stockage localStorage)
// ═══════════════════════════════════════════════════════════════

const BEANS_KEY = 'cc_beans_v1';

const BEANS_SEED = [
  { id: 'seed-bean-1', name: 'Ethiopia Yirgacheffe', roaster: 'Café Myriade', origin: 'Éthiopie', process: 'Lavé', roast: 'Clair', roastDate: todayISO(-14), weight: 340, weightLeft: 180, notes: ['Bergamote','Jasmin','Miel'], color: '#8c4a28' },
  { id: 'seed-bean-2', name: 'Colombia La Palma', roaster: 'Kittel', origin: 'Colombie', process: 'Honey', roast: 'Medium', roastDate: todayISO(-9), weight: 250, weightLeft: 210, notes: ['Cerise','Chocolat au lait','Caramel'], color: '#c77a4a' },
  { id: 'seed-bean-3', name: 'Kenya Nyeri AA', roaster: 'Pilot Coffee', origin: 'Kenya', process: 'Lavé', roast: 'Medium-Clair', roastDate: todayISO(-19), weight: 340, weightLeft: 90, notes: ['Pamplemousse','Tomate','Cassis'], color: '#a65a2a' },
];

function todayISO(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + (offsetDays || 0));
  return d.toISOString().slice(0, 10);
}

function beansLoad() {
  try {
    const raw = localStorage.getItem(BEANS_KEY);
    if (!raw) {
      localStorage.setItem(BEANS_KEY, JSON.stringify(BEANS_SEED));
      return [...BEANS_SEED];
    }
    return JSON.parse(raw);
  } catch (e) {
    return [...BEANS_SEED];
  }
}

function beansSave(list) {
  try {
    localStorage.setItem(BEANS_KEY, JSON.stringify(list));
  } catch (e) {}
}

function beanById(id) {
  if (!id) return null;
  return (window.BEANS || []).find(b => b.id === id) || null;
}

function beanFreshness(roastDate) {
  if (!roastDate) return { label: 'Inconnue', color: 'var(--fg-dim)' };
  const days = Math.floor((Date.now() - new Date(roastDate).getTime()) / 86400000);
  if (days < 4) return { label: 'Dégazage', color: 'var(--warn)', days };
  if (days < 14) return { label: 'Frais', color: 'var(--ok)', days };
  if (days < 28) return { label: 'Optimal', color: 'var(--copper)', days };
  return { label: 'Au repos', color: 'var(--warn)', days };
}

function beanDaysAgoLabel(dStr) {
  if (!dStr) return '';
  const d = Math.floor((Date.now() - new Date(dStr).getTime()) / 86400000);
  if (d <= 0) return "aujourd'hui";
  if (d === 1) return 'hier';
  return `il y a ${d}j`;
}

// Sac de café SVG — glyph avec gradient selon torréfaction
function beanBagSVG(color, roast, size) {
  const r = (roast || '').toLowerCase();
  const light = r.includes('clair') ? '#e8c89a'
              : r.includes('medium') ? '#c89668'
              : r.includes('foncé') || r.includes('fonce') || r.includes('dark') || r.includes('espresso') ? '#8a5a3a'
              : '#c89668';
  const mid = color || '#8c4a28';
  const dark = r.includes('clair') ? '#6a3a1e'
             : r.includes('medium') ? '#3a1d0e'
             : '#120705';
  const gid = 'bg-' + Math.random().toString(36).slice(2, 8);
  const folId = gid + '-f';
  const labId = gid + '-l';
  const s = size || 48;
  return `<svg width="${s}" height="${s * 1.15}" viewBox="0 0 60 70" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="${gid}" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0" stop-color="${light}"/>
        <stop offset="0.45" stop-color="${mid}"/>
        <stop offset="1" stop-color="${dark}"/>
      </linearGradient>
      <linearGradient id="${folId}" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0" stop-color="${light}" stop-opacity="0.95"/>
        <stop offset="1" stop-color="${mid}"/>
      </linearGradient>
      <linearGradient id="${labId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f5e9d0"/>
        <stop offset="1" stop-color="#d9c39a"/>
      </linearGradient>
    </defs>
    <ellipse cx="30" cy="66" rx="17" ry="2.2" fill="rgba(0,0,0,0.3)"/>
    <path d="M 14 15 Q 13 35 10 62 Q 10 65 13 65 L 47 65 Q 50 65 50 62 Q 47 35 46 15 Z" fill="url(#${gid})" stroke="rgba(0,0,0,0.35)" stroke-width="0.5" stroke-linejoin="round"/>
    <path d="M 14 15 Q 12 12 14 9 Q 22 7 30 7 Q 38 7 46 9 Q 48 12 46 15 L 42 13 Q 30 11 18 13 Z" fill="url(#${folId})" stroke="rgba(0,0,0,0.3)" stroke-width="0.5" stroke-linejoin="round"/>
    <path d="M 14 15 Q 30 18 46 15" stroke="rgba(0,0,0,0.3)" stroke-width="0.6" fill="none"/>
    <path d="M 30 18 Q 29.5 40 29 63" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" fill="none"/>
    <path d="M 19 18 Q 17 42 15 63" stroke="rgba(0,0,0,0.18)" stroke-width="0.4" fill="none"/>
    <path d="M 41 18 Q 43 42 45 63" stroke="rgba(0,0,0,0.18)" stroke-width="0.4" fill="none"/>
    <path d="M 16 17 Q 14 40 13 62" stroke="rgba(255,255,255,0.2)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <g opacity="0.25" stroke="rgba(0,0,0,0.3)" stroke-width="0.25" fill="none">
      <path d="M 14 25 Q 30 27 46 25"/>
      <path d="M 13 32 Q 30 34 47 32"/>
      <path d="M 12 40 Q 30 42 48 40"/>
      <path d="M 11 48 Q 30 50 49 48"/>
      <path d="M 10 56 Q 30 58 50 56"/>
    </g>
    <circle cx="30" cy="40" r="8.5" fill="url(#${labId})" stroke="rgba(0,0,0,0.3)" stroke-width="0.6"/>
    <ellipse cx="30" cy="40" rx="2.5" ry="3.5" fill="${dark}"/>
    <path d="M 30 37 Q 30 40 30 43" stroke="${light}" stroke-width="0.6" fill="none" stroke-linecap="round"/>
    <path d="M 25 8 Q 25 4 28 4 Q 30 4 30 6 Q 30 4 32 4 Q 35 4 35 8" stroke="${dark}" stroke-width="0.9" fill="none" stroke-linecap="round" opacity="0.7"/>
  </svg>`;
}
