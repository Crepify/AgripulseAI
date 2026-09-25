import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, Send, MapPin, Search, Sparkles, AlertTriangle, CheckCircle2, Mic } from 'lucide-react';
import { sound } from '../utils/audio';
import { getCommunityPosts, addCommunityPost, addAnswer, likePost } from '../utils/communityData';
import { speechEngine } from '../utils/speech';

export default function TabCommunity({ selectedLang, isSunlightMode }) {
  const [posts, setPosts] = useState(() => getCommunityPosts());
  const [query, setQuery] = useState('');
  const [newQ, setNewQ] = useState('');
  const [newCrop, setNewCrop] = useState('Tomato');
  const [answerInputs, setAnswerInputs] = useState({});
  const [isListening, setIsListening] = useState(false);

  const handlePost = () => {
    if (!newQ.trim()) return;
    sound.playClick();
    const added = addCommunityPost({ author: 'You', village: 'Your Village', crop: newCrop, question: newQ, questionEn: newQ, language: selectedLang });
    setPosts(added);
    setNewQ('');
    sound.playSuccess();
  };

  const handleAnswer = (postId) => {
    const txt = answerInputs[postId];
    if (!txt?.trim()) return;
    sound.playClick();
    const updated = addAnswer(postId, { author: 'You', text: txt, verified: false });
    setPosts(updated);
    setAnswerInputs({ ...answerInputs, [postId]: '' });
    sound.playSuccess();
  };

  const handleLike = (id) => {
    sound.playClick();
    setPosts(likePost(id));
  };

  const handleVoiceInput = () => {
    if (isListening) { speechEngine.stopListening(); setIsListening(false); return; }
    const langMap = { hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', mr: 'mr-IN', gu: 'gu-IN', bn: 'bn-IN', pa: 'pa-IN', en: 'en-IN' };
    const code = langMap[selectedLang] || 'hi-IN';
    setIsListening(true);
    speechEngine.startListening(code, (transcript)=>{
      setNewQ(transcript);
    }, ()=>setIsListening(false), ()=>setIsListening(false));
  };

  const filtered = posts.filter(p => !query || `${p.question} ${p.crop} ${p.tags?.join(' ')}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      <div className={`p-3 rounded-2xl border flex items-center justify-between ${isSunlightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center">💬</span>
          <span className="font-black text-sm">Community</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold border">{filtered.length}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 grow ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
          <Search className="w-4 h-4 text-zinc-500" />
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search Tomato yellow leaves, wheat rust..." className={`bg-transparent outline-none text-xs font-bold w-full ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`} />
        </div>
      </div>

      <div className={`p-4 rounded-2xl border-2 space-y-3 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
        <h4 className="font-black text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4 text-emerald-500" /> Ask your question — in Hindi, Tamil, Punjabi, any language</h4>
        <div className="flex gap-2">
          <select value={newCrop} onChange={e=>setNewCrop(e.target.value)} className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300">
            <option>Tomato</option><option>Rice</option><option>Wheat</option><option>Cotton</option><option>Grapes</option><option>General</option>
          </select>
          <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border-2 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-800 border-zinc-700'}`}>
            <input value={newQ} onChange={e=>setNewQ(e.target.value)} placeholder="Type your farming query..." className={`flex-1 bg-transparent outline-none text-xs font-bold ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`} />
            <button onClick={handleVoiceInput} className={`p-1.5 rounded-full ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-black'}`}><Mic className="w-4 h-4" /></button>
          </div>
          <button onClick={handlePost} className="px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs flex items-center gap-1"><Send className="w-4 h-4" /> Post</button>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map(post=>(
          <div key={post.id} className={`p-5 rounded-2xl border-2 space-y-3 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-[#121514] border-[#1f2421] text-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm">{post.author}</span>
                  <span className="text-[11px] text-zinc-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {post.village}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 text-[10px] font-black">{post.crop}</span>
                  {post.tags?.includes('Urgent') && <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Urgent</span>}
                </div>
                <div className="mt-2 text-sm font-bold leading-relaxed">{post.question}</div>
                <div className="text-[11px] text-zinc-500 mt-1">{post.questionEn !== post.question ? post.questionEn : ''}</div>
                <div className="flex items-center gap-2 mt-2">
                  {post.tags?.map(tag=><span key={tag} className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-bold border">#{tag}</span>)}
                </div>
              </div>
              <button onClick={()=>handleLike(post.id)} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-black"><ThumbsUp className="w-3.5 h-3.5" /> {post.likes}</button>
            </div>

            {post.answers.length>0 && (
              <div className="space-y-2">
                {post.answers.map((ans, idx)=>(
                  <div key={idx} className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800 border-zinc-700'}`}>
                    <div className="flex items-center gap-2 text-xs font-black">{ans.author} {ans.verified && <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Agronomist</span>}</div>
                    <div className="text-xs mt-1">{ans.text}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input value={answerInputs[post.id]||''} onChange={e=>setAnswerInputs({...answerInputs, [post.id]: e.target.value})} placeholder="Write answer in your language..." className={`flex-1 px-3 py-2 rounded-xl border-2 text-xs font-bold ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-800 border-zinc-700 text-white'}`} />
              <button onClick={()=>handleAnswer(post.id)} className="px-3 py-2 rounded-xl bg-blue-500 text-white font-black text-xs">Reply</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
