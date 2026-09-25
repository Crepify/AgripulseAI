// Crop calendar automation — sowing/harvesting suggestions per state + month
export const CROP_CALENDAR = {
  'Punjab': {
    'Rabi': [{ crop: 'Wheat', sowing: 'Nov-Dec', harvest: 'Apr-May', note: 'Best time now for Rabi wheat' }, { crop: 'Mustard', sowing: 'Oct-Nov', harvest: 'Feb-Mar' }],
    'Kharif': [{ crop: 'Rice', sowing: 'Jun-Jul', harvest: 'Oct-Nov' }, { crop: 'Cotton', sowing: 'May-Jun', harvest: 'Oct-Dec' }],
    'Zaid': [{ crop: 'Maize', sowing: 'Feb-Mar', harvest: 'May-Jun' }]
  },
  'Maharashtra': {
    'Rabi': [{ crop: 'Wheat', sowing: 'Nov-Dec', harvest: 'Mar-Apr' }, { crop: 'Gram', sowing: 'Oct-Nov', harvest: 'Feb-Mar' }],
    'Kharif': [{ crop: 'Soybean', sowing: 'Jun-Jul', harvest: 'Oct-Nov' }, { crop: 'Cotton', sowing: 'Jun-Jul', harvest: 'Dec-Jan' }],
    'Zaid': [{ crop: 'Groundnut', sowing: 'Jan-Feb', harvest: 'May-Jun' }]
  },
  'Karnataka': {
    'Rabi': [{ crop: 'Wheat', sowing: 'Oct-Nov', harvest: 'Feb-Mar' }, { crop: 'Bengal Gram', sowing: 'Oct-Nov', harvest: 'Jan-Feb' }],
    'Kharif': [{ crop: 'Rice', sowing: 'Jun-Jul', harvest: 'Nov-Dec' }, { crop: 'Maize', sowing: 'Jun-Jul', harvest: 'Sep-Oct' }],
    'Zaid': [{ crop: 'Watermelon', sowing: 'Jan-Feb', harvest: 'Apr-May' }]
  },
  'default': {
    'Rabi': [{ crop: 'Wheat', sowing: 'Nov-Dec', harvest: 'Apr-May' }, { crop: 'Mustard', sowing: 'Oct-Nov', harvest: 'Feb-Mar' }],
    'Kharif': [{ crop: 'Rice', sowing: 'Jun-Jul', harvest: 'Oct-Nov' }, { crop: 'Cotton', sowing: 'May-Jun', harvest: 'Oct-Dec' }],
    'Zaid': [{ crop: 'Maize', sowing: 'Feb-Mar', harvest: 'May-Jun' }]
  }
};

export function getCurrentSeason() {
  const m = new Date().getMonth() + 1; // 1-12
  if (m >= 6 && m <= 10) return 'Kharif';
  if (m >= 11 || m <= 3) return 'Rabi';
  return 'Zaid';
}

export function getCalendarForState(state) {
  const normalized = (state || '').trim();
  // Try exact match, else default
  const data = CROP_CALENDAR[normalized] || CROP_CALENDAR['default'];
  const season = getCurrentSeason();
  const suggestions = data[season] || data['Kharif'];
  const month = new Date().toLocaleString('en', { month: 'long' });
  return { season, month, state: normalized || 'Your State', suggestions, all: data };
}

export function getSowingAlert(state) {
  const cal = getCalendarForState(state);
  if (!cal.suggestions.length) return null;
  const top = cal.suggestions[0];
  return `Now is sowing time for ${top.crop} in ${cal.state} (${cal.season} season, ${top.sowing})`;
}
