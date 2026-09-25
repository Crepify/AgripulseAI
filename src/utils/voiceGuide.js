// ─────────────────────────────────────────────────────────────────────────────
// AgriPulse AI — Voice Guide ("साथी" companion)
//
// A human-feeling, progressive voice guide:
//   • detects the visitor's language from the browser and speaks it
//   • walks through login ONE step at a time — each instruction is spoken only
//     after the previous action is actually done (step changes drive it)
//   • after login, introduces every service slowly, asking after each one
//     "shall I continue?" and waiting for the answer
//   • barge-in: between instructions the mic stays open; if the farmer speaks,
//     the guide stops, listens, does what they asked (tab navigation etc. via
//     the app's onCommand hook), then asks whether to continue
//
// Designed to feel like a person sitting next to the farmer — short warm
// sentences, never a wall of speech, and it only ever talks about NOW.
// ─────────────────────────────────────────────────────────────────────────────

import { speechEngine } from './speech.js';

export const GUIDE_LANGS = ['hi', 'en', 'ta', 'te', 'kn', 'mr'];

// Best supported language from the browser's preferences
export function detectGuideLanguage() {
  if (typeof navigator === 'undefined') return 'en';
  const cands = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
  for (const c of cands) {
    const base = String(c).toLowerCase().split('-')[0];
    if (GUIDE_LANGS.includes(base)) return base;
  }
  return 'en';
}

// ── scripts (one voice, all languages) ───────────────────────────────────────

const S = {
  hi: {
    offer: 'बोलकर मार्गदर्शन चाहेंगे?',
    offerYes: 'हां, सुनाओ',
    offerNo: 'नहीं',
    activeLabel: 'आवाज़ मार्गदर्शन चालू',
    stopGuide: 'बंद करें',
    greet: 'नमस्ते! मैं आपके साथ हूँ, एक-एक कदम बताता चलूँगा। चलिए शुरू करते हैं।',
    phone: 'सबसे पहले, नीचे बड़े खाली बॉक्स में अपना मोबाइल नंबर लिखिए। पूरे दस अंक।',
    phoneComplete: 'बहुत बढ़िया! अब नीचे हरे रंग का बड़ा बटन दबाइए।',
    otp: 'आपके फोन पर छह अंकों का कोड आया है। वही कोड नीचे छह छोटे बॉक्स में भरिए।',
    register: 'अब बस अपना नाम, गांव और राज्य भर दीजिए, फिर आगे बढ़ें दबा दीजिए।',
    aadhaar_login: 'अपना बारह अंकों का आधार नंबर लिखिए, फिर OTP से सत्यापित करें।',
    aadhaar_otp: 'आपके फोन पर आया छह अंकों का कोड नीचे लिखिए।',
    success: 'बधाई हो! आप लॉगिन हो गए। अब मैं आपको धीरे-धीरे बताता हूँ कि यह ऐप क्या-क्या सेवा देता है।',
    didntCatch: 'माफ़ कीजिए, फिर से बोलिए।',
    askNext: 'क्या अगली सेवा के बारे में सुनना चाहेंगे?',
    askResume: 'क्या मैं जारी रखूँ?',
    tourIntro: 'तो सुनिए, इस ऐप में क्या-क्या है। हर सेवा के बाद मैं पूछूँगा, तब तक आराम से सुनते रहिए।',
    tourBye: 'जब भी ज़रूरत हो, माइक दबाकर मुझे बुला लीजिए। आपका दिन शुभ हो!',
    tourDone: 'बस इतनी ही नहीं — और भी बहुत कुछ है। खुद टैब खोलकर देखिए। शुभकामनाएँ!',
    services: [
      ['फसल जाँच', 'पत्ते की फोटो खींचिए, बीमारी और इलाज तुरंत मिल जाएगा।'],
      ['बीमारी रडार', 'अगले तीन दिन के मौसम से फसल को खतरा है या नहीं, बीमारी आने से पहले बताता है।'],
      ['दवा जाँच', 'नकली कीटनाशक पकड़ता है — बोतल की फोटो से कंपनी की पुष्टि होती है।'],
      ['मंडी भाव', 'आज के भाव देखिए और सही समय पर बेचकर मुनाफा निकालिए।'],
      ['दुकानें', 'बीज, दवा और औज़ार सही दाम पर घर बैठे मंगवाइए।'],
      ['साझा खरीद', 'आसपास के किसानों के साथ मिलकर थोक भाव पर सामान मंगवाइए।'],
      ['किसान बाज़ार', 'अतिरिक्त बीज, ट्रैक्टर या औज़ार दूसरे किसानों को बेचिए या खरीदिए।'],
      ['किसान समुदाय', 'अपनी भाषा में सवाल पूछिए, साथी किसान जवाब देंगे।'],
      ['काम और मदद', 'मज़दूर चाहिए या काम देना है — यहाँ पोस्ट कीजिए।'],
      ['ईंधन', 'आसपास के पंपों का डीज़ल-पेट्रोल भाव देखिए।'],
      ['सहायक बातचीत', 'कोई भी सवाल बोलकर पूछिए, जवाब तुरंत मिलेगा।'],
      ['सरकारी सेवाएँ', 'योजनाएँ, सब्सिडी और आवेदन — सब एक जगह।'],
    ],
  },
  en: {
    offer: 'Want spoken guidance?',
    offerYes: 'Yes, guide me',
    offerNo: 'No',
    activeLabel: 'Voice guide on',
    stopGuide: 'Stop',
    greet: 'Hello! I am right here with you — I will guide you one step at a time. Let us begin.',
    phone: 'First, type your mobile number in the big box below. All ten digits.',
    phoneComplete: 'Very good! Now press the big green button below.',
    otp: 'A six digit code has come to your phone. Type that code in the six small boxes below.',
    register: 'Now just fill your name, village and state, then press continue.',
    aadhaar_login: 'Type your twelve digit Aadhaar number, then verify with the OTP.',
    aadhaar_otp: 'Type the six digit code from your phone in the boxes below.',
    success: 'Congratulations, you are logged in! Now let me slowly tell you what this app can do for you.',
    didntCatch: 'Sorry, please say that again.',
    askNext: 'Would you like to hear about the next service?',
    askResume: 'Shall I continue?',
    tourIntro: 'Listen — here is what is inside this app. After each one I will ask, so relax and listen.',
    tourBye: 'Whenever you need me, press the mic and call me. Have a good day!',
    tourDone: 'And there is more — open the tabs and see for yourself. Best wishes!',
    services: [
      ['Crop Check', 'Take a photo of a leaf — the disease and its treatment appear instantly.'],
      ['Disease Radar', 'Weather for the next three days warns you before disease can strike.'],
      ['Medicine Check', 'Catches fake pesticides — photograph the bottle to confirm the company.'],
      ['Mandi Prices', 'See today’s prices and sell at the right time for the best profit.'],
      ['Shops', 'Order seeds, medicines and tools at fair prices from home.'],
      ['Group Buying', 'Join nearby farmers and order together at wholesale prices.'],
      ['Farmer Market', 'Sell or buy spare seeds, tractors and equipment from other farmers.'],
      ['Community', 'Ask questions in your own language — fellow farmers answer.'],
      ['Work & Help', 'Need labour or have work to offer? Post it here.'],
      ['Fuel', 'Check diesel and petrol prices at pumps near you.'],
      ['Assistant Chat', 'Ask any question by voice and get an instant answer.'],
      ['Govt Services', 'Schemes, subsidies and applications — all in one place.'],
    ],
  },
  ta: {
    offer: 'குரல் வழிகாட்டி வேண்டுமா?',
    offerYes: 'ஆம், சொல்லுங்கள்',
    offerNo: 'இல்லை',
    activeLabel: 'குரல் வழிகாட்டி இயக்கம்',
    stopGuide: 'நிறுத்து',
    greet: 'வணக்கம்! நான் உங்களுடன் இருக்கிறேன் — படிப்படியாக வழிகாட்டுகிறேன். தொடங்கலாம்.',
    phone: 'முதலில், கீழே உள்ள பெரிய பெட்டியில் உங்கள் மொபைல் எண்ணை பத்து இலக்கமாக எழுதுங்கள்.',
    phoneComplete: 'நல்லது! இப்போது கீழே உள்ள பச்சை நிற பெரிய பொத்தானை அழுத்துங்கள்.',
    otp: 'உங்கள் போனுக்கு வந்த ஆறு இலக்க குறியீட்டை கீழே உள்ள ஆறு சிறிய பெட்டிகளில் எழுதுங்கள்.',
    register: 'இப்போது உங்கள் பெயர், கிராமம், மாநிலம் எழுதி தொடரவும்.',
    aadhaar_login: 'உங்கள் பனிரெண்டு இலக்க ஆதார் எண்ணை எழுதி, OTP மூலம் உறுதிப்படுத்துங்கள்.',
    aadhaar_otp: 'போனுக்கு வந்த ஆறு இலக்க குறியீட்டை கீழே எழுதுங்கள்.',
    success: 'வாழ்த்துகள்! நீங்கள் உள்நுழைந்துவிட்டீர்கள். இப்போது சேவைகளை மெதுவாக சொல்கிறேன்.',
    didntCatch: 'மன்னிக்கவும், மீண்டும் சொல்லுங்கள்.',
    askNext: 'அடுத்த சேவையைப் பற்றி கேக்க விரும்புகிறீர்களா?',
    askResume: 'தொடரலாமா?',
    tourIntro: 'இந்த செயலியில் என்னென்ன இருக்கிறது என்று ஒவ்வொன்றாக சொல்கிறேன். ஒவ்வொன்றுக்குப் பிறகு கேட்பேன்.',
    tourBye: 'தேவைப்படும்போது மைக்கை அழுத்தி என்னை அழையுங்கள். இனிய நாள்!',
    tourDone: 'இன்னும் நிறைய இருக்கிறது — தாங்களே திறந்து பாருங்கள். வாழ்த்துகள்!',
    services: [
      ['பயிர் பரிசோதனை', 'இலையின் புகைப்படம் எடுங்கள் — நோயும் சிகிச்சையும் உடனே தெரியும்.'],
      ['நோய் ரேடார்', 'மூன்று நாள் வானிலையைப் பார்த்து நோய் வரும் முன் எச்சரிக்கும்.'],
      ['மருந்து சரிபார்ப்பு', 'போலி பூச்சு மருந்தை கண்டுபிடிக்கும் — பாட்டில் புகைப்படம் போதும்.'],
      ['மண்டி விலை', 'இன்றைய விலையைப் பார்த்து சரியான நேரத்தில் விற்று லாபம் பெறுங்கள்.'],
      ['கடைகள்', 'விதைகள், மருந்துகள், கருவிகள் — வீட்டிலிருந்து சரியான விலையில்.'],
      ['கூட்டு வாங்குதல்', 'அருகிலுள்ள விவசாயிகளுடன் சேர்ந்து மொத்த விலையில் வாங்குங்கள்.'],
      ['விவசாய சந்தை', 'விதைகள், டிராக்டர், கருவிகளை மற்ற விவசாயிகளிடம் விற்கலாம், வாங்கலாம்.'],
      ['சமூகம்', 'உங்கள் மொழியில் கேளுங்கள் — சக விவசாயிகள் பதில் சொல்வார்கள்.'],
      ['வேலை & உதவி', 'தொழிலாளர் தேவையா, வேலை கொடுக்கணுமா — இங்கே பதிவிடுங்கள்.'],
      ['எரிபொருள்', 'அருகிலுள்ள பம்புகளின் டீசல், பெட்ரோல் விலை.'],
      ['உதவியாளர் உரையாடல்', 'குரலில் எதையும் கேளுங்கள் — உடனடி பதில்.'],
      ['அரசு சேவைகள்', 'திட்டங்கள், மானியங்கள், விண்ணப்பங்கள் — எல்லாம் ஒரே இடத்தில்.'],
    ],
  },
  te: {
    offer: 'వాయిస్ మార్గదర్శనం కావాలా?',
    offerYes: 'అవును, చెప్పండి',
    offerNo: 'లేదు',
    activeLabel: 'వాయిస్ గైడ్ ఆన్',
    stopGuide: 'ఆపు',
    greet: 'నమస్కారం! నేను మీతో ఉన్నాను — ఒక్కొక్క అడుగు చెబుతాను. ప్రారంభిద్దాం.',
    phone: 'ముందుగా, కింద ఉన్న పెద్ద బాక్సులో మీ మొబైల్ నంబరును పది అంకెలుగా రాయండి.',
    phoneComplete: 'చాలా బాగుంది! ఇప్పుడు కింద ఉన్న ఆకుపచ్చ పెద్ద బొత్తాన్ని నొక్కండి.',
    otp: 'మీ ఫోనుకు వచ్చిన ఆరు అంకెల కోడ్‌ను కింద ఆరు చిన్న బాక్సుల్లో రాయండి.',
    register: 'ఇప్పుడు మీ పేరు, గ్రామం, రాష్ట్రం రాసి కొనసాగించండి.',
    aadhaar_login: 'మీ పన్నెండు అంకెల ఆధార్ నంబరు రాసి, OTP తో నిర్ధారించండి.',
    aadhaar_otp: 'ఫోనుకు వచ్చిన ఆరు అంకెల కోడ్ కింద రాయండి.',
    success: 'అభినందనలు! మీరు లాగిన్ అయ్యారు. ఇప్పుడు సేవల గురించి నెమ్మదిగా చెబుతాను.',
    didntCatch: 'క్షమించండి, మళ్ళీ చెప్పండి.',
    askNext: 'తర్వాత సేవ గురించి వినాలా?',
    askResume: 'కొనసాగించమంటారా?',
    tourIntro: 'ఈ యాప్‌లో ఏముందో ఒక్కొక్కటి చెబుతాను. ఒక్కో దాని తర్వాత నేను అడుగుతాను.',
    tourBye: 'ఎప్పుడు కావాలంటే మైక్ నొక్కి నన్ను పిలవండి. శుభ దినం!',
    tourDone: 'ఇంకా చాలా ఉంది — మీరే తెరిచి చూడండి. శుభాకాంక్షలు!',
    services: [
      ['పంట తనిఖీ', 'ఆకు ఫోటో తీసుకోండి — వ్యాధి, మందు వెంటనే తెలుస్తాయి.'],
      ['వ్యాధి రాడార్', 'మూడు రోజుల వాతావరణం చూసి వ్యాధి రాకముందే హెచ్చరిస్తుంది.'],
      ['మందు తనిఖీ', 'నకిలీ మందులు పట్టుకుంటుంది — సీసా ఫోటో చాలు.'],
      ['మండి ధరలు', 'ఈరోజు ధరలు చూసి సరైన సమయంలో అమ్మి లాభం పొందండి.'],
      ['దుకాణాలు', 'విత్తనాలు, మందులు, పనిముట్లు — ఇంట్లోనే సరైన ధరకు.'],
      ['కలెక్టివ్ కొనుగోలు', 'పక్క రైతులతో కలిసి టోకు ధరకు కొనండి.'],
      ['రైతు మార్కెట్', 'విత్తనాలు, ట్రాక్టర్, పనిముట్లు ఇతర రైతులకు అమ్మండి లేదా కొనండి.'],
      ['సంఘం', 'మీ భాషలో ప్రశ్న అడగండి — తోటి రైతులు సమాధానం చెబుతారు.'],
      ['పని & సహాయం', 'కూలీలు కావాలా, పని ఇవ్వాలా — ఇక్కడ పోస్ట్ చేయండి.'],
      ['ఇంధనం', 'దగ్గర్లోని పంపుల డీజిల్, పెట్రోల్ ధరలు.'],
      ['అసిస్టెంట్ చాట్', 'ఏ ప్రశ్నైనా వాయిస్‌లో అడగండి — వెంటనే సమాధానం.'],
      ['ప్రభుత్వ సేవలు', 'పథకాలు, సబ్సిడీలు, దరఖాస్తులు — అన్నీ ఒకే చోట.'],
    ],
  },
  kn: {
    offer: 'ಧ್ವನಿ ಮಾರ್ಗದರ್ಶನ ಬೇಕೆ?',
    offerYes: 'ಹೌದು, ಹೇಳಿ',
    offerNo: 'ಬೇಡ',
    activeLabel: 'ಧ್ವನಿ ಮಾರ್ಗದರ್ಶನ ಆನ್',
    stopGuide: 'ನಿಲ್ಲಿಸಿ',
    greet: 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮೊಂದಿಗೆ ಇದ್ದೇನೆ — ಹಂತ ಹಂತವಾಗಿ ಮಾರ್ಗದರ್ಶನ ಮಾಡುತ್ತೇನೆ. ಪ್ರಾರಂಭಿಸೋಣ.',
    phone: 'ಮೊದಲು, ಕೆಳಗಿನ ದೊಡ್ಡ ಚೌಕದಲ್ಲಿ ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಹತ್ತು ಅಂಕಿಗಳಲ್ಲಿ ಬರೆಯಿರಿ.',
    phoneComplete: 'ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ! ಈಗ ಕೆಳಗಿನ ಹಸಿರು ದೊಡ್ಡ ಗುಂಡಿಯನ್ನು ಒತ್ತಿರಿ.',
    otp: 'ನಿಮ್ಮ ಫೋನ್‌ಗೆ ಬಂದ ಆರು ಅಂಕಿಯ ಸಂಕೇತವನ್ನು ಕೆಳಗಿನ ಆರು ಸಣ್ಣ ಚೌಕಗಳಲ್ಲಿ ಬರೆಯಿರಿ.',
    register: 'ಈಗ ನಿಮ್ಮ ಹೆಸರು, ಗ್ರಾಮ, ರಾಜ್ಯ ಬರೆದು ಮುಂದುವರಿಸಿ.',
    aadhaar_login: 'ನಿಮ್ಮ ಹನ್ನೆರಡು ಅಂಕಿಯ ಆಧಾರ್ ಸಂಖ್ಯೆ ಬರೆದು, OTP ಯಿಂದ ದೃಢೀಕರಿಸಿ.',
    aadhaar_otp: 'ಫೋನ್‌ಗೆ ಬಂದ ಆರು ಅಂಕಿಯ ಸಂಕೇತ ಕೆಳಗೆ ಬರೆಯಿರಿ.',
    success: 'ಅಭಿನಂದನೆಗಳು! ನೀವು ಲಾಗಿನ್ ಆಗಿದ್ದೀರಿ. ಈಗ ಸೇವೆಗಳನ್ನು ನಿಧಾನವಾಗಿ ಹೇಳುತ್ತೇನೆ.',
    didntCatch: 'ಕ್ಷಮಿಸಿ, ಇನ್ನೊಮ್ಮೆ ಹೇಳಿ.',
    askNext: 'ಮುಂದಿನ ಸೇವೆಯ ಬಗ್ಗೆ ಕೇಳಲು ಬಯಸುವಿರಾ?',
    askResume: 'ಮುಂದುವರಿಸಲಿಯಾ?',
    tourIntro: 'ಈ ಆ್ಯಪ್‌ನಲ್ಲಿ ಏನೇನಿದೆ ಎಂದು ಒಂದೊಂದಾಗಿ ಹೇಳುತ್ತೇನೆ. ಪ್ರತಿಯೊಂದರ ನಂತರ ಕೇಳುತ್ತೇನೆ.',
    tourBye: 'ಬೇಕಾದಾಗ ಮೈಕ್ ಒತ್ತಿ ನನ್ನನ್ನು ಕರೆಯಿರಿ. ಶುಭ ದಿನ!',
    tourDone: 'ಇನ್ನೂ ಬಹಳಷ್ಟು ಇದೆ — ನೀವೇ ತೆರೆದು ನೋಡಿ. ಶುಭಾಶಯಗಳು!',
    services: [
      ['ಬೆಳೆ ಪರಿಶೀಲನೆ', 'ಎಲೆಯ ಫೋಟೋ ತೆಗೆಯಿರಿ — ರೋಗ, ಔಷಧಿ ತಕ್ಷಣ ತಿಳಿಯುತ್ತದೆ.'],
      ['ರೋಗ ರೇಡಾರ್', 'ಮೂರು ದಿನಗಳ ಹವಾಮಾನ ನೋಡಿ ರೋಗ ಬರುವ ಮೊದಲೇ ಎಚ್ಚರಿಸುತ್ತದೆ.'],
      ['ಔಷಧಿ ಪರಿಶೀಲನೆ', 'ನಕಲಿ ಔಷಧಿ ಹಿಡಿಯುತ್ತದೆ — ಬಾಟಲಿ ಫೋಟೋ ಸಾಕು.'],
      ['ಮಂಡಿ ಬೆಲೆ', 'ಇಂದಿನ ಬೆಲೆ ನೋಡಿ ಸರಿಯಾದ ಸಮಯದಲ್ಲಿ ಮಾರಿ ಲಾಭ ಪಡೆಯಿರಿ.'],
      ['ಅಂಗಡಿಗಳು', 'ಬೀಜ, ಔಷಧಿ, ಉಪಕರಣ — ಮನೆಯಲ್ಲೇ ಸರಿಯಾದ ಬೆಲೆಗೆ.'],
      ['ಜಂಟಿ ಖರೀದಿ', 'ಹತ್ತಿರದ ರೈತರೊಂದಿಗೆ ಸೇರಿ ಸಗಟು ಬೆಲೆಗೆ ಖರೀದಿಸಿ.'],
      ['ರೈತ ಮಾರುಕಟ್ಟೆ', 'ಬೀಜ, ಟ್ರಾಕ್ಟರ್, ಉಪಕರಣಗಳನ್ನು ಇತರ ರೈತರಿಗೆ ಮಾರಿ ಅಥವಾ ಖರೀದಿಸಿ.'],
      ['ಸಮುದಾಯ', 'ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಕೇಳಿ — ಸಹ ರೈತರು ಉತ್ತರಿಸುತ್ತಾರೆ.'],
      ['ಕೆಲಸ & ಸಹಾಯ', 'ಕೂಲಿ ಬೇಕು ಅಥವಾ ಕೆಲಸ ಕೊಡಬೇಕು — ಇಲ್ಲಿ ಪೋಸ್ಟ್ ಮಾಡಿ.'],
      ['ಇಂಧನ', 'ಹತ್ತಿರದ ಪಂಪ್‌ಗಳ ಡೀಸಲ್, ಪೆಟ್ರೋಲ್ ಬೆಲೆ.'],
      ['ಸಹಾಯಕ ಸಂಭಾಷಣೆ', 'ಯಾವುದೇ ಪ್ರಶ್ನೆ ಧ್ವನಿಯಲ್ಲಿ ಕೇಳಿ — ತಕ್ಷಣ ಉತ್ತರ.'],
      ['ಸರ್ಕಾರಿ ಸೇವೆಗಳು', 'ಯೋಜನೆಗಳು, ಸಬ್ಸಿಡಿ, ಅರ್ಜಿಗಳು — ಎಲ್ಲಾ ಒಂದೇ ಕಡೆ.'],
    ],
  },
  mr: {
    offer: 'आवाजात मार्गदर्शन हवे?',
    offerYes: 'हो, सांगा',
    offerNo: 'नाही',
    activeLabel: 'आवाज मार्गदर्शन सुरू',
    stopGuide: 'थांबवा',
    greet: 'नमस्कार! मी तुमच्यासोबत आहे — पायरी पायरीने सांगतो. सुरू करूया.',
    phone: 'आधी, खालील मोठ्या चौकटीत तुमचा मोबाईल नंबर दहा अंकी लिहा.',
    phoneComplete: 'खूप छान! आता खालील हिरव्या मोठ्या बटणावर दाबा.',
    otp: 'तुमच्या फोनवर आलेला सहा अंकी कोड खाली सहा लहान चौकटीत लिहा.',
    register: 'आता तुमचे नाव, गाव आणि राज्य भरून पुढे जा.',
    aadhaar_login: 'तुमचा बारा अंकी आधार नंबर लिहा आणि OTP ने सत्यापित करा.',
    aadhaar_otp: 'फोनवर आलेला सहा अंकी कोड खाली लिहा.',
    success: 'अभिनंदन! तुम्ही लॉगिन झालात. आता सेवा सांगतो.',
    didntCatch: 'क्षमस्व, पुन्हा सांगा.',
    askNext: 'पुढच्या सेवेबद्दल ऐकू इच्छिता?',
    askResume: 'सुरू ठेवू का?',
    tourIntro: 'या ॲपमध्ये काय काय आहे ते एकेक सांगतो. प्रत्येकानंतर मी विचारीन.',
    tourBye: 'गरज असल्यास मायक दाबून मला बोलावा. शुभ दिवस!',
    tourDone: 'अजून खूप काही आहे — स्वतः उघडून पहा. शुभेच्छा!',
    services: [
      ['पीक तपासणी', 'पानाचा फोटो घ्या — रोग आणि उपचार लगेच समजतात.'],
      ['रोग रडार', 'पुढील तीन दिवसांचे हवामान पाहून रोग येण्यापूर्वी सांगते.'],
      ['औषध तपासणी', 'नकली औषध ओळखते — बाटलीचा फोटो पुरेसा.'],
      ['मंडी भाव', 'आजचे भाव पाहून योग्य वेळी विकून नफा मिळवा.'],
      ['दुकाने', 'बियाणे, औषधे, अवजारे — घरून योग्य दरात.'],
      ['एकत्र खरेदी', 'जवळच्या शेतकऱ्यांसोबत घाऊक दरात माल मंगवा.'],
      ['शेतकरी बाजार', 'बियाणे, ट्रॅक्टर, अवजारे इतर शेतकऱ्यांना विका किंवा खरेदी करा.'],
      ['समुदाय', 'तुमच्या भाषेत विचारा — सहकारी शेतकरी उत्तर देतील.'],
      ['काम व मदत', 'मजूर हवेत का काम द्यायचे आहे — येथे पोस्ट करा.'],
      ['इंधन', 'जवळच्या पंपचे डिझेल-पेट्रोल भाव.'],
      ['सहाय्यक संभाषण', 'कोणताही प्रश्न आवाजात विचारा — लगेच उत्तर.'],
      ['शासकीय सेवा', 'योजना, अनुदान, अर्ज — सर्व एकाच ठिकाणी.'],
    ],
  },
};

// voice-control intents per language (matched as substrings, lowercase)
const INTENTS = {
  hi: {
    yes: ['हां', 'हाँ', 'haan', 'yes', 'चलिए', 'ठीक', 'सुनाओ', 'सुनाना', 'आगे'],
    no: ['नहीं', 'ना', 'no', 'बस', 'रुकना', 'Enough'],
    stop: ['बंद करो', 'बंद', 'रुको', 'रुक जाओ', 'stop', 'चुप'],
    repeat: ['फिर से', 'दोहरा', 'फिर बोलो', 'repeat', 'पुनः'],
    skip: ['अगला', 'छोड़ो', 'skip', 'next', 'स्किप'],
  },
  en: {
    yes: ['yes', 'yeah', 'sure', 'ok', 'okay', 'go ahead', 'continue', 'next'],
    no: ['no', 'nope', 'stop', 'enough', 'not now'],
    stop: ['stop', 'stop it', 'quiet', 'shut'],
    repeat: ['repeat', 'again', 'say again'],
    skip: ['skip', 'next one'],
  },
  ta: {
    yes: ['ஆம்', 'சரி', 'ok', 'தொடர்', 'சொல்லுங்கள்'],
    no: ['இல்லை', 'வேண்டாம்', 'போதும்'],
    stop: ['நிறுத்து', 'நிறுத்துங்கள்', 'stop'],
    repeat: ['மீண்டும்', 'repeat'],
    skip: ['அடுத்தது', 'skip', 'next'],
  },
  te: {
    yes: ['అవును', 'సరే', 'ok', 'కొనసాగించు', 'చెప్పండి'],
    no: ['లేదు', 'వద్దు', 'చాలు'],
    stop: ['ఆపు', 'ఆపండి', 'stop'],
    repeat: ['మళ్ళీ', 'repeat'],
    skip: ['తర్వాతది', 'skip', 'next'],
  },
  kn: {
    yes: ['ಹೌದು', 'ಸರಿ', 'ok', 'ಮುಂದುವರಿಸು', 'ಹೇಳಿ'],
    no: ['ಇಲ್ಲ', 'ಬೇಡ', 'ಸಾಕು'],
    stop: ['ನಿಲ್ಲಿಸಿ', 'ನಿಲ್ಲು', 'stop'],
    repeat: ['ಇನ್ನೊಮ್ಮೆ', 'repeat'],
    skip: ['ಮುಂದಿನದು', 'skip', 'next'],
  },
  mr: {
    yes: ['हो', 'होय', 'बरं', 'ok', 'सुरू', 'सांगा'],
    no: ['नाही', 'नको', 'पुरे'],
    stop: ['थांब', 'थांबवा', 'stop', 'बंद'],
    repeat: ['पुन्हा', 'repeat'],
    skip: ['पुढचे', 'skip', 'next'],
  },
};

// Pure intent matcher (exported for tests)
export function matchIntent(lang, q) {
  const I = INTENTS[lang] || INTENTS.en;
  const s = String(q || '').toLowerCase();
  const has = (words) => words.some((w) => s.includes(w.toLowerCase()));
  if (has(I.stop)) return 'stop';
  if (has(I.repeat)) return 'repeat';
  if (has(I.yes)) return 'yes';
  if (has(I.no)) return 'no';
  if (has(I.skip)) return 'skip';
  return null;
}

// ── the guide ────────────────────────────────────────────────────────────────

export class VoiceGuide {
  constructor(engine = speechEngine) {
    this.engine = engine;
    this.active = false;
    this.suspended = false;    // another feature owns the mic right now
    this.blocked = false;      // browser blocked speech before any user gesture
    this.tourPending = false;  // login finished → App should start the tour
    this.lang = 'hi';
    this.lastLine = '';
    this.onCommand = null;     // (transcript) => boolean — app-level commands
    this.onStateChange = null; // () => {} — UI subscribes
    this._ackWaiter = null;
    this._listenToken = 0;
    this._tourRunning = false;
  }

  _emit() { if (this.onStateChange) this.onStateChange(); }

  script() { return S[this.lang] || S.hi; }

  start(lang) {
    this.lang = GUIDE_LANGS.includes(lang) ? lang : 'hi';
    this.active = true;
    this.blocked = false;
    this._emit();
  }

  stop() {
    this.active = false;
    this._tourRunning = false;
    this._listenToken += 1;
    this._resolveAck(null);
    try {
      this.engine.stopSpeaking();
      this.engine.stopListening();
    } catch { /* engine may be absent in tests */ }
    this._emit();
  }

  requestTour() { this.tourPending = true; }

  suspend() {
    this.suspended = true;
    try { this.engine.stopListening(); } catch { /* noop */ }
    this._emit();
  }

  resume() {
    this.suspended = false;
    if (this.active) this._listen();
    this._emit();
  }

  // Speak one line; resolves true if it actually played. Re-opens the mic
  // afterwards (that is the barge-in window where the farmer may speak).
  say(text, { listenAfter = true } = {}) {
    this.lastLine = text;
    if (!this.active) return Promise.resolve(false);
    try { this.engine.stopListening(); } catch { /* noop */ }

    const langCode = `${this.lang}-IN`;
    let spoke = false;
    let settled = false;

    return new Promise((resolve) => {
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clearInterval(poll);
        clearTimeout(giveUp);
        if (ok) spoke = true;
        if (!spoke) this.blocked = true;
        if (listenAfter && this.active && !this.blocked) this._listen();
        this._emit();
        resolve(spoke);
      };

      try {
        this.engine.speak(text, langCode, () => finish(true));
      } catch {
        finish(false);
      }

      // Watch the synth: resolve when it has spoken and gone quiet again.
      const poll = setInterval(() => {
        const synth = this.engine.synth;
        if (!synth) return;
        if (synth.speaking) { spoke = true; this.blocked = false; return; }
        if (spoke) finish(true); // was speaking, now quiet → done
      }, 350);

      // Nothing started within 3s → autoplay-blocked (needs a user gesture).
      const giveUp = setTimeout(() => { if (!spoke) finish(false); }, 3000);
    });
  }

  // Ask a yes/no question and wait for the answer (or timeout → 'timeout').
  ask(text, timeoutMs = 16000) {
    return this.say(text).then(() => new Promise((resolve) => {
      if (!this.active) { resolve(null); return; }
      const timer = setTimeout(() => this._resolveAck('timeout'), timeoutMs);
      this._ackWaiter = {
        resolve: (v) => {
          clearTimeout(timer);
          this._ackWaiter = null;
          resolve(v);
        },
      };
    }));
  }

  _resolveAck(v) { if (this._ackWaiter) this._ackWaiter.resolve(v); }

  // Keep the mic hot between instructions; restart when each utterance ends.
  _listen() {
    if (!this.active || this.suspended || !this.engine.recognition) return;
    const token = ++this._listenToken;
    let latest = '';
    const langCode = `${this.lang}-IN`;
    try {
      this.engine.startListening(
        langCode,
        (transcript) => { latest = transcript; },
        () => {
          if (token !== this._listenToken) return;
          if (latest && latest.trim()) this._handleSpeech(latest);
          else if (this.active && !this.suspended) setTimeout(() => {
            if (token === this._listenToken && this.active && !this.suspended) this._listen();
          }, 250);
        },
        () => { /* mic denied or unsupported — guide stays voice-out only */ },
      );
    } catch { /* already started */ }
  }

  _handleSpeech(transcript) {
    const q = String(transcript || '').trim();
    if (!q) return;
    const intent = matchIntent(this.lang, q);

    if (intent === 'stop') {
      this.stop();
      return;
    }
    if (intent === 'repeat') {
      this.say(this.lastLine);
      return;
    }

    // If we asked a question ("continue?"), the answer decides the flow.
    if (this._ackWaiter) {
      if (intent === 'yes' || intent === 'skip') { this._resolveAck('yes'); return; }
      if (intent === 'no') { this._resolveAck('no'); return; }
      // They said something else — let the app try to act on it…
      if (this.onCommand && this.onCommand(q)) {
        // …then politely ask whether to continue. Hand the outer question's
        // waiter over explicitly — the inner ask() owns the ack slot meanwhile.
        const outer = this._ackWaiter ? this._ackWaiter.resolve : null;
        this._ackWaiter = null;
        this.ask(this.script().askResume).then((ans) => {
          if (outer) outer(ans === 'no' ? 'no' : 'yes');
        });
        return;
      }
      this._resolveAck('yes'); // unrecognized while waiting → keep going
      return;
    }

    // Idle speech (no question pending): app command, else a gentle prompt.
    if (this.onCommand && this.onCommand(q)) return;
    this.say(this.script().didntCatch);
  }

  // The post-login service tour: one service at a time, asking between each.
  async runServiceTour() {
    if (this._tourRunning) return;
    this._tourRunning = true;
    const L = this.script();
    this.active = true;
    this._emit();

    await this.say(L.tourIntro);
    for (const [name, desc] of L.services) {
      if (!this._tourRunning) return;
      await this.say(`${name}. ${desc}`);
      if (!this._tourRunning) return;
      const ans = await this.ask(L.askNext);
      if (!this._tourRunning) return;
      if (ans === 'no') {
        await this.say(L.tourBye, { listenAfter: false });
        this.stop();
        return;
      }
      // yes / timeout / unrecognized → continue at their pace
    }
    await this.say(L.tourDone, { listenAfter: false });
    this.stop();
  }

  stopTour() { this._tourRunning = false; this.stop(); }
}

export const voiceGuide = new VoiceGuide();
