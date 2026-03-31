const IC = {
  espresso: '<svg width="20" height="20" viewBox="0 0 20 20"><rect x="4" y="6" width="12" height="8" rx="2" fill="none" stroke="#ae5630" stroke-width="1.2"/><path d="M16 9h2a1 1 0 011 1v0a1 1 0 01-1 1h-2" fill="none" stroke="#ae5630" stroke-width="1.2"/><line x1="7" y1="4" x2="7" y2="6" stroke="#ae5630" stroke-width="1.2" stroke-linecap="round"/><line x1="10" y1="3" x2="10" y2="6" stroke="#ae5630" stroke-width="1.2" stroke-linecap="round"/><line x1="13" y1="4" x2="13" y2="6" stroke="#ae5630" stroke-width="1.2" stroke-linecap="round"/></svg>',
  chemex: '<svg width="20" height="20" viewBox="0 0 20 20"><path d="M7 3h6v4l3 9H4l3-9V3z" fill="none" stroke="#ae5630" stroke-width="1.2" stroke-linejoin="round"/><line x1="6" y1="10" x2="14" y2="10" stroke="#ae5630" stroke-width="1.2"/></svg>',
  v60: '<svg width="20" height="20" viewBox="0 0 20 20"><path d="M5 4h10l-2 12H7L5 4z" fill="none" stroke="#ae5630" stroke-width="1.2" stroke-linejoin="round"/><line x1="8" y1="4" x2="12" y2="4" stroke="#ae5630" stroke-width="1.2"/></svg>',
  french: '<svg width="20" height="20" viewBox="0 0 20 20"><rect x="5" y="4" width="10" height="13" rx="1" fill="none" stroke="#ae5630" stroke-width="1.2"/><line x1="10" y1="2" x2="10" y2="4" stroke="#ae5630" stroke-width="1.5" stroke-linecap="round"/><line x1="7" y1="8" x2="13" y2="8" stroke="#ae5630" stroke-width="1.2"/></svg>'
};

const gLabel = v => {
  if (v <= 5) return 'extra fin';
  if (v <= 10) return 'très fin';
  if (v <= 16) return 'fin';
  if (v <= 22) return 'moyen';
  if (v <= 28) return 'moyen-grossier';
  if (v <= 34) return 'grossier';
  return 'très grossier';
};

const gDefault = r => {
  if (!r) return 20;
  const g = r.grind || '';
  if (g.includes('Extra')) return 3;
  if (g.includes('s fin')) return 8;
  if (g.includes('oyen-fin')) return 14;
  if (g.includes('oyen-grossier')) return 26;
  if (g.includes('s grossier')) return 36;
  if (g.includes('rossier')) return 32;
  if (g.includes('oyen')) return 20;
  return 20;
};

const RR = {
  espresso: {
    name: "Espresso machine",
    subs: {
      ristretto: { name: "Ristretto", desc: "Court et concentré", dose: [7, 9], dd: 7, ds: .5, ratio: [1, 1.5], rd: 1, rs: .1, grind: "Extra fin", temp: "92-96°C · 9 bars", steps: [{ n: "Pré-infusion", d: 3 }, { n: "Extraction", d: 15 }], liquids: [{ name: "Eau", def: 15, min: 7, max: 30 }] },
      simple: { name: "Espresso simple", desc: "Shot classique", dose: [7, 10], dd: 7, ds: .5, ratio: [1.5, 2.5], rd: 2, rs: .1, grind: "Très fin", temp: "93-96°C · 9 bars", steps: [{ n: "Pré-infusion", d: 5 }, { n: "Extraction", d: 25 }], liquids: [{ name: "Eau", def: 14, min: 7, max: 30 }] },
      double: { name: "Espresso double", desc: "Double shot standard", dose: [14, 20], dd: 18, ds: .5, ratio: [1.5, 2.5], rd: 2, rs: .1, grind: "Très fin", temp: "93-96°C · 9 bars", steps: [{ n: "Pré-infusion", d: 5 }, { n: "Extraction", d: 25 }], liquids: [{ name: "Eau", def: 36, min: 20, max: 60 }] },
      allonge: { name: "Allongé", desc: "Espresso étiré", dose: [14, 20], dd: 18, ds: .5, ratio: [3, 5], rd: 4, rs: .5, grind: "Très fin", temp: "93-96°C", steps: [{ n: "Pré-infusion", d: 5 }, { n: "Extraction", d: 35 }], liquids: [{ name: "Eau", def: 72, min: 40, max: 120 }] },
      americano: { name: "Americano", desc: "Double + eau chaude", dose: [14, 20], dd: 18, ds: .5, ratio: [1.5, 2.5], rd: 2, rs: .1, grind: "Très fin", temp: "93-96°C", steps: [{ n: "Pré-infusion", d: 5 }, { n: "Extraction", d: 25 }], liquids: [{ name: "Eau (shot)", def: 36, min: 20, max: 60 }, { name: "Eau chaude", def: 150, min: 80, max: 250 }] },
      cortado: { name: "Cortado", desc: "Espresso + lait égal", dose: [14, 20], dd: 18, ds: .5, ratio: [1.5, 2.5], rd: 2, rs: .1, grind: "Très fin", temp: "93-96°C", steps: [{ n: "Pré-infusion", d: 5 }, { n: "Extraction", d: 25 }], liquids: [{ name: "Eau (shot)", def: 36, min: 20, max: 60 }, { name: "Lait", def: 30, min: 15, max: 60 }] },
      macchiato: { name: "Macchiato", desc: "Espresso + mousse", dose: [14, 20], dd: 18, ds: .5, ratio: [1.5, 2.5], rd: 2, rs: .1, grind: "Très fin", temp: "93-96°C", steps: [{ n: "Pré-infusion", d: 5 }, { n: "Extraction", d: 25 }], liquids: [{ name: "Eau (shot)", def: 36, min: 20, max: 60 }, { name: "Mousse", def: 15, min: 5, max: 30 }] },
      flatwhite: { name: "Flat white", desc: "Double + micro-mousse", dose: [14, 20], dd: 18, ds: .5, ratio: [1.5, 2.5], rd: 2, rs: .1, grind: "Très fin", temp: "93-96°C", steps: [{ n: "Pré-infusion", d: 5 }, { n: "Extraction", d: 25 }], liquids: [{ name: "Eau (shot)", def: 36, min: 20, max: 60 }, { name: "Lait", def: 110, min: 80, max: 160 }, { name: "Mousse", def: 10, min: 5, max: 30 }] },
      cappuccino: { name: "Cappuccino", desc: "⅓+⅓+⅓", dose: [14, 20], dd: 18, ds: .5, ratio: [1.5, 2.5], rd: 2, rs: .1, grind: "Très fin", temp: "93-96°C", steps: [{ n: "Pré-infusion", d: 5 }, { n: "Extraction", d: 25 }], liquids: [{ name: "Eau (shot)", def: 36, min: 20, max: 60 }, { name: "Lait", def: 60, min: 30, max: 120 }, { name: "Mousse", def: 60, min: 30, max: 120 }] },
      latte: { name: "Latte", desc: "Double + lait crémeux", dose: [14, 20], dd: 18, ds: .5, ratio: [1.5, 2.5], rd: 2, rs: .1, grind: "Très fin", temp: "93-96°C", steps: [{ n: "Pré-infusion", d: 5 }, { n: "Extraction", d: 25 }], liquids: [{ name: "Eau (shot)", def: 36, min: 20, max: 60 }, { name: "Lait", def: 180, min: 120, max: 300 }, { name: "Mousse", def: 20, min: 5, max: 50 }] }
    }
  },
  chemex: {
    name: "Chemex",
    subs: {
      classique: { name: "Chemex classique", desc: "Infusion douce et claire", dose: [25, 50], dd: 34, ds: 1, ratio: [14, 17], rd: 15, rs: .5, grind: "Moyen-grossier", temp: "93-96°C", steps: [{ n: "Rincer filtre", d: 15 }, { n: "Bloom", d: 35 }, { n: "1er versement", d: 30 }, { n: "2e versement", d: 30 }, { n: "3e versement", d: 30 }, { n: "Drawdown", d: 90 }], liquids: [{ name: "Eau", def: 510, min: 300, max: 850 }] },
      coldbrew: { name: "Cold brew Chemex", desc: "Infusion froide 12-24h", dose: [60, 100], dd: 80, ds: 5, ratio: [5, 8], rd: 6, rs: .5, grind: "Très grossier", temp: "Eau froide", steps: [{ n: "Verser", d: 30 }, { n: "Mélanger", d: 15 }], liquids: [{ name: "Eau froide", def: 480, min: 300, max: 800 }], extra: "12-24h au frigo" }
    }
  },
  v60: {
    name: "V60 pour over",
    subs: {
      classique: { name: "V60 classique", desc: "Saveurs vives", dose: [12, 30], dd: 15, ds: 1, ratio: [14, 18], rd: 16, rs: .5, grind: "Moyen-fin", temp: "92-96°C", steps: [{ n: "Bloom", d: 30 }, { n: "1er versement", d: 30 }, { n: "2e versement", d: 30 }, { n: "3e versement", d: 30 }, { n: "Drawdown", d: 60 }], liquids: [{ name: "Eau", def: 240, min: 170, max: 540 }] },
      iced: { name: "V60 iced japonais", desc: "Pour over sur glace", dose: [15, 25], dd: 20, ds: 1, ratio: [10, 14], rd: 12, rs: .5, grind: "Moyen-fin", temp: "92-96°C+glace", steps: [{ n: "Glace", d: 10 }, { n: "Bloom", d: 30 }, { n: "1er versement", d: 30 }, { n: "2e versement", d: 30 }, { n: "Drawdown", d: 45 }], liquids: [{ name: "Eau chaude", def: 144, min: 100, max: 250 }, { name: "Glace", def: 96, min: 60, max: 150 }] }
    }
  },
  french: {
    name: "French press",
    subs: {
      classique: { name: "French press", desc: "Corps riche", dose: [15, 60], dd: 30, ds: 1, ratio: [12, 17], rd: 15, rs: .5, grind: "Grossier", temp: "93-96°C", steps: [{ n: "Verser l'eau", d: 10 }, { n: "Infusion", d: 210 }, { n: "Briser croûte", d: 10 }, { n: "Attendre", d: 30 }], liquids: [{ name: "Eau", def: 450, min: 180, max: 1000 }] },
      coldbrew: { name: "Cold brew piston", desc: "Froide 12-18h", dose: [60, 120], dd: 80, ds: 5, ratio: [5, 8], rd: 7, rs: .5, grind: "Très grossier", temp: "Eau froide", steps: [{ n: "Verser", d: 15 }, { n: "Mélanger", d: 15 }], liquids: [{ name: "Eau froide", def: 560, min: 300, max: 960 }], extra: "12-18h au frigo" }
    }
  }
};

const FL = ["Amer", "Sucré", "Caramel", "Chocolat", "Noisette", "Fruité", "Floral", "Fumé", "Salé", "Épicé", "Terreux", "Acide"];
const AT = ["Chocolat noir", "Noisette", "Caramel", "Fruits rouges", "Agrumes", "Floral", "Vanille", "Épicé", "Boisé", "Miel", "Beurre", "Fumé"];
