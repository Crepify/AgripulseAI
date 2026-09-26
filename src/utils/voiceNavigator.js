// Voice intent classifier for the 8-feature AgriPulse build.
// Same contract as before: classifyVoiceIntent(transcript, lang) →
// { targetTab, tabLabel: {lang: label}, speechResponse: {lang: sentence} }
// Consumed by App, VoiceAssistant(+Enhanced), HandsFreeVoiceBanner, LoginPage.

export function classifyVoiceIntent(query) {
  const q = String(query || '').toLowerCase();
  const has = (...words) => words.some((w) => q.includes(w));

  // 1) Automated Patti Auditor — slip / receipt / commission / stolen fees
  if (has('patti', 'पट्टी', 'slip', 'receipt', 'रसीद', 'commission', 'कमीशन', 'kata', 'कटौती', 'deduction', 'audit', 'fee', 'फीस', 'charges')) {
    return {
      targetTab: 'patti',
      tabLabel: { hi: 'पट्टी ऑडिट', en: 'Patti Auditor', ta: 'ரசீது தணிக்கை', te: 'రసీదు ఆడిట్', kn: 'ರಶೀದಿ ಆಡಿಟ್', mr: 'पट्टी ऑडिट', pa: 'ਪੱਟੀ ਆਡਿਟ', bn: 'রসিদ অডিট', gu: 'પટ્ટી ઓડિટ' },
      speechResponse: {
        hi: 'पट्टी ऑडिटर खोल दिया गया है। पट्टी की फोटो खींचें — हर कटौती कानूनी सीमा से जांची जाएगी और चोरी हुए पैसे रुपये में दिखेंगे।',
        en: 'Opening Patti Auditor. Photograph your commission slip — every fee is checked against your state\'s legal limit and the exact rupees stolen are shown.',
        ta: 'ரசீது தணிக்கை திறக்கப்பட்டது. ரசீதை புகைப்படம் எடுங்கள்.',
        te: 'రసీదు ఆడిట్ తెరవబడింది. రసీదు ఫోటో తీయండి.',
        kn: 'ರಶೀದಿ ಆಡಿಟ್ ತೆರೆಯಲಾಗಿದೆ. ರಶೀದಿಯ ಫೋಟೋ ತೆಗೆಯಿರಿ.',
        mr: 'पट्टी ऑडिट उघडले आहे. पट्टीचा फोटो काढा.',
        pa: 'ਪੱਟੀ ਆਡਿਟ ਖੋਲ੍ਹਿਆ ਗਿਆ। ਪੱਟੀ ਦੀ ਫੋਟੋ ਖਿੱਚੋ।',
        bn: 'রসিদ অডিট খোলা হয়েছে। রসিদের ছবি তুলুন।',
        gu: 'પટ્ટી ઓડિટ ખોલવામાં આવ્યું છે. પટ્ટીનો ફોટો લો.',
      },
    };
  }

  // 2) Weighing Fraud Tracker — scale / weight / kata / tola
  if (has('weigh', 'weight', 'वजन', 'तौल', 'scale', 'कांट', 'kanta', 'kante', 'तराजू', 'wajan', 'tol')) {
    return {
      targetTab: 'weigh',
      tabLabel: { hi: 'तौल जांच', en: 'Weighing Check', ta: 'எடை சரிபார்ப்பு', te: 'తూకం తనిఖీ', kn: 'ತೂಕ ಪರಿಶೀಲನೆ', mr: 'वजन तपासणी', pa: 'ਤੋਲ ਜਾਂਚ', bn: 'ওজন যাচাই', gu: 'તોલ તપાસ' },
      speechResponse: {
        hi: 'तौल जांच खोल दी गई है। मंडी के कांटे की फोटो खींचें — समय, जीपीएस और हैश से लॉक होगी, फिर पट्टी से मिलाई जाएगी।',
        en: 'Opening Weighing Fraud Tracker. Photograph the mandi scale — it locks with time, GPS and a hash, then compares against your payment slip.',
        ta: 'எடை சரிபார்ப்பு திறக்கப்பட்டது. தராசின் புகைப்படம் எடுங்கள்.',
        te: 'తూకం తనిఖీ తెరవబడింది. కాటా ఫోటో తీయండి.',
        kn: 'ತೂಕ ಪರಿಶೀಲನೆ ತೆರೆಯಲಾಗಿದೆ. ತಕ್ಕಡಿಯ ಫೋಟೋ ತೆಗೆಯಿರಿ.',
        mr: 'वजन तपासणी उघडली आहे. काट्याचा फोटो काढा.',
        pa: 'ਤੋਲ ਜਾਂਚ ਖੋਲ੍ਹੀ ਗਈ। ਕੰਡੇ ਦੀ ਫੋਟੋ ਖਿੱਚੋ।',
        bn: 'ওজন যাচাই খোলা হয়েছে। দাঁড়িপাল্লার ছবি তুলুন।',
        gu: 'તોલ તપાસ ખોલવામાં આવી છે. કાંટાનો ફોટો લો.',
      },
    };
  }

  // 3) Farm-Gate Proof of Grade — grade / quality / certificate
  if (has('grade', 'ग्रेड', 'quality', 'गुणवत्ता', 'certificate', 'प्रमाण', 'quality cut', 'क्वालिटी')) {
    return {
      targetTab: 'grade',
      tabLabel: { hi: 'गुणवत्ता प्रमाण', en: 'Proof of Grade', ta: 'தர சான்று', te: 'గ్రేడ్ ధృవీకరణ', kn: 'ದರ್ಜೆ ಪ್ರಮಾಣ', mr: 'गुणवत्ता प्रमाण', pa: 'ਗ੍ਰੇਡ ਸਬੂਤ', bn: 'গ্রেড প্রমাণ', gu: 'ગ્રેડ પુરાવો' },
      speechResponse: {
        hi: 'गुणवत्ता प्रमाण खोल दिया गया है। ट्रक लोड होने से पहले फसल स्कैन करें — समय और जीपीएस के साथ ग्रेडिंग सर्टिफिकेट मिलेगा।',
        en: 'Opening Proof of Grade. Scan your crop before it leaves the farm — you get a time and GPS locked grading certificate against fake quality cuts.',
        ta: 'தர சான்று திறக்கப்பட்டது. பயிரை ஸ்கேன் செய்யுங்கள்.',
        te: 'గ్రేడ్ ధృవీకరణ తెరవబడింది. పంటను స్కాన్ చేయండి.',
        kn: 'ದರ್ಜೆ ಪ್ರಮಾಣ ತೆರೆಯಲಾಗಿದೆ. ಬೆಳೆ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.',
        mr: 'गुणवत्ता प्रमाण उघडले आहे. पीक स्कॅन करा.',
        pa: 'ਗ੍ਰੇਡ ਸਬੂਤ ਖੋਲ੍ਹਿਆ ਗਿਆ। ਫਸਲ ਸਕੈਨ ਕਰੋ।',
        bn: 'গ্রেড প্রমাণ খোলা হয়েছে। ফসল স্ক্যান করুন।',
        gu: 'ગ્રેડ પુરાવો ખોલવામાં આવ્યો છે. પાક સ્કેન કરો.',
      },
    };
  }

  // 4) Pesticide Price Exposer — pesticide / spray brand / generic price
  if (has('pesticide', 'दवाई', 'दवा', 'spray', 'स्प्रे', 'generic', 'जेनेरिक', 'brand', 'ब्रांड', 'fungicide', 'insecticide', 'chemical', 'कीटनाशक')) {
    return {
      targetTab: 'exposer',
      tabLabel: { hi: 'असली दाम', en: 'Price Exposer', ta: 'உண்மை விலை', te: 'నిజమైన ధర', kn: 'ನಿಜವಾದ ಬೆಲೆ', mr: 'खरी किंमत', pa: 'ਅਸਲੀ ਕੀਮਤ', bn: 'আসল দাম', gu: 'સાચી કિંમત' },
      speechResponse: {
        hi: 'असली दाम खोल दिया गया है। दवाई की बोतल की फोटो खींचें या ब्रांड बोलें — वही जेनेरिक दवा और उसका असली थोक दाम दिखेगा।',
        en: 'Opening Pesticide Price Exposer. Photograph the bottle or speak the brand — I show the identical generic and its true wholesale price with nearby shops.',
        ta: 'உண்மை விலை திறக்கப்பட்டது. பாட்டிலின் புகைப்படம் எடுங்கள்.',
        te: 'నిజమైన ధర తెరవబడింది. సీసా ఫోటో తీయండి.',
        kn: 'ನಿಜವಾದ ಬೆಲೆ ತೆರೆಯಲಾಗಿದೆ. ಬಾಟಲಿಯ ಫೋಟೋ ತೆಗೆಯಿರಿ.',
        mr: 'खरी किंमत उघडली आहे. बाटलीचा फोटो काढा.',
        pa: 'ਅਸਲੀ ਕੀਮਤ ਖੋਲ੍ਹੀ ਗਈ। ਬੋਤਲ ਦੀ ਫੋਟੋ ਖਿੱਚੋ।',
        bn: 'আসল দাম খোলা হয়েছে। বোতলের ছবি তুলুন।',
        gu: 'સાચી કિંમત ખોલવામાં આવી છે. બોટલનો ફોટો લો.',
      },
    };
  }

  // 5) Voice-Activated Truck Pooling — truck / transport / pool
  if (has('truck', 'ट्रक', 'pool', 'पूल', 'transport', 'भाड़ा', 'tempo', 'टेम्पो', 'गाड़ी', 'freight', 'vehicle', 'share truck')) {
    return {
      targetTab: 'pool',
      tabLabel: { hi: 'साझा ट्रक', en: 'Truck Pooling', ta: 'லாரி பகிர்வு', te: 'ట్రక్ పూలింగ్', kn: 'ಟ್ರಕ್ ಹಂಚಿಕೆ', mr: 'सामायिक ट्रक', pa: 'ਸਾਂਝਾ ਟਰੱਕ', bn: 'ভাগাভাগি ট্রাক', gu: 'સહિયારો ટ્રક' },
      speechResponse: {
        hi: 'साझा ट्रक खोल दिया गया है। अपना माल बोलें — पांच किलोमीटर के किसानों के साथ डेढ़ टन का ट्रक भरकर भाड़ा बंट जाएगा।',
        en: 'Opening Truck Pooling. Speak your load — farmers within five kilometres fill one one-and-a-half ton pickup and the freight splits by weight.',
        ta: 'லாரி பகிர்வு திறக்கப்பட்டது. உங்கள் சுமையை சொல்லுங்கள்.',
        te: 'ట్రక్ పూలింగ్ తెరవబడింది. మీ లోడ్ చెప్పండి.',
        kn: 'ಟ್ರಕ್ ಹಂಚಿಕೆ ತೆರೆಯಲಾಗಿದೆ. ನಿಮ್ಮ ಲೋಡ್ ಹೇಳಿ.',
        mr: 'सामायिक ट्रक उघडला आहे. तुमचा माल सांगा.',
        pa: 'ਸਾਂਝਾ ਟਰੱਕ ਖੋਲ੍ਹਿਆ ਗਿਆ। ਆਪਣਾ ਲੋਡ ਬੋਲੋ।',
        bn: 'ভাগাভাগি ট্রাক খোলা হয়েছে। আপনার মাল বলুন।',
        gu: 'સહિયારો ટ્રક ખોલવામાં આવ્યો છે. તમારો માલ બોલો.',
      },
    };
  }

  // 6) Reverse Fertilizer Auction — fertilizer / urea / auction / bid
  if (has('auction', 'नीलामी', 'बोली', 'bid', 'fertilizer', 'खाद', 'urea', 'यूरिया', 'dap', 'डीएपी', 'herbicide', 'उर्वरक')) {
    return {
      targetTab: 'auction',
      tabLabel: { hi: 'उल्टी बोली', en: 'Reverse Auction', ta: 'தலைகீழ் ஏலம்', te: 'రివర్స్ వేలం', kn: 'ರಿವರ್ಸ್ ಹರಾಜು', mr: 'उलटा लिलाव', pa: 'ਉਲਟੀ ਬੋਲੀ', bn: 'বিপরীত নিলাম', gu: 'ઊંધી હરાજી' },
      speechResponse: {
        hi: 'उल्टी बोली खोल दी गई है। खाद का ऑर्डर डालें — गांव के ऑर्डर जुड़ेंगे और पांच दुकानदार सबसे कम दाम की बोली लगाएंगे।',
        en: 'Opening Reverse Auction. Post your fertilizer order — it pools with your village and five dealers bid down for the whole lot.',
        ta: 'தலைகீழ் ஏலம் திறக்கப்பட்டது. உர ஆர்டரை போடுங்கள்.',
        te: 'రివర్స్ వేలం తెరవబడింది. ఎరువుల ఆర్డర్ పెట్టండి.',
        kn: 'ರಿವರ್ಸ್ ಹರಾಜು ತೆರೆಯಲಾಗಿದೆ. ಗೊಬ್ಬರದ ಆರ್ಡರ್ ಹಾಕಿ.',
        mr: 'उलटा लिलाव उघडला आहे. खताची ऑर्डर टाका.',
        pa: 'ਉਲਟੀ ਬੋਲੀ ਖੋਲ੍ਹੀ ਗਈ। ਖਾਦ ਦਾ ਆਰਡਰ ਪਾਓ।',
        bn: 'বিপরীত নিলাম খোলা হয়েছে। সারের অর্ডার দিন।',
        gu: 'ઊંધી હરાજી ખોલવામાં આવી છે. ખાતરનો ઓર્ડર મૂકો.',
      },
    };
  }

  // 9) Direct Market — sell straight to urban buyers, no middlemen
  if (has('direct', 'सीधा', 'सीधे', 'बिचौलि', 'bichauli', 'middleman', 'customer', 'ग्राहक', 'society', 'सोसाइटी', 'शहर में बेच', 'sell direct', 'marketplace', 'doorstep')) {
    return {
      targetTab: 'market',
      tabLabel: { hi: 'सीधा बाज़ार', en: 'Direct Market', ta: 'நேரடி சந்தை', te: 'ప్రత్యక్ష మార్కెట్', kn: 'ನೇರ ಮಾರುಕಟ್ಟೆ', mr: 'थेट बाजार', pa: 'ਸਿੱਧਾ ਬਾਜ਼ਾਰ', bn: 'সরাসরি বাজার', gu: 'સીધું બજાર' },
      speechResponse: {
        hi: 'सीधा बाज़ार खोल दिया गया है। अपनी फसल का दाम खुद तय करें — शहर की सोसाइटी और दुकानें बिना बिचौलिए के सीधे आपसे खरीदेंगी।',
        en: 'Opening Direct Market. Set your own fair price — urban societies, restaurants and shops buy straight from you with no middleman.',
        ta: 'நேரடி சந்தை திறக்கப்பட்டது. உங்கள் விலையை நீங்களே நிர்ணயியுங்கள்.',
        te: 'ప్రత్యక్ష మార్కెట్ తెరవబడింది. మీ ధర మీరే నిర్ణయించండి.',
        kn: 'ನೇರ ಮಾರುಕಟ್ಟೆ ತೆರೆಯಲಾಗಿದೆ. ನಿಮ್ಮ ಬೆಲೆ ನೀವೇ ನಿಗದಿಪಡಿಸಿ.',
        mr: 'थेट बाजार उघडला आहे. तुमची किंमत तुम्हीच ठरवा.',
        pa: 'ਸਿੱਧਾ ਬਾਜ਼ਾਰ ਖੋਲ੍ਹਿਆ ਗਿਆ। ਆਪਣੀ ਕੀਮਤ ਆਪ ਤੈਅ ਕਰੋ।',
        bn: 'সরাসরি বাজার খোলা হয়েছে। নিজের দাম নিজে ঠিক করুন।',
        gu: 'સીધું બજાર ખોલવામાં આવ્યું છે. તમારી કિંમત તમે નક્કી કરો.',
      },
    };
  }

  // 8) Mandi ROI Simulator — price / profit / mandi / rate
  if (has('price', 'दाम', 'भाव', 'rate', 'रेट', 'mandi', 'मंडी', 'profit', 'मुनाफ़ा', 'मुनाफा', 'roi', 'बाजार', 'market', 'sell', 'बेच', 'kitna milega', 'कितना मिलेगा')) {
    return {
      targetTab: 'profit',
      tabLabel: { hi: 'मुनाफ़ा कैलकुलेटर', en: 'ROI Simulator', ta: 'லாப கணிப்பு', te: 'లాభం లెక్క', kn: 'ಲಾಭ ಲೆಕ್ಕ', mr: 'नफा कॅल्क्युलेटर', pa: 'ਮੁਨਾਫਾ ਕੈਲਕੁਲੇਟਰ', bn: 'লাভ ক্যালকুলেটর', gu: 'નફો કેલ્ક્યુલેટર' },
      speechResponse: {
        hi: 'मुनाफ़ा कैलकुलेटर खोल दिया गया है। एकड़ और फसल चुनें — भाड़ा, मजदूरी और मंडी फीस काटकर असली मुनाफ़ा दिखेगा।',
        en: 'Opening Mandi ROI Simulator. Pick your acres and crop — I subtract transport, labor and A P M C fees from live prices to show your true net profit.',
        ta: 'லாப கணிப்பு திறக்கப்பட்டது. ஏக்கரும் பயிரும் தேர்ந்தெடுங்கள்.',
        te: 'లాభం లెక్క తెరవబడింది. ఎకరాలు, పంట ఎంచుకోండి.',
        kn: 'ಲಾಭ ಲೆಕ್ಕ ತೆರೆಯಲಾಗಿದೆ. ಎಕರೆ ಮತ್ತು ಬೆಳೆ ಆರಿಸಿ.',
        mr: 'नफा कॅल्क्युलेटर उघडला आहे. एकर आणि पीक निवडा.',
        pa: 'ਮੁਨਾਫਾ ਕੈਲਕੁਲੇਟਰ ਖੋਲ੍ਹਿਆ ਗਿਆ। ਏਕੜ ਅਤੇ ਫਸਲ ਚੁਣੋ।',
        bn: 'লাভ ক্যালকুলেটর খোলা হয়েছে। একর ও ফসল বাছুন।',
        gu: 'નફો કેલ્ક્યુલેટર ખોલવામાં આવ્યો છે. એકર અને પાક પસંદ કરો.',
      },
    };
  }

  // 7) Disease Diagnosis Scanner — default / scan / leaf / disease
  return {
    targetTab: 'scan',
    tabLabel: { hi: 'रोग जांच', en: 'Disease Scanner', ta: 'நோய் ஸ்கேனர்', te: 'వ్యాధి స్కానర్', kn: 'ರೋಗ ಸ್ಕ್ಯಾನರ್', mr: 'रोग स्कॅनर', pa: 'ਰੋਗ ਸਕੈਨਰ', bn: 'রোগ স্ক্যানার', gu: 'રોગ સ્કેનર' },
    speechResponse: {
      hi: 'रोग जांच खोल दी गई है। पत्ती की फोटो खींचें — बावन रोगों में से पहचान होगी और बोतल-ढक्कन में दवा की मात्रा बताई जाएगी।',
      en: 'Opening Disease Scanner. Photograph the leaf — it identifies among fifty two diseases on-device and gives the dose in bottle caps per tank.',
      ta: 'நோய் ஸ்கேனர் திறக்கப்பட்டது. இலையின் புகைப்படம் எடுங்கள்.',
      te: 'వ్యాధి స్కానర్ తెరవబడింది. ఆకు ఫోటో తీయండి.',
      kn: 'ರೋಗ ಸ್ಕ್ಯಾನರ್ ತೆರೆಯಲಾಗಿದೆ. ಎಲೆಯ ಫೋಟೋ ತೆಗೆಯಿರಿ.',
      mr: 'रोग स्कॅनर उघडला आहे. पानाचा फोटो काढा.',
      pa: 'ਰੋਗ ਸਕੈਨਰ ਖੋਲ੍ਹਿਆ ਗਿਆ। ਪੱਤੇ ਦੀ ਫੋਟੋ ਖਿੱਚੋ।',
      bn: 'রোগ স্ক্যানার খোলা হয়েছে। পাতার ছবি তুলুন।',
      gu: 'રોગ સ્કેનર ખોલવામાં આવ્યો છે. પાનનો ફોટો લો.',
    },
  };
}
