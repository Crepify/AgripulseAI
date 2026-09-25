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
    askNext: 'आगे की सेवा सुनेंगे? हाँ बोलिए।',
    langSwitched: 'ठीक है, अब मैं हिंदी में बात करूँगा।',
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
    askNext: 'Want to hear the next service? Just say yes.',
    langSwitched: 'Alright — from now on I will speak in English.',
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
    langSwitched: 'சரி — இனிமேல் நான் தமிழில் பேசுவேன்.',
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
    langSwitched: 'సరే — ఇకపై నేను తెలుగులో మాట్లాడతాను.',
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
    langSwitched: 'ಸರಿ — ಈಗ ನಾನು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ.',
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
    langSwitched: 'ठीक आहे — आता मी मराठीत बोलेन.',
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

// Romanized Hindi — same keys as S.hi. On devices without a native Devanagari
// voice the guide speaks these through the English voice, so the farmer still
// hears fluent Hindi instead of silence or garbled script.
const PHON = {
  hi: {
    greet: 'Namaste! Main aapke saath hoon, ek-ek kadam batata chaloonga. Chaliye shuru karte hain.',
    phone: 'Sabse pehle, neeche bade khaali box mein apna mobile number likhiye. Poore das ank.',
    phoneComplete: 'Bahut badhiya! Ab neeche hare rang ka bada button dabaiye.',
    otp: 'Aapke phone par chhah ankon ka code aaya hai. Wahi code neeche chhah chhote box mein bhariye.',
    register: 'Ab bas apna naam, gaon aur rajya bhar dijiye, phir aage badhein dabaa dijiye.',
    aadhaar_login: 'Apna barah ankon ka Aadhaar number likhiye, phir OTP se satyapit karein.',
    aadhaar_otp: 'Aapke phone par aaya chhah ankon ka code neeche likhiye.',
    success: 'Badhai ho! Aap login ho gaye. Ab main aapko dheere-dheere batata hoon ki yeh app kya-kya seva deta hai.',
    didntCatch: 'Maaf kijiye, phir se boliye.',
    askNext: 'Aage ki seva sunenge? Haan boliye.',
    langSwitched: 'Theek hai, ab main Hindi mein baat karunga.',
    askResume: 'Kya main jaari rakhun?',
    tourIntro: 'To suniye, is app mein kya-kya hai. Har seva ke baad main poochhoonga, tab tak aaraam se sunte rahiye.',
    tourBye: 'Jab bhi zaroorat ho, mic dabakar mujhe bulaa lijiye. Aapka din shubh ho!',
    tourDone: 'Bas itni hi nahin, aur bhi bahut kuch hai. Khud tab kholkar dekhiye. Shubhkaamnaayein!',
    services: [
      ['Fasal jaanch', 'Patte ki photo kheenchiye, bimaari aur ilaaj turant mil jaayega.'],
      ['Bimaari radar', 'Agle teen din ke mausam se fasal ko khatra hai ya nahin, bimaari aane se pehle batata hai.'],
      ['Dava jaanch', 'Nakli keetnashak pakadta hai, bottle ki photo se company ki pushti hoti hai.'],
      ['Mandi bhaav', 'Aaj ke bhaav dekhiye aur sahi samay par bechkar munafa nikaliye.'],
      ['Dukaanein', 'Beej, dava aur auzar sahi daam par ghar baithe mangwaiye.'],
      ['Saajha khareed', 'Aas-paas ke kisaanon ke saath milkar thok bhaav par saaman mangwaiye.'],
      ['Kisaan baazaar', 'Atirikt beej, tractor ya auzar doosre kisaanon ko bechiye ya khareediye.'],
      ['Kisaan samudaay', 'Apni bhaasha mein sawaal poochhiye, saathi kisaan jawaab denge.'],
      ['Kaam aur madad', 'Mazdoor chahiye ya kaam dena hai, yahan post kijiye.'],
      ['Eendhan', 'Aas-paas ke pumpon ka diesel petrol bhaav dekhiye.'],
      ['Sahaayak baatcheet', 'Koi bhi sawaal bolkar poochhiye, jawaab turant milega.'],
      ['Sarkaari sevaayein', 'Yojanaayein, subsidy aur aavedan, sab ek jagah.'],
    ],
  },
};

// ── location → language ───────────────────────────────────────────────────────
// Indian states whose primary language is one we support; everything else in
// India falls back to Hindi. Non-India → English.

const STATE_LANG = {
  'tamil nadu': 'ta', 'puducherry': 'ta', 'pondicherry': 'ta',
  'andhra pradesh': 'te', 'telangana': 'te',
  'karnataka': 'kn',
  'maharashtra': 'mr', 'goa': 'mr',
};

export function langFromRegion(countryCode, state) {
  const cc = String(countryCode || '').toUpperCase();
  if (cc === 'IN' || cc === 'IND') {
    return STATE_LANG[String(state || '').toLowerCase().trim()] || 'hi';
  }
  return 'en';
}

const GEO_CACHE_KEY = 'ap_guide_geo_lang';
const GEO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // re-check weekly

function geoCache() {
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.at > GEO_CACHE_TTL_MS) return null;
    return GUIDE_LANGS.includes(parsed.lang) ? parsed.lang : null;
  } catch { return null; }
}
function setGeoCache(lang) {
  try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ lang, at: Date.now() })); } catch { /* private mode */ }
}

function geolocate(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('no_geolocation'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: timeoutMs, maximumAge: 10 * 60 * 1000 },
    );
  });
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&accept-language=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('nominatim_failed');
  const data = await res.json();
  return { country: data?.address?.country_code, state: data?.address?.state || data?.address?.region };
}

async function ipLocate() {
  const res = await fetch('https://ipwho.is/?fields=country_code,region');
  if (!res.ok) throw new Error('ipwho_failed');
  const data = await res.json();
  return { country: data?.country_code, state: data?.region };
}

/**
 * Where is the farmer, and what language do they speak there?
 *   1. browser language already a supported Indian language → trust it
 *   2. GPS position → reverse-geocoded state (e.g. Delhi → hi, Karnataka → kn)
 *   3. IP location → state
 *   4. browser language / English
 * Cached for a week so we don't ping services on every visit.
 */
export async function detectLanguageByLocation() {
  const cached = geoCache();
  if (cached) return cached;

  let base = 'en';
  try {
    base = String(navigator.language || 'en').toLowerCase().split('-')[0];
  } catch { /* ssr */ }
  if (['hi', 'ta', 'te', 'kn', 'mr'].includes(base)) return base; // strong signal, no lookup needed

  let lang = null;
  // GPS (precise — a farmer in Tamil Nadu gets Tamil even on an English phone)
  try {
    const pos = await geolocate();
    const region = await reverseGeocode(pos.lat, pos.lon);
    lang = langFromRegion(region.country, region.state);
  } catch { /* denied / timeout → fall through to IP */ }

  // IP (approximate but permission-free)
  if (!lang) {
    try {
      const region = await ipLocate();
      lang = langFromRegion(region.country, region.state);
    } catch { /* offline → browser language */ }
  }

  if (!lang) lang = GUIDE_LANGS.includes(base) ? base : 'en';
  if (lang === 'en' && base === 'en') setGeoCache(lang);
  else if (lang !== 'en') setGeoCache(lang);
  return lang;
}

// voice-control intents per language (matched as substrings, lowercase)
const INTENTS = {
  hi: {
    yes: ['हां', 'हाँ', 'haan', 'yes', 'चलिए', 'ठीक', 'सुनाओ', 'सुनाना', 'आगे'],
    no: ['नहीं', 'ना', 'no', 'बस', 'रुकना', 'Enough', 'nahi', 'nahin'],
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
  const s = String(q || '').toLowerCase();
  // Whole-word matching. Substring matching let random chatter hijack the
  // guide ("know"/"now" counted as "no", 'ना' inside longer words, "stop"
  // inside "stopping by"...). Multi-word intents stay phrase matches.
  const tokens = s.split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
  const has = (words) => words.some((w) => {
    const wl = String(w).toLowerCase();
    return wl.includes(' ') ? s.includes(wl) : tokens.includes(wl);
  });
  // The farmer may answer in ANY language while the guide keeps speaking its
  // own — check the guide's language first, then every other language.
  const own = INTENTS[lang] || INTENTS.en;
  const others = Object.keys(INTENTS).map((k) => INTENTS[k]).filter((I) => I !== own);
  for (const I of [own, ...others]) {
    if (has(I.stop)) return 'stop';
    if (has(I.repeat)) return 'repeat';
    if (has(I.yes)) return 'yes';
    if (has(I.no)) return 'no';
    if (has(I.skip)) return 'skip';
  }
  return null;
}

// "English mein bolo" / "speak hindi" / "தமிழில் பேசு" — switch the guide's
// language on request. Requires a language name AND a speak/change verb, so
// plain mentions ("tamil nadu mein bhaav") never trigger a switch.
const LANG_SWITCH_NAMES = {
  en: ['english', 'angrezi', 'angreji', 'अंग्रेज़ी', 'अंग्रेजी', 'इंग्लिश', 'ஆங்கில', 'ఇంగ్లీష్', 'ಇಂಗ್ಲಿಷ್'],
  hi: ['hindi', 'हिंदी'],
  ta: ['tamil', 'tamizh', 'तमिल', 'தமிழ'],
  te: ['telugu', 'तेलुगु', 'తెలుగు'],
  kn: ['kannada', 'कन्नड', 'ಕನ್ನಡ'],
  mr: ['marathi', 'मराठी'],
};
const LANG_SWITCH_VERBS = [
  'bolo', 'bol', 'बोलो', 'बोल', 'speak', 'talk', 'reply', 'respond', 'answer',
  'say', 'karo', 'करो', 'badlo', 'बदलो', 'change', 'switch', 'baat', 'बात',
  'kaho', 'कहो', 'samjhao', 'समझाओ', 'explain', 'பேசு', 'சொல்லு',
  'చెప్పు', 'చెప్పండి', 'ಹೇಳು', 'ಹೇಳಿ',
];

export function matchLangSwitch(q, currentLang) {
  const s = String(q || '').toLowerCase();
  if (!s) return null;
  const tokens = s.split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
  const hasVerb = LANG_SWITCH_VERBS.some((v) =>
    tokens.includes(v) || (v.length >= 4 && s.includes(v)));
  if (!hasVerb) return null;
  for (const [lang, names] of Object.entries(LANG_SWITCH_NAMES)) {
    if (lang === currentLang) continue;
    if (names.some((n) => s.includes(n.toLowerCase()))) return lang;
  }
  return null;
}

// The farmer's explicitly chosen language ("English mein bolo") outranks
// browser/location detection on every later visit.
export function savedLangPref() {
  try {
    const v = localStorage.getItem('ap_guide_lang_pref');
    return GUIDE_LANGS.includes(v) ? v : null;
  } catch { return null; }
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
    this._subscribers = new Set(); // UI subscribers (multiple components safely)
    this._ackWaiter = null;
    this._listenToken = 0;
    this._tourRunning = false;
    this._speechQueue = Promise.resolve(); // serialize lines — never cancel mid-word
    this._voicesReady = false;
    this._reminderTimers = [];             // patient step reminders
    this._reminderToken = 0;               // invalidates in-flight reminder schedules
    this.tourAskMs = 5000;                 // tour pace: silence → keep going
    this._speaking = false;                // our own TTS is playing — mic MUST stay off
    this._listenCycle = 0;                 // rotates an English ear in while asking
  }

  _emit() {
    this._subscribers.forEach((fn) => { try { fn(); } catch { /* subscriber error */ } });
  }

  // Multiple components can watch the guide at once (login page + app shell)
  // without stealing each other's callback. Returns an unsubscribe function.
  subscribe(fn) {
    this._subscribers.add(fn);
    try { fn(); } catch { /* immediate sync */ }
    return () => { this._subscribers.delete(fn); };
  }

  script() { return S[this.lang] || S.hi; }

  _voiceInfo() {
    try {
      return this.engine.getBestVoice ? this.engine.getBestVoice(`${this.lang}-IN`) : null;
    } catch { return null; }
  }

  // Best render of a known line for THIS device:
  //   native voice → native script · else romanized (hi) · else English
  _renderLine(key) {
    const L = this.script();
    const vi = this._voiceInfo();
    const native = L[key];
    if (typeof native !== 'string') return String(native ?? '');
    if (vi && vi.isNative) return native; // CONFIRMED native voice → native script
    const phon = PHON[this.lang] && PHON[this.lang][key];
    if (phon) return phon;                // no/unknown native voice → romanized
    if (this.lang !== 'en' && typeof S.en[key] === 'string') return S.en[key];
    return native;                         // english
  }

  sayKey(key, opts = {}) {
    return this.say(this._renderLine(key), opts);
  }

  askKey(key, timeoutMs = 16000) {
    return this.ask(this._renderLine(key), timeoutMs);
  }

  // ── Patient step reminders ─────────────────────────────────────────────
  // A step instruction is spoken once; if the farmer hasn't acted after a
  // minute it is repeated, once more after another minute — then the guide
  // stays quiet (never nags forever). Moving to any new step clears it.
  clearReminder() {
    this._reminderTimers.forEach((t) => clearTimeout(t));
    this._reminderTimers = [];
    // Bump the token: a guideStep whose line is STILL BEING SPOKEN must not
    // schedule its reminders afterwards (the farmer already moved on — e.g.
    // voice-fill completed the number mid-sentence). Without this, a stale
    // "enter your mobile number" could fire on the OTP screen a minute later.
    this._reminderToken++;
  }

  guideStep(key, { repeats = 2, delayMs = 60_000 } = {}) {
    this.clearReminder();
    const token = this._reminderToken;
    this.sayKey(key).then(() => {
      if (!this.active || token !== this._reminderToken) return; // superseded mid-speech
      for (let i = 1; i <= repeats; i++) {
        this._reminderTimers.push(setTimeout(() => {
          // skip politely if another feature owns the mic or a question is pending
          if (!this.active || this.suspended || this._ackWaiter) return;
          this.sayKey(key);
        }, delayMs * i));
      }
    });
    return undefined;
  }

  // Farmer asked for another language ("English mein bolo") — switch now and
  // remember it: next visit it outranks browser + location detection.
  setLanguage(lang) {
    if (!GUIDE_LANGS.includes(lang) || lang === this.lang) return false;
    this.lang = lang;
    try { localStorage.setItem('ap_guide_lang_pref', lang); } catch { /* private mode */ }
    this._emit();
    return true;
  }

  start(lang) {
    this.lang = GUIDE_LANGS.includes(lang) ? lang : 'hi';
    this.active = true;
    this.blocked = false;
    this._emit();
  }

  stop() {
    this.active = false;
    this._tourRunning = false;
    this.clearReminder();
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

  // Wait (once) for the browser to load its voice list — Chrome populates
  // speechSynthesis.getVoices() asynchronously, and speaking before it is
  // ready silently falls back to a terrible default voice.
  async _ensureVoices() {
    if (this._voicesReady) return;
    const e = this.engine;
    const count = () => (e && e.voices ? e.voices.length : 0);
    if (count() > 0) { this._voicesReady = true; return; }
    await new Promise((res) => {
      const done = () => { this._voicesReady = true; res(); };
      const t = setTimeout(done, 2000); // don't stall the guide forever
      try {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const handler = () => { if (count() > 0) { clearTimeout(t); window.speechSynthesis.removeEventListener('voiceschanged', handler); done(); } };
          window.speechSynthesis.addEventListener('voiceschanged', handler);
        } else {
          clearTimeout(t);
          setTimeout(done, 50);
        }
      } catch { clearTimeout(t); done(); }
    });
    try { if (e && e.loadVoices) e.loadVoices(); } catch { /* noop */ }
  }

  // Speak one line; resolves true if it actually played. Lines are QUEUED —
  // a new line never cancels the one before it mid-word.
  say(text, { listenAfter = true } = {}) {
    if (!this.active) return Promise.resolve(false);
    let resolve;
    const p = new Promise((res) => { resolve = res; });
    const run = () => this._sayNow(text, listenAfter).then(
      (v) => { resolve(v); return v; },
      () => { resolve(false); return false; },
    );
    // small natural gap between consecutive lines
    this._speechQueue = this._speechQueue.then(() => new Promise((r) => setTimeout(r, 250))).then(run, run);
    return p;
  }

  async _sayNow(text, listenAfter) {
    this.lastLine = text;
    if (!this.active) return false;
    await this._ensureVoices();
    try { this.engine.stopListening(); } catch { /* noop */ }

    const langCode = `${this.lang}-IN`;
    let spoke = false;
    let settled = false;
    this._speaking = true; // mic must not hear our own voice through the speakers
    try {
    return await new Promise((resolve) => {
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        this._speaking = false;
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
    } finally {
      this._speaking = false; // backstop: never leave the mic deadlocked off
    }
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

  // The recognizer is single-language. While the guide speaks a regional
  // language the farmer may still answer a question in English — so every
  // third listening cycle during a pending question listens in en-IN.
  _listenLangCode() {
    this._listenCycle++;
    if (this.lang !== 'en' && this._ackWaiter && (this._listenCycle % 3) === 0) return 'en-IN';
    return `${this.lang}-IN`;
  }

  // Keep the mic hot between instructions; restart when each utterance ends.
  _listen() {
    if (!this.active || this.suspended || this._speaking || !this.engine.recognition) return;
    const token = ++this._listenToken;
    let latest = '';
    const langCode = this._listenLangCode();
    const revive = (ms) => setTimeout(() => {
      if (token === this._listenToken && this.active && !this.suspended && !this._speaking) this._listen();
    }, ms);
    try {
      this.engine.startListening(
        langCode,
        (transcript) => { latest = transcript; },
        () => {
          if (token !== this._listenToken) return;
          if (latest && latest.trim()) this._handleSpeech(latest);
          else if (this.active && !this.suspended) revive(250);
        },
        (err) => {
          // 'not-allowed' / 'service-not-allowed' / 'audio-capture' = no mic
          // at all — the guide stays voice-out only. Anything else (no-speech,
          // network, aborted…) is a hiccup: Chrome does NOT always fire onend
          // after onerror, so restart the loop ourselves or the guide goes deaf.
          if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(err)) return;
          if (token === this._listenToken) revive(300);
        },
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

    // Explicit language request ("English mein bolo") — works any time. The
    // guide keeps speaking its regional language until the farmer asks.
    const switchTo = matchLangSwitch(q, this.lang);
    if (switchTo) {
      const outer = this._ackWaiter ? this._ackWaiter.resolve : null;
      this._ackWaiter = null;
      this.setLanguage(switchTo);
      this.sayKey('langSwitched').then(() => {
        if (outer) {
          // re-ask the pending question in the new language
          this.askKey('askResume').then((ans) => outer(ans === 'no' ? 'no' : 'yes'));
        }
      });
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
        this.askKey('askResume').then((ans) => {
          if (outer) outer(ans === 'no' ? 'no' : 'yes');
        });
        return;
      }
      this._resolveAck('yes'); // unrecognized while waiting → keep going
      return;
    }

    // During the tour, a clear "no / bas / enough" stops it politely even
    // when no question is pending (the farmer answered a beat late).
    if (this._tourRunning && intent === 'no') {
      this._tourRunning = false;
      this.sayKey('tourBye', { listenAfter: false }).then(() => this.stop());
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
    this.active = true;
    this._emit();

    await this.sayKey('tourIntro');
    for (let i = 0; i < this.script().services.length; i++) {
      if (!this._tourRunning) return;
      // re-read per iteration — the farmer may switch language mid-tour
      const L = this.script();
      const vi = this._voiceInfo();
      let line;
      if (vi && vi.isNative) {
        line = `${L.services[i][0]}. ${L.services[i][1]}`;
      } else if (PHON[this.lang] && PHON[this.lang].services && PHON[this.lang].services[i]) {
        const [pn, pd] = PHON[this.lang].services[i];
        line = `${pn}. ${pd}`;
      } else {
        line = `${S.en.services[i][0]}. ${S.en.services[i][1]}`;
      }
      await this.say(line);
      if (!this._tourRunning) return;
      // Silence or anything unclear → continue at their pace; the 5s cap
      // keeps the tour alive instead of 16s of dead air that feels like
      // "the guide is done" after every single service.
      const ans = await this.askKey('askNext', this.tourAskMs);
      if (!this._tourRunning) return;
      if (ans === 'no') {
        await this.sayKey('tourBye', { listenAfter: false });
        this.stop();
        return;
      }
      // yes / timeout / unrecognized → continue at their pace
    }
    await this.sayKey('tourDone', { listenAfter: false });
    this.stop();
  }

  stopTour() { this._tourRunning = false; this.stop(); }
}

export const voiceGuide = new VoiceGuide();
