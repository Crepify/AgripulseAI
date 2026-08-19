// Clean Agronomic Database for AgriPulse AI

export const CROPS = [
  {
    id: 'rice-blast',
    name: 'Rice / Paddy',
    localName: 'धान',
    disease: 'Rice Blast (झुलसा रोग)',
    pathogen: 'Magnaporthe oryzae',
    confidence: 97.4,
    severity: 'High',
    symptoms: 'Diamond-shaped brown spots with gray centers on leaves.',
    image: 'https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=800&q=80',
    audio: {
      en: 'Rice blast detected with 97% confidence. Apply bio-mix before 10:30 AM before humidity causes spore spread. Mix 2 bottle caps in your 15 liter sprayer.',
      hi: 'धान में ब्लास्ट रोग की पुष्टि हुई है। सुबह 10:30 बजे से पहले 15 लीटर स्प्रेयर में 2 ढक्कन ट्राइकोडर्मा मिलाकर छिड़काव करें।',
      ta: 'நெல் குலை நோய் கண்டறியப்பட்டது. 15 லிட்டர் தெளிப்பானில் 2 மூடி மருந்து கலந்து காலை 10:30 மணிக்குள் தெளிக்கவும்.',
      te: 'వరిలో అగ్గితెగులు గుర్తించబడింది. 15 లీటర్ల స్ప్రేయర్‌లో 2 మూతల మందు కలిపి ఉదయం 10:30 లోపు పిచికారీ చేయండి.',
      kn: 'ಭತ್ತದ ಬೆಂಕಿ ರೋಗ ದೃಢಪಟ್ಟಿದೆ. 15 ಲೀಟರ್ ಸಿಂಪಡಕದಲ್ಲಿ 2 ಮುಚ್ಚಳ ಔಷಧ ಬೆರೆಸಿ ಬೆಳಿಗ್ಗೆ 10:30 ರೊಳಗೆ ಸಿಂಪಡಿಸಿ.',
    },
    dosage: {
      bio: {
        name: 'Trichoderma Bio-Fungicide',
        measure: '2 Bottle Caps (30ml)',
        tank: '15L Backpack Sprayer',
        cost: '₹280 / acre',
        safety: '100% Organic • Safe for soil and beneficial insects',
      },
      chemical: {
        name: 'Tricyclazole 75% WP',
        measure: '1.5 Matchboxes (15g)',
        tank: '15L Backpack Sprayer',
        cost: '₹620 / acre',
        safety: 'Wear mask • 14 days safe harvest interval',
      }
    },
    sprayTime: '6:30 AM – 10:30 AM (Zero Rain Washout Risk)',
  },
  {
    id: 'tomato-blight',
    name: 'Tomato',
    localName: 'टमाटर',
    disease: 'Early Blight (अगेती झुलसा)',
    pathogen: 'Alternaria solani',
    confidence: 96.2,
    severity: 'Medium',
    symptoms: 'Dark brown concentric rings on lower mature leaves.',
    image: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=800&q=80',
    audio: {
      en: 'Early Blight identified on tomato leaves. Remove affected bottom leaves. Mix 3 bottle caps into your 15-liter backpack sprayer.',
      hi: 'टमाटर में अर्ली ब्लाइट की पहचान हुई है। नीचे के खराब पत्ते हटाएं और 15 लीटर स्प्रेयर में 3 ढक्कन दवा मिलाकर छिड़कें।',
      ta: 'தக்காளியில் இலைக்கருகல் நோய் உள்ளது. 15 லிட்டர் தெளிப்பானில் 3 மூடி மருந்தை கலந்து தெளிக்கவும்.',
      te: 'టమోటాలో ముందస్తు తెగులు ఉంది. 15 లీటర్ల స్ప్రేయర్‌లో 3 మూతల మందు పిచికారీ చేయండి.',
      kn: 'ಟೊಮೆಟೊದಲ್ಲಿ ಎಲೆ ಕರಕಲು ರೋಗ ಕಾಣಿಸಿಕೊಂಡಿದೆ. 15 ಲೀಟರ್ ಸಿಂಪಡಕದಲ್ಲಿ 3 ಮುಚ್ಚಳ ಔಷಧಿ ಸಿಂಪಡಿಸಿ.',
    },
    dosage: {
      bio: {
        name: 'Bacillus subtilis Bio-Shield',
        measure: '2.5 Bottle Caps (40ml)',
        tank: '15L Backpack Sprayer',
        cost: '₹220 / acre',
        safety: 'Zero chemical residue • Safe for immediate harvest',
      },
      chemical: {
        name: 'Copper Oxychloride 50%',
        measure: '2 Matchboxes (30g)',
        tank: '15L Backpack Sprayer',
        cost: '₹480 / acre',
        safety: 'Avoid spraying in strong direct sunlight',
      }
    },
    sprayTime: '7:00 AM – 11:00 AM',
  },
  {
    id: 'cotton-curl',
    name: 'Cotton',
    localName: 'कपास',
    disease: 'Leaf Curl Virus (पत्ता मरोड़)',
    pathogen: 'CLCuV (Whitefly Vector)',
    confidence: 94.8,
    severity: 'High',
    symptoms: 'Upward leaf curling with thickened veins caused by whiteflies.',
    image: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=800&q=80',
    audio: {
      en: 'Cotton Leaf Curl Virus transmitted by whiteflies. Install yellow sticky traps and spray 3 bottle caps of neem oil formulation.',
      hi: 'कपास में सफेद मक्खी से फैलने वाला लीफ कर्ल वायरस मिला है। खेत में पीले ट्रैप लगाएं और 3 ढक्कन नीम तेल का घोल छिड़कें।',
      ta: 'பருத்தி இலைச்சுருள் நோய். மஞ்சள் ஒட்டும் பொறிகளை வைத்து 3 மூடி வேப்பெண்ணெய் கரைசல் தெளிக்கவும்.',
      te: 'ప్రత్తి ఆకు ముడుత వైరస్. పసుపు జిగురు కార్డులు పెట్టి 3 మూతల వేప నూనె పిచికారీ చేయండి.',
      kn: 'ಹತ್ತಿ ಎಲೆ ಮುದುರು ರೋಗ. ಹಳದಿ ಬಲೆಗಳನ್ನು ಇರಿಸಿ 3 ಮುಚ್ಚಳ ಬೇವಿನ ಎಣ್ಣೆ ಸಿಂಪಡಿಸಿ.',
    },
    dosage: {
      bio: {
        name: 'Cold-Pressed Neem Oil (10,000 PPM)',
        measure: '3 Bottle Caps (45ml)',
        tank: '15L Backpack Sprayer',
        cost: '₹190 / acre',
        safety: 'Natural organic remedy • Suppresses whitefly eggs',
      },
      chemical: {
        name: 'Diafenthiuron 50% WP',
        measure: '1.5 Matchboxes (20g)',
        tank: '15L Backpack Sprayer',
        cost: '₹850 / acre',
        safety: 'Toxic to aquatic life • Keep away from water sources',
      }
    },
    sprayTime: '6:00 AM – 9:30 AM (Whiteflies most sluggish)',
  },
  {
    id: 'wheat-rust',
    name: 'Wheat',
    localName: 'गेहूं',
    disease: 'Yellow Rust (पीला रतुआ)',
    pathogen: 'Puccinia striiformis',
    confidence: 98.1,
    severity: 'Critical',
    symptoms: 'Yellowish-orange powder lines along leaf veins.',
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80',
    audio: {
      en: 'Critical: Yellow rust spores detected. Mix 2 bottle caps of propiconazole in 15L water. Notify neighboring farms immediately.',
      hi: 'अति आवश्यक: गेहूं में पीला रतुआ देखा गया है। तुरंत 15 लीटर पानी में 2 ढक्कन प्रोपिकोनाजोल मिलाकर छिड़काव करें।',
      ta: 'கோதுமையில் மஞ்சள் துரு நோய். உடனே 15 லிட்டர் நீரில் 2 மூடி மருந்து கலந்து தெளிக்கவும்.',
      te: 'గోధుమలో పసుపు తుప్పు తెగులు. వెంటనే 15 లీటర్ల నీటిలో 2 మూతల మందు పిచికారీ చేయండి.',
      kn: 'ಗೋಧಿಯಲ್ಲಿ ಹಳದಿ ತುಕ್ಕು ರೋಗ. ತಕ್ಷಣ 15 ಲೀಟರ್ ನೀರಿನಲ್ಲಿ 2 ಮುಚ್ಚಳ ಔಷಧಿ ಬೆರೆಸಿ ಸಿಂಪಡಿಸಿ.',
    },
    dosage: {
      bio: {
        name: 'Pseudomonas Bio-Fungicide',
        measure: '2.5 Bottle Caps (40g)',
        tank: '15L Backpack Sprayer',
        cost: '₹240 / acre',
        safety: 'Naturally suppresses stripe rust mycelium',
      },
      chemical: {
        name: 'Propiconazole 25% EC',
        measure: '1 Bottle Cap (15ml)',
        tank: '15L Backpack Sprayer',
        cost: '₹550 / acre',
        safety: 'Wear protective goggles during application',
      }
    },
    sprayTime: '6:00 AM – 9:00 AM (Before midday wind drift)',
  }
];

export const MANDI_PRICES = [
  { crop: 'Basmati Paddy', market: 'Karnal APMC', price: 4250, change: '+₹180', trend: 'up' },
  { crop: 'Desi Cotton', market: 'Guntur APMC', price: 7420, change: '+₹240', trend: 'up' },
  { crop: 'Hybrid Tomato', market: 'Kolar APMC', price: 2150, change: '-₹90', trend: 'down' },
  { crop: 'Sharbati Wheat', market: 'Sehore APMC', price: 2880, change: '+₹60', trend: 'up' },
  { crop: 'Nashik Red Onion', market: 'Lasalgaon APMC', price: 1950, change: '+₹110', trend: 'up' },
];

export const DEALERS = [
  {
    id: 1,
    name: 'Kisan Suvidha Kendra (Govt Certified)',
    distance: '1.4 km',
    address: 'Near APMC Gate 2, Main Market',
    phone: '+91 98450 12345',
    stock: 'Trichoderma, Bio-Neem, Folicur IN STOCK',
    verified: true,
  },
  {
    id: 2,
    name: 'Sri Venkateshwara Agri Clinic',
    distance: '2.8 km',
    address: 'Opp. Cooperative Bank, Taluk Road',
    phone: '+91 94480 67890',
    stock: 'All Bio-Fungicides & Backpack Sprayers',
    verified: true,
  },
  {
    id: 3,
    name: 'Rythu Seva Center',
    distance: '4.1 km',
    address: 'Bypass Road, Near Soil Testing Lab',
    phone: '+91 97310 54321',
    stock: 'Certified Organic Inputs & Traps',
    verified: true,
  }
];

export const PESTICIDE_SAMPLES = [
  {
    id: 'bayer-folicur',
    name: 'Bayer Folicur (Tebuconazole 25.9%)',
    mfg: 'Bayer CropScience Ltd.',
    batch: 'BAY-2026-X8912',
    status: 'GENUINE',
    mrp: '₹840',
  },
  {
    id: 'syngenta-amistar',
    name: 'Syngenta Amistar Top',
    mfg: 'Syngenta India Ltd.',
    batch: 'SYN-2025-A4401',
    status: 'GENUINE',
    mrp: '₹1,250',
  },
  {
    id: 'fake-sample',
    name: 'SuperCrop 500 (Spurious Chemical)',
    mfg: 'Unregistered Generic Entity',
    batch: 'FAKE-9921-NULL',
    status: 'FAKE',
    mrp: '₹350 (Discount Trap)',
    warning: 'DO NOT USE: Unregistered industrial adulterant that destroys roots and poisons soil.',
  }
];
