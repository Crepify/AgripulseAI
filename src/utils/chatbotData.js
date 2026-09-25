// Chatbot knowledge base — answers farmer queries in mother tongue
export const CSC_CENTERS = [
  { name: 'Common Service Center - Mandya', address: 'Near Bus Stand, Mandya', phone: '1800 3000 3468', services: 'Aadhaar, PM-Kisan, Soil Health Card', lat: 12.52, lon: 76.89, state: 'Karnataka' },
  { name: 'CSC - Pune Rural', address: 'Taluka Office Complex, Pune', phone: '1800 3000 3468', services: 'All govt schemes', lat: 18.52, lon: 73.85, state: 'Maharashtra' },
  { name: 'CSC - Ludhiana', address: 'Mini Secretariat, Ludhiana', phone: '1800 3000 3468', services: 'Crop insurance, KCC', lat: 30.90, lon: 75.85, state: 'Punjab' },
  { name: 'CSC - Nashik', address: 'Collector Office, Nashik', phone: '1800 3000 3468', services: 'Mandi rates, subsidy', lat: 19.99, lon: 73.78, state: 'Maharashtra' },
  { name: 'CSC - Patna', address: 'Block Office, Patna', phone: '1800 3000 3468', services: 'PM-Kisan, Fasal Bima', lat: 25.61, lon: 85.14, state: 'Bihar' },
];

export const CHATBOT_KB = [
  { keywords: ['mandi', 'भाव', 'rate', 'price', 'bhav', 'bazaar'], answer: 'Mandi prices auto-detect your state! Go to Mandi tab — it shows live APMC rates for your crop. For best selling day, check 7-day trend graph. Use "Sell Now" to call nearest trader.', answerHi: 'मंडी भाव ऑटो-डिटेक्ट होता है! मंडी टैब में आपके राज्य का लाइव भाव दिखता है। 7 दिन का ग्राफ देखकर सही दिन बेचें। "अभी बेचें" से व्यापारी को कॉल करें।' },
  { keywords: ['disease', 'रोग', 'बीमारी', 'blight', 'blast', 'curl'], answer: 'Scan your leaf photo — AI detects disease in 2 seconds. It gives organic + chemical remedy with exact dose for your sprayer. Check disease history to see if same disease repeating.', answerHi: 'पत्ती की फोटो स्कैन करें — AI 2 सेकंड में रोग बताता है। जैविक + रासायनिक दवा का सटीक डोज देता है। रोग इतिहास देखें कि वही रोग बार-बार तो नहीं।' },
  { keywords: ['pesticide', 'दवा', 'fake', 'नकली', 'verify'], answer: 'Upload pesticide bottle photo in Verify tab — AI checks hologram & batch against CIB&RC registry. Or scan QR/barcode with camera. Always buy from certified stores tab.', answerHi: 'वेरीफाई टैब में दवा की बोतल फोटो अपलोड करें — AI होलोग्राम जांचता है। या QR स्कैन करें। हमेशा प्रमाणित दुकान से ही खरीदें।' },
  { keywords: ['weather', 'मौसम', 'बारिश', 'rain', 'spray'], answer: 'Weather auto-detects your village! Radar tab shows safe spray window (6:30-10:30 AM). If rain in 3h, we notify "Don\'t spray today". Check 7-day IMD forecast.', answerHi: 'मौसम आपके गांव का ऑटो-डिटेक्ट होता है! रडार में सुरक्षित छिड़काव समय (सुबह 6:30-10:30) दिखता है। 3 घंटे में बारिश हो तो "आज छिड़काव न करें" नोटिफिकेशन।' },
  { keywords: ['subsidy', 'सब्सिडी', 'pm-kisan', 'kcc', 'insurance', 'बीमा'], answer: 'With Aadhaar verified, check Subsidy tab — shows PM-KISAN ₹6000, Fasal Bima, KCC, fertilizer DBT, solar pump 90% subsidy eligible for your state. Visit nearest CSC for application.', answerHi: 'आधार सत्यापित होने पर सब्सिडी टैब देखें — PM-किसान ₹6000, फसल बीमा, KCC, खाद सब्सिडी, सोलर पंप 90% सब्सिडी आपके राज्य के लिए। आवेदन के लिए नजदीकी CSC जाएं।' },
  { keywords: ['seed', 'बीज', 'tractor', 'ट्रैक्टर', 'sell', 'बेचना'], answer: 'Marketplace tab — sell excess seeds, tractor, sprayer, fertilizer. Buy from nearby farmers. All listings show location + phone. Verified badge for trusted sellers.', answerHi: 'मार्केटप्लेस में अतिरिक्त बीज, ट्रैक्टर, स्प्रेयर बेचें/खरीदें। सभी में लोकेशन + फोन। सत्यापित बैज विश्वसनीय विक्रेता के लिए।' },
  { keywords: ['job', 'मजदूर', 'labour', 'work', 'काम', 'help'], answer: 'Jobs tab — post "Need 2 labourers for paddy" or "I can operate tractor". Farmers within 20km see it. Contact directly via phone.', answerHi: 'जॉब्स टैब में "धान के लिए 2 मजदूर चाहिए" या "मैं ट्रैक्टर चला सकता हूं" पोस्ट करें। 20km के किसान देखेंगे। सीधे फोन से संपर्क।' },
  { keywords: ['fuel', 'डीजल', 'diesel', 'tractor mileage', 'efficiency'], answer: 'Fuel tracker — log tractor hours + diesel liters. It calculates L/hour efficiency, shows best/worst vehicle, tips to save fuel (tyre pressure, RPM 1500-1800, air filter).', answerHi: 'फ्यूल ट्रैकर में ट्रैक्टर घंटे + डीजल लीटर लिखें। L/घंटा दक्षता बताता है, सबसे अच्छी गाड़ी, बचत टिप्स (टायर प्रेशर, RPM 1500-1800)।' },
  { keywords: ['soil', 'मिट्टी', 'health card', 'fertilizer', 'खाद'], answer: 'Soil Health tab — based on your state, shows soil type, pH, NPK, organic matter. Recommends FYM, gypsum, ZnSO4, and auto-adjusts fertilizer dose for your crop.', answerHi: 'मिट्टी स्वास्थ्य टैब में आपके राज्य की मिट्टी प्रकार, pH, NPK, जैविक पदार्थ। FYM, जिप्सम, ZnSO4 सिफारिश और आपकी फसल के लिए खाद डोज ऑटो-एडजस्ट।' },
  { keywords: ['csc', 'computer', 'सहायता केंद्र', 'center', 'help center'], answer: 'Nearest CSC shown in Chatbot tab — Common Service Center for Aadhaar, PM-Kisan, Soil Health Card, insurance. Call 1800 3000 3468 toll-free. We also have IVR: call 1800-180-1551 Kisan Helpline.', answerHi: 'चैटबॉट में नजदीकी CSC — आधार, PM-किसान, मिट्टी कार्ड, बीमा के लिए। टोल-फ्री 1800 3000 3468। IVR: 1800-180-1551 किसान हेल्पलाइन।' },
  { keywords: ['community', 'सवाल', 'forum', 'fellow farmer', 'पूछो'], answer: 'Community tab — ask in your language, fellow farmers + agronomists answer. Like, reply, urgent tag. Example: "Tomato yellow leaves?" gets answer in minutes.', answerHi: 'कम्युनिटी टैब में अपनी भाषा में पूछें, साथी किसान + कृषि विशेषज्ञ जवाब देते हैं। लाइक, जवाब, अर्जेंट टैग।' },
  { keywords: ['calendar', 'बुवाई', 'sowing', 'harvest', 'फसल चक्र'], answer: 'Crop Calendar auto-suggests based on your state + current month: "Now sowing time for Rabi wheat in Punjab". Shows sowing-harvest windows for Kharif/Rabi/Zaid.', answerHi: 'फसल कैलेंडर आपके राज्य + महीने के हिसाब से बताता है: "अब पंजाब में रबी गेहूं बुवाई का समय"। खरीफ/रबी/जायद बुवाई-कटाई समय।' },
  { keywords: ['default'], answer: 'I can help with: Mandi prices, disease scan, pesticide verify, weather spray window, subsidy, seeds/tractor marketplace, jobs, fuel efficiency, soil health, CSC centers, community Q&A, crop calendar. Ask in your mother tongue! Try voice button.', answerHi: 'मैं मदद कर सकता हूं: मंडी भाव, रोग स्कैन, दवा जांच, मौसम, सब्सिडी, बीज/ट्रैक्टर बाजार, मजदूर, डीजल बचत, मिट्टी, CSC केंद्र, किसान सवाल-जवाब, फसल कैलेंडर। अपनी भाषा में पूछें! वॉइस बटन दबाएं।' },
];

export function getChatbotAnswer(query, lang='en') {
  const q = (query||'').toLowerCase();
  for (const item of CHATBOT_KB) {
    if (item.keywords.some(k => k === 'default')) continue;
    if (item.keywords.some(k => q.includes(k.toLowerCase()))) {
      return lang === 'hi' ? (item.answerHi || item.answer) : item.answer;
    }
  }
  const def = CHATBOT_KB.find(k => k.keywords.includes('default'));
  return lang === 'hi' ? (def.answerHi || def.answer) : def.answer;
}

export function getNearestCSC(state) {
  if (!state) return CSC_CENTERS.slice(0,3);
  const normalized = state.toLowerCase();
  const filtered = CSC_CENTERS.filter(c => normalized.includes(c.state.toLowerCase()) || c.state.toLowerCase().includes(normalized));
  return filtered.length ? filtered : CSC_CENTERS.slice(0,3);
}
