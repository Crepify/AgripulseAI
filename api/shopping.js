// Pure Google Shopping API - returns ONLY shopping list, no organic results
// Uses SerpAPI Google Shopping engine
// Query: ?q=Apple Apple scab pesticide or ?product=saaf

export default async function handler(req, res) {
  const { q, product, query } = req.query;
  const searchQuery = q || product || query || 'SAAF Fungicide';
  
  // Get SerpAPI key from env or query param (for testing)
  const serpApiKey = process.env.SERPAPI_KEY || req.query.api_key || req.query.serpapi_key;
  
  // If no SerpAPI key, return static shopping list from our verified DB
  if (!serpApiKey) {
    const key = searchQuery.toLowerCase();
    let matchedKey = 'generic';
    if (key.includes('saaf') || key.includes('upl') || key.includes('shopping') || key.includes('fungicide')) matchedKey = 'upl-saaf';
    else if (key.includes('bayer') || key.includes('folicur') || key.includes('tebuconazole')) matchedKey = 'bayer-folicur';
    else if (key.includes('syngenta') || key.includes('amistar')) matchedKey = 'syngenta-amistar';
    else if (key.includes('apple') && key.includes('scab')) matchedKey = 'apple-scab';
    else if (key.includes('supercrop') || key.includes('fake')) matchedKey = 'supercrop-500';

    const STATIC_SHOPPING = {
      'upl-saaf': [
        { position: 1, title: 'Saaf Fungicide 100 Gms', price: '₹102', extracted_price: 102, source: 'BigHaat', link: 'https://www.bighaat.com/products/saaf-fungicide', delivery: 'Free delivery', extensions: ['100 Gms'], rating: 4.5, reviews: 120, tag: 'Best Seller' },
        { position: 2, title: 'Saaf Fungicide 20 Gram', price: '₹50', extracted_price: 50, source: 'MyOwnGarden Lo', link: 'https://myowngarden.com', delivery: 'Free delivery', rating: 4.6, reviews: 8, extensions: ['20 Gram'] },
        { position: 3, title: 'Sovata All insects Remover', price: '₹134', extracted_price: 134, source: 'Amazon.in', link: 'https://www.amazon.in/s?k=SAAF+Fungicide', delivery: 'Free delivery', extensions: ['Organic Powerful'] },
        { position: 4, title: 'IIL Prism Fungicide', price: '₹880', extracted_price: 880, source: 'AgriBegri', link: 'https://www.agribegri.com', delivery: 'Free delivery, 7-day returns', rating: 4.8, reviews: 12 },
        { position: 5, title: 'Neem Oil 0', price: '₹249', extracted_price: 249, source: 'Amazon.in', link: 'https://www.amazon.in/s?k=Neem+Oil', delivery: 'Free delivery' },
        { position: 6, title: 'Confidor Insecticide - Imidacloprid 17.8% SL', price: '₹392', extracted_price: 392, source: 'BigHaat', link: 'https://www.bighaat.com', delivery: 'Free delivery', rating: 4.4 },
      ],
      'bayer-folicur': [
        { position: 1, title: 'Bayer Folicur Tebuconazole 25.9% EC 250 ml', price: '₹840', extracted_price: 840, source: 'BigHaat', link: 'https://www.bighaat.com/products/bayer-folicur', delivery: 'Free delivery', rating: 4.7, reviews: 89 },
        { position: 2, title: 'Bayer Folicur 250 ml', price: '₹890', extracted_price: 890, source: 'Amazon.in', link: 'https://www.amazon.in/s?k=Bayer+Folicur', delivery: 'Free delivery', rating: 4.5 },
        { position: 3, title: 'Bayer Folicur', price: '₹820', extracted_price: 820, source: 'AgriBegri', link: 'https://www.agribegri.com', delivery: 'Free delivery', rating: 4.6 },
      ],
      'syngenta-amistar': [
        { position: 1, title: 'Syngenta Amistar Top 200 ml', price: '₹1,250', extracted_price: 1250, source: 'BigHaat', link: 'https://www.bighaat.com/products/syngenta-amistar-top', delivery: 'Free delivery', rating: 4.8 },
        { position: 2, title: 'Syngenta Amistar Top', price: '₹1,320', extracted_price: 1320, source: 'Amazon.in', link: 'https://www.amazon.in/s?k=Syngenta+Amistar+Top', delivery: 'Free delivery', rating: 4.6 },
      ],
      'apple-scab': [
        { position: 1, title: 'Bayer Folicur - Best for Apple Scab', price: '₹840', extracted_price: 840, source: 'BigHaat', link: 'https://www.bighaat.com', delivery: 'Free delivery', rating: 4.7, tag: 'For Apple Scab' },
        { position: 2, title: 'Mycorakshak Myclobutanil 10% WP for Powdery Mildew & Apple Scab', price: '₹1,920', extracted_price: 1920, source: 'Krishikranti Organic', link: 'https://krishikranti.com', delivery: 'Free delivery', rating: 4.5 },
        { position: 3, title: 'Saaf Fungicide 100 Gms - For Apple Scab', price: '₹102', extracted_price: 102, source: 'BigHaat', link: 'https://www.bighaat.com', delivery: 'Free delivery', rating: 4.5 },
        { position: 4, title: 'Neem Oil Spray for Apple Scab - Organic', price: '₹249', extracted_price: 249, source: 'Amazon.in', link: 'https://www.amazon.in/s?k=Neem+Oil+Apple+Scab', delivery: 'Free delivery', extensions: ['Organic'] },
        { position: 5, title: 'Captan 50% WP - Green tips Apple Spray', price: '₹350', extracted_price: 350, source: 'AgriBegri', link: 'https://www.agribegri.com', delivery: 'Free delivery', rating: 4.6 },
      ],
      'generic': [
        { position: 1, title: 'Saaf Fungicide 100 Gms', price: '₹102', extracted_price: 102, source: 'BigHaat', link: 'https://www.bighaat.com', delivery: 'Free delivery' },
      ]
    };

    const shopping_results = STATIC_SHOPPING[matchedKey] || STATIC_SHOPPING['generic'];

    return res.status(200).json({
      search_information: {
        query_displayed: searchQuery,
        engine: 'google_shopping (static demo)',
        total_results: shopping_results.length,
      },
      shopping_results: shopping_results,
      // Only shopping, no organic, no videos
      note: 'This is static demo shopping list. Add SERPAPI_KEY env var for live Google Shopping results.',
    });
  }

  // Live SerpAPI Google Shopping - ONLY shopping_results
  try {
    const serpUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(searchQuery)}&location=India&hl=en&gl=in&api_key=${serpApiKey}`;
    const r = await fetch(serpUrl);
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: 'SerpAPI failed', details: err });
    }
    const data = await r.json();
    
    // Return ONLY shopping_results, no organic, no videos, no inline
    const shopping_only = {
      search_information: {
        query_displayed: data.search_information?.query_displayed || searchQuery,
        query: searchQuery,
        engine: 'google_shopping',
        total_results: data.search_information?.total_results || data.shopping_results?.length || 0,
      },
      shopping_results: (data.shopping_results || []).map(item => ({
        position: item.position,
        title: item.title,
        product_link: item.product_link,
        product_id: item.product_id,
        serpapi_product_api: item.serpapi_product_api,
        price: item.price,
        extracted_price: item.extracted_price,
        source: item.source,
        source_icon: item.source_icon,
        link: item.link,
        delivery: item.delivery,
        extensions: item.extensions,
        rating: item.rating,
        reviews: item.reviews,
        tag: item.tag,
        thumbnail: item.thumbnail,
      })),
    };

    return res.status(200).json(shopping_only);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch shopping results', details: e.message });
  }
}
