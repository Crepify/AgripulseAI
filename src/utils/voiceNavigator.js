// Natural Language Voice Intent & Auto-Navigator Engine

export function classifyVoiceIntent(query, lang = 'hi') {
  const q = query.toLowerCase();

  // 1. Mandi / Market / Profit queries
  if (
    q.includes('mandi') || q.includes('मंडी') || q.includes('भाव') || q.includes('rate') ||
    q.includes('price') || q.includes('profit') || q.includes('मुनाफा') || q.includes('कमाई') ||
    q.includes('சந்தை') || q.includes('விலை') || q.includes('ధర') || q.includes('ಮಾರುಕಟ್ಟೆ') || q.includes('ದರ')
  ) {
    return {
      targetTab: 'profit',
      tabLabel: { hi: 'मंडी भाव व मुनाफा', en: 'Mandi & ROI', ta: 'மண்டி & லாபம்', te: 'మండి ధరలు', kn: 'ಮಾರುಕಟ್ಟೆ ದರ' },
      speechResponse: {
        hi: 'मंडी भाव और फसल बचत स्क्रीन खोल दी गई है। यहां आप आज के सरकारी मंडी भाव और मुनाफा देख सकते हैं।',
        en: 'Opening the Mandi rates and profit calculator screen for you.',
        ta: 'மண்டி சந்தை விலை மற்றும் லாப கணக்கீட்டு பக்கம் திறக்கப்பட்டது.',
        te: 'మండి ధరలు మరియు లాభాల కాలిక్యులేటర్ పేజీ తెరవబడింది.',
        kn: 'ಮಾರುಕಟ್ಟೆ ದರ ಮತ್ತು ಲಾಭ ಲೆಕ್ಕಾಚಾರದ ಪುಟವನ್ನು ತೆರೆಯಲಾಗಿದೆ.',
      }
    };
  }

  // 2. Weather / Spray Time / Radar queries
  if (
    q.includes('weather') || q.includes('rain') || q.includes('मौसम') || q.includes('बारिश') ||
    q.includes('छिड़काव का समय') || q.includes('रडार') || q.includes('radar') || q.includes('spray time') ||
    q.includes('வானிலை') || q.includes('மழை') || q.includes('వాతావరణం') || q.includes('వర్షం') || q.includes('ಹವಾಮಾನ') || q.includes('ಮಳೆ')
  ) {
    return {
      targetTab: 'radar',
      tabLabel: { hi: 'मौसम व रडार', en: 'Spore Radar', ta: 'வானிலை & ரேடார்', te: 'వాతావరణం', kn: 'ಹವಾಮಾನ & ರೇಡಾರ್' },
      speechResponse: {
        hi: 'मौसम और रडार स्क्रीन खोल दी गई है। आज छिड़काव का सबसे सही समय सुबह 6:30 से 10:30 बजे तक है।',
        en: 'Opening the Spore Radar. The best spray window is between 6:30 AM and 10:30 AM.',
        ta: 'வானிலை ரேடார் திறக்கப்பட்டது. காலை 10:30 மணிக்குள் மருந்து தெளிப்பது உகந்தது.',
        te: 'వాతావరణ రాడార్ తెరవబడింది. ఉదయం 10:30 లోపు పిచிகారీ చేయడం మంచిది.',
        kn: 'ಹವಾಮಾನ ರೇಡಾರ್ ತೆರೆಯಲಾಗಿದೆ. ಬೆಳಿಗ್ಗೆ 10:30 ರೊಳಗೆ ಸಿಂಪಡಿಸುವುದು ಉತ್ತಮ.',
      }
    };
  }

  // 3. Pesticide Verification / Counterfeit queries
  if (
    q.includes('fake') || q.includes('verify') || q.includes('असली') || q.includes('नकली') ||
    q.includes('दवा जांच') || q.includes('बारकोड') || q.includes('barcode') || q.includes('pesticide check') ||
    q.includes('போலி') || q.includes('அசல்') || q.includes('నకిలీ') || q.includes('అసలైన') || q.includes('ನಕಲಿ') || q.includes('ಅಸಲಿ')
  ) {
    return {
      targetTab: 'verify',
      tabLabel: { hi: 'असली दवा जांच', en: 'Verify Pesticide', ta: 'மருந்து சரிபார்ப்பு', te: 'మందుల గుర్తింపు', kn: 'ಔಷಧ ಪರಿಶೀಲನೆ' },
      speechResponse: {
        hi: 'दवा जांच स्क्रीन खोल दी गई है। यहां आप कीटनाशक के बारकोड और होलोग्राम को स्कैन करके असली या नकली की पहचान कर सकते हैं।',
        en: 'Opening the pesticide verification scanner. Scan the barcode to verify authenticity.',
        ta: 'மருந்து சரிபார்ப்பு பக்கம் திறக்கப்பட்டது. பார்கோடை ஸ்கேன் செய்து சரிபார்க்கவும்.',
        te: 'మందుల గుర్తింపు పేజీ తెరవబడింది. బార్‌కోడ్‌ను స్కాన్ చేయండి.',
        kn: 'ಔಷಧ ಪರಿಶೀಲನೆ ಪುಟ ತೆರೆಯಲಾಗಿದೆ. ಬಾರ್‌ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.',
      }
    };
  }

  // 4. Stores / Dealers queries
  if (
    q.includes('shop') || q.includes('store') || q.includes('dealer') || q.includes('दुकान') ||
    q.includes('विक्रेता') || q.includes('सरकारी दुकान') || q.includes('contact') ||
    q.includes('கடை') || q.includes('దుకాణం') || q.includes('ಅಂಗಡಿ')
  ) {
    return {
      targetTab: 'stores',
      tabLabel: { hi: 'सरकारी दुकानें', en: 'Certified Stores', ta: 'அங்கீகரிக்கப்பட்ட கடைகள்', te: 'ప్రభుత్వ దుకాణాలు', kn: 'ಅಧಿಕೃತ ಮಳಿಗೆಗಳು' },
      speechResponse: {
        hi: 'सरकारी प्रमाणित खाद-बीज दुकानों की सूची खोल दी गई है। आप सीधे कॉल करके स्टॉक की जानकारी ले सकते हैं।',
        en: 'Opening the certified input stores map. You can call dealers directly.',
        ta: 'அங்கீகரிக்கப்பட்ட கடைகளின் பட்டியல் திறக்கப்பட்டது.',
        te: 'ధృవీకరించబడిన దుకాణాల జాబితా తెరవబడింది.',
        kn: 'ಅಧಿಕೃತ ಮಳಿಗೆಗಳ ಪಟ್ಟಿ ತೆರೆಯಲಾಗಿದೆ.',
      }
    };
  }

  // 5. Group / FPO queries
  if (
    q.includes('group') || q.includes('fpo') || q.includes('समूह') || q.includes('छूट') ||
    q.includes('discount') || q.includes('खरीद') || q.includes('குழு') || q.includes('బృందం') || q.includes('ಗುಂಪು')
  ) {
    return {
      targetTab: 'group',
      tabLabel: { hi: 'किसान समूह', en: 'Farmer Group', ta: 'விவசாயிகள் குழு', te: 'రైతు బృందం', kn: 'ರೈತರ ಗುಂಪು' },
      speechResponse: {
        hi: 'किसान समूह स्क्रीन खोल दी गई है। यहां 20 किसान मिलकर फैक्ट्री से 25% की छूट पर खाद-दवा मंगवा सकते हैं।',
        en: 'Opening the farmer buying group. Join with 20 farmers to unlock 25% bulk discounts.',
        ta: 'விவசாயிகள் கூட்டு கொள்முதல் பக்கம் திறக்கப்பட்டது.',
        te: 'రైతుల ఉమ్మడి కొనుగోలు పేజీ తెరవబడింది.',
        kn: 'ರೈತರ ಜಂಟಿ ಖರೀದಿ ಪುಟ ತೆರೆಯಲಾಗಿದೆ.',
      }
    };
  }

  // 6. Default -> Leaf Scan / Disease Diagnostic
  return {
    targetTab: 'scan',
    tabLabel: { hi: 'पत्ती जांच', en: 'Leaf Scanner', ta: 'இலை ஸ்கேனர்', te: 'ఆకు స్కಾನర్', kn: 'ಎಲೆ ಸ್ಕ್ಯಾನರ್' },
    speechResponse: {
      hi: 'पत्ती जांच स्क्रीन खोल दी गई है। आप कैमरे से रोगग्रस्त पत्ते की फोटो खींचकर तुरंत देसी नाप में दवा का तरीका देख सकते हैं।',
      en: 'Opening the Leaf Scanner. Capture a photo to see instant diagnosis and practical dosage.',
      ta: 'இலை ஸ்கேனர் திறக்கப்பட்டது. புகைப்படம் எடுத்து மருந்து அளவை அறியவும்.',
      te: 'ఆకు స్కానర్ తెరవబడింది. ఫోటో తీసి మందు మోతాదు తెలుసుకోండి.',
      kn: 'ಎಲೆ ಸ್ಕ್ಯಾನರ್ ತೆರೆಯಲಾಗಿದೆ. ಫೋಟೋ ತೆಗೆದು ಔಷಧ ಮಾಹಿತಿ ಪಡೆಯಿರಿ.',
    }
  };
}
