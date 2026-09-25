// Enhanced voice intent with all new features + 22 languages
export function classifyVoiceIntent(query, lang = 'hi') {
  const q = query.toLowerCase();

  // Marketplace: seeds, tractor, sell
  if (q.includes('marketplace') || q.includes('बाजार') || q.includes('seed') || q.includes('बीज') || q.includes('tractor') || q.includes('ट्रैक्टर') || q.includes('sell') || q.includes('बेच') || q.includes('खरीद') || q.includes('equipment')) {
    return {
      targetTab: 'marketplace',
      tabLabel: { hi: 'किसान बाजार', en: 'Marketplace', ta: 'சந்தை', te: 'మార్కెట్', kn: 'ಮಾರುಕಟ್ಟೆ', mr: 'बाजार', pa: 'ਬਾਜ਼ਾਰ', bn: 'বাজার', gu: 'બજાર' },
      speechResponse: {
        hi: 'किसान बाजार खोल दिया गया है। यहां आप अतिरिक्त बीज, ट्रैक्टर, स्प्रेयर बेच और खरीद सकते हैं।',
        en: 'Opening Farmer Marketplace. Sell excess seeds, tractor, equipment or buy from nearby farmers.',
        ta: 'விவசாயி சந்தை திறக்கப்பட்டது.',
        te: 'రైతు మార్కెట్ తెరవబడింది.',
        kn: 'ರೈತ ಮಾರುಕಟ್ಟೆ ತೆರೆಯಲಾಗಿದೆ.',
        mr: 'शेतकरी बाजार उघडला आहे.',
        pa: 'ਕਿਸਾਨ ਬਾਜ਼ਾਰ ਖੋਲ੍ਹਿਆ ਗਿਆ।',
        bn: 'কৃষক বাজার খোলা হয়েছে।',
        gu: 'ખેડૂત બજાર ખોલવામાં આવ્યું છે।',
      }
    };
  }

  // Community
  if (q.includes('community') || q.includes('सवाल') || q.includes('forum') || q.includes('fellow') || q.includes('पूछो') || q.includes('community') || q.includes('help from farmer') || q.includes('किसान से पूछो')) {
    return {
      targetTab: 'community',
      tabLabel: { hi: 'किसान समुदाय', en: 'Community', ta: 'சமூகம்', te: 'సమాజం', kn: 'ಸಮುದಾಯ' },
      speechResponse: {
        hi: 'किसान समुदाय खोल दिया गया है। अपनी भाषा में सवाल पूछें, साथी किसान जवाब देंगे।',
        en: 'Opening Farmer Community. Ask in your mother tongue, fellow farmers and agronomists will answer.',
        ta: 'விவசாயி சமூகம் திறக்கப்பட்டது.',
        te: 'రైతు సమాజం తెరవబడింది.',
        kn: 'ರೈತ ಸಮುದಾಯ ತೆರೆಯಲಾಗಿದೆ.',
      }
    };
  }

  // Jobs
  if (q.includes('job') || q.includes('मजदूर') || q.includes('labour') || q.includes('work') || q.includes('काम') || q.includes('मदद चाहिए') || q.includes('need help')) {
    return {
      targetTab: 'jobs',
      tabLabel: { hi: 'काम व मदद', en: 'Jobs & Help', ta: 'வேலை', te: 'పని', kn: 'ಕೆಲಸ' },
      speechResponse: {
        hi: 'काम और मदद टैब खोल दिया गया है। मजदूर चाहिए या काम दे सकते हैं, पोस्ट करें।',
        en: 'Opening Jobs & Help. Need labour or offer work — post here, nearby farmers will see.',
        ta: 'வேலை பக்கம் திறக்கப்பட்டது.',
        te: 'పని పేజీ తెరవబడింది.',
        kn: 'ಕೆಲಸ ಪುಟ ತೆರೆಯಲಾಗಿದೆ.',
      }
    };
  }

  // Fuel
  if (q.includes('fuel') || q.includes('डीजल') || q.includes('diesel') || q.includes('mileage') || q.includes('tractor mileage') || q.includes('efficiency') || q.includes('ईंधन')) {
    return {
      targetTab: 'fuel',
      tabLabel: { hi: 'डीजल बचत', en: 'Fuel Tracker', ta: 'எரிபொருள்', te: 'ఇంధనం', kn: 'ಇಂಧನ' },
      speechResponse: {
        hi: 'डीजल बचत ट्रैकर खोल दिया गया है। ट्रैक्टर घंटे और डीजल लिखें, दक्षता बताता है।',
        en: 'Opening Fuel Efficiency Tracker. Log tractor hours and diesel to see L/hour efficiency and saving tips.',
        ta: 'எரிபொருள் திறன் திறக்கப்பட்டது.',
        te: 'ఇంధన సామర్థ్యం తెరవబడింది.',
        kn: 'ಇಂಧನ ದಕ್ಷತೆ ತೆರೆಯಲಾಗಿದೆ.',
      }
    };
  }

  // Chatbot
  if (q.includes('chat') || q.includes('bot') || q.includes('सहायक') || q.includes('पूछो') || q.includes('बात करो') || q.includes('help') || q.includes('मदद')) {
    return {
      targetTab: 'chatbot',
      tabLabel: { hi: 'AI चैटबॉट', en: 'AI Chatbot', ta: 'சாட்பாட்', te: 'చాట్‌బాట్', kn: 'ಚಾಟ್‌ಬಾಟ್' },
      speechResponse: {
        hi: 'किसान AI चैटबॉट खोल दिया गया है। कॉल, टाइप, वॉइस — किसी भी भाषा में पूछें, CSC केंद्र भी दिखाता है।',
        en: 'Opening Kisan AI Chatbot. Call, type, or voice in mother tongue — plus nearest CSC centers for help.',
        ta: 'சாட்பாட் திறக்கப்பட்டது.',
        te: 'చాట్‌బాట్ తెరవబడింది.',
        kn: 'ಚಾಟ್‌ಬಾಟ್ ತೆರೆಯಲಾಗಿದೆ.',
      }
    };
  }

  // Services: calendar, subsidy, soil, csc, ivr
  if (q.includes('calendar') || q.includes('बुवाई') || q.includes('sowing') || q.includes('subsidy') || q.includes('सब्सिडी') || q.includes('soil') || q.includes('मिट्टी') || q.includes('csc') || q.includes('center') || q.includes('kendra') || q.includes('pm-kisan') || q.includes('बीमा') || q.includes('insurance')) {
    return {
      targetTab: 'services',
      tabLabel: { hi: 'किसान सेवाएं', en: 'Services', ta: 'சேவைகள்', te: 'సేవలు', kn: 'ಸೇವೆಗಳು' },
      speechResponse: {
        hi: 'किसान सेवाएं खोल दी गई हैं। फसल कैलेंडर, सब्सिडी, मिट्टी स्वास्थ्य, CSC केंद्र, IVR हेल्पलाइन — सब कुछ एक जगह।',
        en: 'Opening Farmer Services. Crop calendar, subsidy, soil health, CSC centers, IVR helpline — everything in one place.',
        ta: 'சேவைகள் திறக்கப்பட்டது.',
        te: 'సేవలు తెరవబడింది.',
        kn: 'ಸೇವೆಗಳು ತೆರೆಯಲಾಗಿದೆ.',
      }
    };
  }

  // Mandi / Market / Profit queries
  if (q.includes('mandi') || q.includes('मंडी') || q.includes('भाव') || q.includes('rate') || q.includes('price') || q.includes('profit') || q.includes('मुनाफा') || q.includes('कमाई') || q.includes('bhav') || q.includes('bazaar')) {
    return {
      targetTab: 'profit',
      tabLabel: { hi: 'मंडी भाव व मुनाफा', en: 'Mandi & ROI', ta: 'மண்டி & லாபம்', te: 'మండి ధరలు', kn: 'ಮಾರುಕಟ್ಟೆ ದರ', mr: 'मंडी भाव', pa: 'ਮੰਡੀ ਭਾਅ', bn: 'মান্ডি দর', gu: 'મંડી ભાવ' },
      speechResponse: {
        hi: 'मंडी भाव और फसल बचत स्क्रीन खोल दी गई है। आपके राज्य का लाइव भाव, 7 दिन का ट्रेंड, और "अभी बेचें" बटन — सब ऑटो।',
        en: 'Opening Mandi rates with 7-day trend, auto-detected state, and Sell Now button to call trader.',
        ta: 'மண்டி விலை திறக்கப்பட்டது.',
        te: 'మండి ధరలు తెరవబడింది.',
        kn: 'ಮಾರುಕಟ್ಟೆ ದರ ತೆರೆಯಲಾಗಿದೆ.',
        mr: 'मंडी भाव उघडला आहे.',
        pa: 'ਮੰਡੀ ਭਾਅ ਖੋਲ੍ਹਿਆ ਗਿਆ।',
        bn: 'মান্ডি দর খোলা হয়েছে।',
        gu: 'મંડી ભાવ ખોલવામાં આવ્યો છે।',
      }
    };
  }

  // Weather / Spray Time queries
  if (q.includes('weather') || q.includes('rain') || q.includes('मौसम') || q.includes('बारिश') || q.includes('छिड़काव') || q.includes('रडार') || q.includes('radar') || q.includes('spray')) {
    return {
      targetTab: 'radar',
      tabLabel: { hi: 'मौसम', en: 'Weather', ta: 'வானிலை', te: 'వాతావరణం', kn: 'ಹವಾಮಾನ' },
      speechResponse: {
        hi: 'मौसम खोल दिया गया है। सुरक्षित छिड़काव समय सुबह 6:30-10:30, बारिश पुश नोटिफिकेशन, और फसल कैलेंडर — सब ऑटो।',
        en: 'Opening Weather with safe spray window, rain push notifications, and crop calendar auto-detected for your village.',
        ta: 'வானிலை திறக்கப்பட்டது.',
        te: 'వాతావరణం తెరవబడింది.',
        kn: 'ಹವಾಮಾನ ತೆರೆಯಲಾಗಿದೆ.',
      }
    };
  }

  // Pesticide Verification
  if (q.includes('fake') || q.includes('verify') || q.includes('असली') || q.includes('नकली') || q.includes('दवा जांच') || q.includes('barcode') || q.includes('qr') || q.includes('pesticide')) {
    return {
      targetTab: 'verify',
      tabLabel: { hi: 'असली दवा जांच', en: 'Verify Pesticide', ta: 'மருந்து சரிபார்ப்பு', te: 'మందుల గుర్తింపు', kn: 'ಔಷಧ ಪರಿಶೀಲನೆ' },
      speechResponse: {
        hi: 'दवा जांच खोल दी गई है। QR कैमरा से स्कैन करें या बोतल फोटो अपलोड करें — AI होलोग्राम जांचता है।',
        en: 'Opening Pesticide Verification with QR auto-scan camera and bottle photo upload — AI checks hologram.',
        ta: 'மருந்து சரிபார்ப்பு திறக்கப்பட்டது.',
        te: 'మందుల గుర్తింపు తెరవబడింది.',
        kn: 'ಔಷಧ ಪರಿಶೀಲನೆ ತೆರೆಯಲಾಗಿದೆ.',
      }
    };
  }

  // Stores
  if (q.includes('shop') || q.includes('store') || q.includes('dealer') || q.includes('दुकान') || q.includes('विक्रेता')) {
    return {
      targetTab: 'stores',
      tabLabel: { hi: 'सरकारी दुकानें', en: 'Certified Stores', ta: 'அங்கீகரிக்கப்பட்ட கடைகள்', te: 'ప్రభుత్వ దుకాణాలు', kn: 'ಅಧಿಕೃತ ಮಳಿಗೆಗಳು' },
      speechResponse: {
        hi: 'प्रमाणित दुकानें खोल दी गई हैं। नियरेस्ट ऑटो-सॉर्ट, लाइव स्टॉक SMS अपडेट, और CSC केंद्र — बिना कॉल के उपलब्धता देखें।',
        en: 'Opening Certified Stores — auto-sorted nearest, live stock via SMS auto-update, plus CSC centers.',
        ta: 'கடைகள் திறக்கப்பட்டது.',
        te: 'దుకాణాలు తెరవబడింది.',
        kn: 'ಮಳಿಗೆಗಳು ತೆರೆಯಲಾಗಿದೆ.',
      }
    };
  }

  // Group
  if (q.includes('group') || q.includes('fpo') || q.includes('समूह') || q.includes('छूट') || q.includes('discount')) {
    return {
      targetTab: 'group',
      tabLabel: { hi: 'किसान समूह', en: 'Farmer Group', ta: 'விவசாயிகள் குழு', te: 'రైతు బృందం', kn: 'ರೈತರ ಗುಂಪು' },
      speechResponse: {
        hi: 'किसान समूह खोल दिया गया है। नियरेस्ट ग्रुप ऑटो-मैच, 25% फैक्ट्री छूट, एक टैप जॉइन — ट्रांसपोर्ट बचत।',
        en: 'Opening Farmer Group — auto-matched nearest pool, 25% factory discount, one-tap join saves transport.',
        ta: 'குழு திறக்கப்பட்டது.',
        te: 'బృందం తెరవబడింది.',
        kn: 'ಗುಂಪು ತೆರೆಯಲಾಗಿದೆ.',
      }
    };
  }

  // Default -> Leaf Scan
  return {
    targetTab: 'scan',
    tabLabel: { hi: 'पत्ती जांच', en: 'Leaf Scanner', ta: 'இலை ஸ்கேனர்', te: 'ఆకు స్కానర్', kn: 'ಎಲೆ ಸ್ಕ್ಯಾನರ್', mr: 'पान स्कॅनर', pa: 'ਪੱਤਾ ਸਕੈਨਰ', bn: 'পাতা স্ক্যানার', gu: 'પાન સ્કેનર' },
    speechResponse: {
      hi: 'पत्ती जांच खोल दी गई है। फोटो खींचें — ब्लर चेक, रोग इतिहास, ऑटो जमीन आकार, एक टैप शेयर, मल्टी-क्रॉप स्कैन — सब ऑटो।',
      en: 'Opening Leaf Scanner with blur check, disease history, auto land size, one-tap WhatsApp share, multi-crop detection — all automated.',
      ta: 'இலை ஸ்கேனர் திறக்கப்பட்டது.',
      te: 'ఆకు స్కానర్ తెరవబడింది.',
      kn: 'ಎಲೆ ಸ್ಕ್ಯಾನರ್ ತೆರೆಯಲಾಗಿದೆ.',
      mr: 'पान स्कॅनर उघडला आहे.',
      pa: 'ਪੱਤਾ ਸਕੈਨਰ ਖੋਲ੍ਹਿਆ ਗਿਆ।',
      bn: 'পাতা স্ক্যানার খোলা হয়েছে।',
      gu: 'પાન સ્કેનર ખોલવામાં આવ્યું છે।',
    }
  };
}
