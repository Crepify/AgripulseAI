// Soil health mock data per state — ICAR-based approximations
export const SOIL_DATA = {
  'Punjab': { type: 'Alluvial', ph: '7.2-8.0', nitrogen: 'Low', phosphorus: 'Medium', potassium: 'High', organic: '0.4%', recommendation: 'Add 5t FYM/acre + reduce urea by 10%. Gypsum for sodic patches.' },
  'Maharashtra': { type: 'Black Cotton (Regur)', ph: '6.5-8.0', nitrogen: 'Low', phosphorus: 'Low', potassium: 'High', organic: '0.5%', recommendation: 'Add 10kg ZnSO4/acre for cotton. Deep ploughing for drainage.' },
  'Karnataka': { type: 'Red Laterite', ph: '5.5-6.5', nitrogen: 'Low', phosphorus: 'Medium', potassium: 'Medium', organic: '0.6%', recommendation: 'Lime application 200kg/acre if pH <5.5. Add biofertilizer.' },
  'Tamil Nadu': { type: 'Red Loam', ph: '6.0-7.5', nitrogen: 'Low', phosphorus: 'Medium', potassium: 'Medium', organic: '0.5%', recommendation: 'Tank silt application 10t/acre. Use Azospirillum for rice.' },
  'Gujarat': { type: 'Sandy Loam', ph: '7.5-8.5', nitrogen: 'Low', phosphorus: 'Low', potassium: 'Medium', organic: '0.3%', recommendation: 'Gypsum + FYM. Drip irrigation for groundnut.' },
  'default': { type: 'Alluvial', ph: '6.5-7.5', nitrogen: 'Low', phosphorus: 'Medium', potassium: 'Medium', organic: '0.5%', recommendation: 'Add 5t FYM/acre. Soil test every 2 years. Use neem-coated urea.' }
};

export function getSoilForState(state) {
  return SOIL_DATA[state] || SOIL_DATA['default'];
}

export function getFertilizerAdjustment(soil, crop) {
  // Simple logic: adjust NPK based on soil + crop
  const base = { N: 100, P: 50, K: 50 }; // kg/acre generic
  if (soil.nitrogen === 'Low') base.N += 20;
  if (soil.phosphorus === 'Low') base.P += 15;
  if (soil.potassium === 'Low') base.K += 15;
  if (crop === 'Rice') base.N += 10;
  if (crop === 'Cotton') base.K += 20;
  return base;
}
