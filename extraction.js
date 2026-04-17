// ═══════════════════════════════════════════════════════════════════════════
// extraction.js — Coffee & Cream v10
// Calcul du temps cible d'extraction + verdict selon dose, ratio et méthode
// ═══════════════════════════════════════════════════════════════════════════

// Config par méthode. Les clés correspondent aux catégories RR dans recipes.js
// (espresso, chemex, v60, french) pour un lookup direct.
const EXTRACTION_CONFIG = {
  espresso: {
    baseDose: 18,
    baseTemps: 27,          // 27 sec pour 18g à ratio 1:2
    secondesParGramme: 1.2, // +1.2 sec par gramme supplémentaire
    toleranceMin: -3,
    toleranceMax: 3,
    label: 'Espresso'
  },
  chemex: {
    baseDose: 30,
    baseTemps: 270,         // 4:30 pour 30g → 500ml
    secondesParGramme: 5,
    toleranceMin: -30,
    toleranceMax: 30,
    label: 'Chemex'
  },
  v60: {
    baseDose: 15,
    baseTemps: 150,         // 2:30 pour 15g → 250ml
    secondesParGramme: 4,
    toleranceMin: -20,
    toleranceMax: 20,
    label: 'V60'
  },
  french: {
    baseDose: 30,
    baseTemps: 240,         // 4:00 immersion standard
    secondesParGramme: 0,   // immersion → temps indépendant de la dose
    toleranceMin: -30,
    toleranceMax: 30,
    label: 'French press'
  }
};

/**
 * Calcule la zone cible d'extraction pour une méthode donnée.
 * @param {string} methode  - clé de EXTRACTION_CONFIG ('espresso', 'chemex', etc.)
 * @param {number} doseGrammes - dose de café en grammes
 * @param {number} ratio    - ratio (pour extension future, non utilisé pour l'instant)
 * @returns {{min:number,ideal:number,max:number,label:string}|null}
 *   null si méthode inconnue (ex: cold brew)
 */
function calculerTempsCible(methode, doseGrammes, ratio) {
  const m = EXTRACTION_CONFIG[methode];
  if (!m) return null;
  const ajustement = (doseGrammes - m.baseDose) * m.secondesParGramme;
  const ideal = Math.round(m.baseTemps + ajustement);
  return {
    min: Math.max(1, ideal + m.toleranceMin),
    ideal,
    max: ideal + m.toleranceMax,
    label: m.label
  };
}

/**
 * Détermine le verdict de l'extraction selon le temps écoulé et la zone cible.
 * @param {number} tempsEcoule - temps écoulé en secondes
 * @param {object} cible      - résultat de calculerTempsCible()
 * @returns {'under'|'target'|'over'|null}
 */
function verdictExtraction(tempsEcoule, cible) {
  if (!cible) return null;
  if (tempsEcoule < cible.min) return 'under';
  if (tempsEcoule > cible.max) return 'over';
  return 'target';
}

/**
 * Retourne la couleur associée au verdict (pour UI timer).
 */
function couleurVerdict(verdict) {
  switch (verdict) {
    case 'under':  return '#9a8876';  // gris : pas encore dans la zone
    case 'target': return '#3b6b4d';  // vert : dans la cible
    case 'over':   return '#c04a2a';  // rouge : sur-extrait
    default:       return '#7a6b5a';
  }
}

/**
 * Verdict UI plus nuancé pendant l'extraction en direct (inclut 'warning'
 * quand on dépasse max de moins de 5 secondes).
 */
function verdictLive(tempsEcoule, cible) {
  if (!cible) return null;
  if (tempsEcoule < cible.min) return 'under';
  if (tempsEcoule <= cible.max) return 'target';
  if (tempsEcoule <= cible.max + 5) return 'warning';
  return 'over';
}

function couleurLive(v) {
  switch (v) {
    case 'under':   return '#9a8876';  // gris
    case 'target':  return '#3b6b4d';  // vert
    case 'warning': return '#c48a2a';  // jaune/orange
    case 'over':    return '#c04a2a';  // rouge
    default:        return '#3b2e22';
  }
}

/**
 * Label en français pour affichage dans l'écran dégustation.
 */
function labelVerdict(v) {
  switch (v) {
    case 'under':  return 'Sous-extrait';
    case 'target': return 'Dans la cible';
    case 'over':   return 'Sur-extrait';
    default:       return '';
  }
}

/**
 * Formatage mm:ss pour un nombre de secondes.
 */
function fmtSec(s) {
  if (s == null) return '--';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m + ':' + String(sec).padStart(2, '0');
}
