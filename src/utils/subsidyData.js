// Subsidy & scheme data per state — PM-Kisan, fertilizer, etc.
export const SUBSIDY_SCHEMES = [
  { id: 'pm-kisan', name: 'PM-KISAN Samman Nidhi', amount: '₹6,000/year', eligibility: 'All landholding farmers', docs: 'Aadhaar + Land record', link: 'https://pmkisan.gov.in', states: ['all'], category: 'Income Support' },
  { id: 'pmfby', name: 'PM Fasal Bima Yojana (Crop Insurance)', amount: 'Up to 2% premium', eligibility: 'All farmers', docs: 'Aadhaar + Bank + Land', link: 'https://pmfby.gov.in', states: ['all'], category: 'Insurance' },
  { id: 'kcc', name: 'Kisan Credit Card', amount: 'Up to ₹3 lakh at 4% interest', eligibility: 'All farmers', docs: 'Aadhaar + Land', link: 'https://www.myscheme.gov.in', states: ['all'], category: 'Credit' },
  { id: 'soil-health', name: 'Soil Health Card Scheme', amount: 'Free soil testing', eligibility: 'All farmers', docs: 'Aadhaar', link: 'https://soilhealth.dac.gov.in', states: ['all'], category: 'Soil' },
  { id: 'maharashtra-bali', name: 'Maharashtra Baliraja Chetna', amount: '₹5,000/acre', eligibility: 'Maharashtra farmers', docs: '7/12 + Aadhaar', link: '#', states: ['Maharashtra'], category: 'State' },
  { id: 'punjab-diversification', name: 'Punjab Crop Diversification', amount: '₹17,500/ha for less water crops', eligibility: 'Punjab paddy farmers', docs: 'Land record', link: '#', states: ['Punjab'], category: 'State' },
  { id: 'karnataka-raitha', name: 'Karnataka Raitha Shakti', amount: 'Diesel subsidy ₹250/acre', eligibility: 'Karnataka small farmers', docs: 'RTC + Aadhaar', link: '#', states: ['Karnataka'], category: 'Fuel' },
  { id: 'tamilnadu-millet', name: 'TN Millet Mission', amount: '₹3,000/acre for millets', eligibility: 'Tamil Nadu millet growers', docs: 'Chitta + Aadhaar', link: '#', states: ['Tamil Nadu'], category: 'State' },
  { id: 'fertilizer-subsidy', name: 'Fertilizer Subsidy (Urea/DAP)', amount: '50% subsidy via DBT', eligibility: 'All farmers via POS', docs: 'Aadhaar biometric', link: '#', states: ['all'], category: 'Input' },
  { id: 'solar-pump', name: 'PM-KUSUM Solar Pump', amount: '90% subsidy on solar pump', eligibility: 'All farmers', docs: 'Aadhaar + Land', link: 'https://mnre.gov.in', states: ['all'], category: 'Energy' },
];

export function getSubsidiesForState(state, aadhaarVerified) {
  const normalized = (state || '').toLowerCase();
  return SUBSIDY_SCHEMES.filter(s => {
    if (s.states.includes('all')) return true;
    return s.states.some(st => normalized.includes(st.toLowerCase()) || st.toLowerCase().includes(normalized));
  }).map(s => ({
    ...s,
    eligible: aadhaarVerified ? 'Eligible — Aadhaar verified' : 'Aadhaar verification required for DBT',
    priority: aadhaarVerified ? 1 : 2
  })).sort((a,b) => a.priority - b.priority);
}
