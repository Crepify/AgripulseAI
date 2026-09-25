// Community forum — farmer queries to fellow farmers
const COMMUNITY_KEY = 'ap_community_v1';

export const DEFAULT_POSTS = [
  { id: 1, author: 'Ramesh Kumar', village: 'Mandya, Karnataka', crop: 'Tomato', question: 'मेरे टमाटर में नीचे के पत्ते पीले हो रहे हैं, क्या करूं?', questionEn: 'My tomato lower leaves turning yellow, what to do?', answers: [{ author: 'Suresh (Agronomist)', text: 'यह Early Blight हो सकता है। नीचे के पत्ते हटाएं और Bacillus subtilis 3 ढक्कन/15L छिड़कें।', likes: 12, verified: true }], likes: 15, time: Date.now() - 3600000*2, language: 'hi', tags: ['Tomato', 'Yellow leaves'] },
  { id: 2, author: 'Lakshmi Devi', village: 'Nashik, Maharashtra', crop: 'Grapes', question: 'द्राक्ष बागेत भुरी रोग आला आहे, जैविक उपाय काय?', questionEn: 'Powdery mildew in grapes, organic solution?', answers: [{ author: 'Anil, Nashik', text: 'बेकिंग सोडा 5g + नीम तेल 5ml प्रति लिटर फवारा। सकाळी 7 वाजता।', likes: 8, verified: false }], likes: 9, time: Date.now() - 3600000*5, language: 'mr', tags: ['Grapes', 'Powdery'] },
  { id: 3, author: 'Gurpreet Singh', village: 'Ludhiana, Punjab', crop: 'Wheat', question: 'ਕਣਕ ਵਿੱਚ ਪੀਲਾ ਰਤੂਆ ਆ ਗਿਆ, ਕਿਹੜੀ ਦਵਾਈ?', questionEn: 'Yellow rust in wheat, which medicine?', answers: [{ author: 'PAU Expert', text: 'Propiconazole 25% EC 1 cap/15L immediately. Remove severely infected plants.', likes: 20, verified: true }], likes: 22, time: Date.now() - 3600000*10, language: 'pa', tags: ['Wheat', 'Rust'] },
  { id: 4, author: 'Priya', village: 'Coimbatore, TN', crop: 'Rice', question: 'Rice blast spreading fast in my 2 acre, need urgent help', questionEn: 'Rice blast spreading fast in my 2 acre, need urgent help', answers: [], likes: 5, time: Date.now() - 3600000*1, language: 'en', tags: ['Rice', 'Blast', 'Urgent'] },
];

export function getCommunityPosts() {
  try {
    const raw = localStorage.getItem(COMMUNITY_KEY);
    if (!raw) {
      localStorage.setItem(COMMUNITY_KEY, JSON.stringify(DEFAULT_POSTS));
      return DEFAULT_POSTS;
    }
    return JSON.parse(raw);
  } catch { return DEFAULT_POSTS; }
}

export function addCommunityPost(post) {
  try {
    const posts = getCommunityPosts();
    const newPost = { id: Date.now(), likes: 0, answers: [], time: Date.now(), ...post };
    posts.unshift(newPost);
    localStorage.setItem(COMMUNITY_KEY, JSON.stringify(posts.slice(0, 100)));
    return posts;
  } catch { return getCommunityPosts(); }
}

export function addAnswer(postId, answer) {
  try {
    const posts = getCommunityPosts();
    const idx = posts.findIndex(p => p.id === postId);
    if (idx >= 0) {
      posts[idx].answers.push({ ...answer, likes: 0, time: Date.now() });
      localStorage.setItem(COMMUNITY_KEY, JSON.stringify(posts));
    }
    return posts;
  } catch { return getCommunityPosts(); }
}

export function likePost(postId) {
  try {
    const posts = getCommunityPosts();
    const idx = posts.findIndex(p => p.id === postId);
    if (idx >= 0) {
      posts[idx].likes += 1;
      localStorage.setItem(COMMUNITY_KEY, JSON.stringify(posts));
    }
    return posts;
  } catch { return getCommunityPosts(); }
}
