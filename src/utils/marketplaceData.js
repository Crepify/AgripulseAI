// Marketplace for farmers — seeds, tractors, equipment
const MARKET_KEY = 'ap_marketplace_v1';

export const DEFAULT_LISTINGS = [
  { id: 1, type: 'seed', title: 'Tomato Hybrid Seeds - 100g', crop: 'Tomato', qty: '100g packet', price: 350, seller: 'Ramesh, Mandya', location: 'Mandya, Karnataka', contact: '98450 12345', verified: true, image: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400', description: 'High yield, disease resistant, 90 days harvest' },
  { id: 2, type: 'tractor', title: 'Mahindra 575 DI - 2019 Model', crop: 'Tractor', qty: '1 unit', price: 450000, seller: 'Suresh, Pune', location: 'Pune, Maharashtra', contact: '94480 67890', verified: true, image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400', description: '45 HP, 3200 hours, well maintained, papers clear' },
  { id: 3, type: 'equipment', title: '15L Battery Sprayer - New', crop: 'Sprayer', qty: '1 unit', price: 2800, seller: 'Agri Store, Nashik', location: 'Nashik, Maharashtra', contact: '97310 54321', verified: true, image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=400', description: 'Double motor, 8h battery, 1 year warranty' },
  { id: 4, type: 'seed', title: 'Wheat HD-2967 Seeds - 10kg', crop: 'Wheat', qty: '10kg bag', price: 1200, seller: 'Gurpreet, Ludhiana', location: 'Ludhiana, Punjab', contact: '98150 11223', verified: false, image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', description: 'Punjab Agricultural University certified' },
  { id: 5, type: 'fertilizer', title: 'Vermicompost - 50kg', crop: 'Organic', qty: '50kg', price: 800, seller: 'Lakshmi, Mysore', location: 'Mysore, Karnataka', contact: '98451 22334', verified: true, image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=400', description: 'Pure earthworm compost, NPK rich' },
];

export function getMarketplaceListings() {
  try {
    const raw = localStorage.getItem(MARKET_KEY);
    if (!raw) {
      localStorage.setItem(MARKET_KEY, JSON.stringify(DEFAULT_LISTINGS));
      return DEFAULT_LISTINGS;
    }
    return JSON.parse(raw);
  } catch { return DEFAULT_LISTINGS; }
}

export function addListing(listing) {
  try {
    const listings = getMarketplaceListings();
    const newListing = { ...listing, id: Date.now(), verified: false, seller: listing.seller || 'You' };
    listings.unshift(newListing);
    localStorage.setItem(MARKET_KEY, JSON.stringify(listings));
    return listings;
  } catch { return getMarketplaceListings(); }
}

export function deleteListing(id) {
  try {
    const listings = getMarketplaceListings().filter(l => l.id !== id);
    localStorage.setItem(MARKET_KEY, JSON.stringify(listings));
    return listings;
  } catch { return getMarketplaceListings(); }
}

export function searchListings(query, type) {
  const listings = getMarketplaceListings();
  return listings.filter(l => {
    const matchesQuery = !query || `${l.title} ${l.crop} ${l.description}`.toLowerCase().includes(query.toLowerCase());
    const matchesType = !type || type === 'all' || l.type === type;
    return matchesQuery && matchesType;
  });
}
