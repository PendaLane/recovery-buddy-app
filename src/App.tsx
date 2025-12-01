import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, BookHeart, BotMessageSquare, MapPin, Phone, AlertCircle, FileText, Award, BookOpen, UserCog, LogOut, TrendingUp, ShieldCheck, Send, Bot, Loader2, Sparkles, Save, Plus, Trash2, User, Mail, List, Siren } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { GoogleGenAI } from '@google/genai';

// --- CONFIG ---
// In Netlify, we access keys via import.meta.env
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// --- TYPES ---
type View = 'DASHBOARD' | 'MEETINGS' | 'AI_COACH' | 'JOURNAL' | 'STEPWORK' | 'BADGES' | 'READINGS' | 'CONTACTS' | 'HELP';

// --- SERVICES ---
const aiClient = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const getAIResponse = async (msg: string) => {
  if (!aiClient) return "Please configure the API Key in Netlify Settings.";
  try {
    const model = aiClient.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: "Act as a recovery coach. " + msg }] }]
    });
    return result.response.text();
  } catch (e) { return "I'm having trouble connecting right now."; }
};

// --- APP COMPONENT ---
function App() {
  const [view, setView] = useState<View>('DASHBOARD');
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  
  // State
  const [sobrietyDate, setSobrietyDate] = useState(localStorage.getItem('mrb_date') || '');
  const [journals, setJournals] = useState(JSON.parse(localStorage.getItem('mrb_journals') || '[]'));
  const [streak, setStreak] = useState(parseInt(localStorage.getItem('mrb_streak') || '0'));

  // Effects
  useEffect(() => {
    window.addEventListener('resize', () => setMobile(window.innerWidth < 768));
    return () => window.removeEventListener('resize', () => {});
  }, []);

  useEffect(() => localStorage.setItem('mrb_date', sobrietyDate), [sobrietyDate]);
  useEffect(() => localStorage.setItem('mrb_journals', JSON.stringify(journals)), [journals]);

  // Calculations
  const daysSober = sobrietyDate ? Math.floor((new Date().getTime() - new Date(sobrietyDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  // --- SUB-COMPONENTS (Simplified for single file view) ---
  
  const Sidebar = () => (
    <nav className={mobile ? "fixed bottom-0 w-full bg-white border-t border-[#e5cfe0] flex p-2 z-50 overflow-x-auto gap-2" : "w-64 bg-[#f8e6f2] border-r border-[#e5cfe0] flex flex-col p-4 h-full"}>
      {!mobile && <div className="mb-6 text-center"><h1 className="font-bold text-[#7A0050]">Recovery Buddy</h1></div>}
      {[
        { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'MEETINGS', icon: MapPin, label: 'Meetings' },
        { id: 'AI_COACH', icon: BotMessageSquare, label: 'AI Coach' },
        { id: 'JOURNAL', icon: BookHeart, label: 'Journal' },
        { id: 'STEPWORK', icon: FileText, label: 'Stepwork' },
        { id: 'BADGES', icon: Award, label: 'Badges' },
        { id: 'CONTACTS', icon: Phone, label: 'Contacts' },
      ].map(i => (
        <button key={i.id} onClick={() => setView(i.id as View)} className={`flex items-center gap-3 p-3 rounded-lg text-sm mb-1 ${view === i.id ? 'bg-[#7A0050] text-white' : 'text-[#7A0050] hover:bg-white'}`}>
          <i.icon size={20} /> {!mobile && i.label}
        </button>
      ))}
      <div className="mt-auto pt-4 border-t border-[#e5cfe0]/50 flex flex-col gap-2">
        <a href="https://pendalane.com/membership-account/" className="flex items-center gap-3 p-3 text-sm text-[#7A0050] hover:bg-white rounded-lg">
            <UserCog size={20} /> {!mobile && "My Membership"}
        </a>
        <button onClick={() => setView('HELP')} className="flex items-center gap-3 p-3 text-sm text-red-600 hover:bg-red-50 rounded-lg">
            <AlertCircle size={20} /> {!mobile && "Crisis Help"}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-[#FFF8EC] text-[#2d1b27]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24">
        {view === 'DASHBOARD' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#7A0050] to-[#b33a89] rounded-2xl p-6 text-white relative overflow-hidden">
              <Award className="absolute right-0 top-0 opacity-10" size={150} />
              <div className="relative z-10">
                <h2 className="text-xl font-bold">Welcome Back</h2>
                <div className="mt-4 text-center">
                    <div className="text-5xl font-bold">{daysSober > 0 ? daysSober : 0}</div>
                    <div className="text-sm opacity-90">Days Sober</div>
                    {!sobrietyDate && <input type="date" onChange={e => setSobrietyDate(e.target.value)} className="mt-4 text-black p-2 rounded" />}
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#e5cfe0] shadow-sm">
                <h3 className="font-bold text-[#7A0050] mb-4">Mood History</h3>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={journals.slice(-7).map((j:any) => ({ score: 3 }))}>
                            <Area type="monotone" dataKey="score" stroke="#7A0050" fill="#f8e6f2" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>
        )}

        {view === 'AI_COACH' && <AICoachView />}
        {/* Add other views here... */}
        
        {view === 'HELP' && (
            <div className="text-center pt-10">
                <Siren size={64} className="mx-auto text-red-500 animate-pulse" />
                <h2 className="text-3xl font-bold mt-4">Immediate Support</h2>
                <a href="tel:988" className="block bg-red-600 text-white p-4 rounded-xl font-bold text-xl mt-6 max-w-sm mx-auto">CALL 988</a>
            </div>
        )}
      </main>
    </div>
  );
}

// Separate Component for Chat to manage its own state
const AICoachView = () => {
    const [msg, setMsg] = useState('');
    const [history, setHistory] = useState([{role:'model', text:"Hi, I'm your Recovery Buddy."}]);
    const [loading, setLoading] = useState(false);

    const send = async () => {
        if(!msg) return;
        const newHistory = [...history, {role:'user', text:msg}];
        setHistory(newHistory);
        setMsg('');
        setLoading(true);
        const response = await getAIResponse(msg);
        setHistory([...newHistory, {role:'model', text: response}]);
        setLoading(false);
    }

    return (
        <div className="flex flex-col h-[80vh] bg-white rounded-2xl border border-[#e5cfe0]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {history.map((m, i) => (
                    <div key={i} className={`p-3 rounded-lg max-w-[80%] ${m.role==='user'?'ml-auto bg-[#7A0050] text-white':'bg-[#f8e6f2]'}`}>
                        {m.text}
                    </div>
                ))}
                {loading && <div className="text-sm text-gray-400">Thinking...</div>}
            </div>
            <div className="p-4 border-t flex gap-2">
                <input className="flex-1 border p-2 rounded" value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type here..." />
                <button onClick={send} className="bg-[#7A0050] text-white p-2 rounded"><Send /></button>
            </div>
        </div>
    )
}

export default App;
