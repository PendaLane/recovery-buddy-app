import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, BookHeart, BotMessageSquare, MapPin, Phone, 
  AlertCircle, FileText, Award, BookOpen, UserCog, LogOut, 
  TrendingUp, ShieldCheck, Send, Bot, Loader2, Sparkles, Save, 
  Plus, Trash2, User, Mail, List, Siren, CheckCircle, ExternalLink,
  Share2, Camera, Menu, X, Flame, LogIn
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { GoogleGenAI } from '@google/genai';
import { getCurrentUser, loadState, saveState, WPState, subscribeToJournals } from '../services/backend';
import { View, JournalEntry, MeetingLog, Contact, StepWork, Badge, Streak, UserProfile } from '../types';
import { StepWorkComponent } from './components/StepWork';
import { Readings } from './components/Readings';
import { Badges } from './components/Badges';
import { MeetingFinder } from './components/MeetingFinder';

// --- CONFIGURATION ---
const GEMINI_API_KEY = process.env.API_KEY || "";

// --- AI SERVICE ---
let aiClient: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  } catch (e) {
    console.error("AI Init Error", e);
  }
}

const getAICoachResponse = async (history: {role:string, text:string}[], msg: string) => {
  if (!aiClient) return "Please configure the API Key in Vercel Settings.";
  try {
    const model = "gemini-2.5-flash";
    const result = await aiClient.models.generateContent({
      model,
      contents: `You are "Recovery Buddy". Act as a compassionate, 12-step aware recovery coach and sponsor. Keep responses concise (under 100 words) and supportive. History: ${JSON.stringify(history.slice(-3))} User says: ${msg}`,
    });
    return result.text || "I'm here with you.";
  } catch (e) { 
    console.error(e);
    return "I'm having trouble connecting right now."; 
  }
};

const analyzeJournalEntry = async (text: string, mood: string) => {
  if (!aiClient) return "Good job writing this down.";
  try {
    const result = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Reflect on this journal (Mood: ${mood}): "${text}". Provide 2 sentences: one validation, one gentle encouragement.`,
    });
    return result.text || "Good job writing this down.";
  } catch (e) { return "Good job writing this down."; }
};

// --- MAIN APP COMPONENT ---
function App() {
  const [view, setView] = useState<View>(View.DASHBOARD);
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // -- STATE MANAGEMENT --
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [sobrietyDate, setSobrietyDate] = useState(localStorage.getItem('mrb_date') || '');
  const [journals, setJournals] = useState<JournalEntry[]>([]); // Synced via Backend/Firebase
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stepwork, setStepwork] = useState<StepWork[]>([]);
  const [logs, setLogs] = useState<MeetingLog[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [streak, setStreak] = useState<Streak>({ current: 0, longest: 0, lastCheckInDate: null });
  const [journalCount, setJournalCount] = useState(0);
  
  // Profile Photo & Name (Local overrides or WP defaults)
  const [profilePhoto, setProfilePhoto] = useState(localStorage.getItem('mrb_photo') || "https://secure.gravatar.com/avatar/?s=96&d=mm&r=g");
  const [userName, setUserName] = useState("Recovery Buddy"); // Will update on login

  // -- INITIALIZATION --
  useEffect(() => {
    const init = async () => {
      // 1. Get User
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // FIX: If logged in, force update the username display to match WP
      if (currentUser.isLoggedIn && currentUser.displayName) {
        setUserName(currentUser.displayName);
        // Also use WP avatar if we haven't manually overridden it locally yet
        if (!localStorage.getItem('mrb_photo')) {
            setProfilePhoto(currentUser.avatar);
        }
      } else {
        // Guest mode fallback
        setUserName(localStorage.getItem('mrb_username') || "Recovery Buddy");
      }

      // 2. Load State (WP or Local)
      const state = await loadState(currentUser.isLoggedIn);
      if (state) {
        setSobrietyDate(state.sobrietyDate || localStorage.getItem('mrb_date') || '');
        setLogs(state.logs || []);
        setContacts(state.contacts || []);
        setStepwork(state.sponsors || []);
        setBadges(state.badges || []);
        setStreak(state.streak || { current: 0, longest: 0, lastCheckInDate: null });
        setJournalCount(state.journalCount || 0);
      }
      setIsLoading(false);
    };

    init();
    
    const handleResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // -- PERSISTENCE --
  // Sync Journals from Firebase separately
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToJournals(user, (entries) => {
        setJournals(entries);
    });
    return () => unsubscribe();
  }, [user]);

  // Save other state to WP/Local
  useEffect(() => {
    if (isLoading || !user) return;
    const currentState: WPState = {
        logs, contacts, sponsors: stepwork, sobrietyDate, badges, streak, journalCount, chatCount: 0
    };
    saveState(currentState, user.isLoggedIn);
    
    // Also keep local backups of strictly local prefs
    localStorage.setItem('mrb_date', sobrietyDate);
    localStorage.setItem('mrb_photo', profilePhoto);
    localStorage.setItem('mrb_username', userName);
  }, [logs, contacts, stepwork, sobrietyDate, badges, streak, journalCount, user, isLoading, profilePhoto, userName]);


  // -- LOGIC --
  const daysSober = sobrietyDate ? Math.floor((new Date().getTime() - new Date(sobrietyDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const awardBadge = (key: string, label: string) => {
    if (!badges.find(b => b.key === key)) {
      const newBadge = { id: Date.now().toString(), key, label, earnedAt: new Date().toISOString(), icon: '🏅' };
      setBadges([...badges, newBadge]);
      alert(`🎉 You earned a badge: ${label}`);
    }
  };

  const handleCheckIn = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationStr = `Lat: ${position.coords.latitude.toFixed(4)}, Lon: ${position.coords.longitude.toFixed(4)}`;
          completeCheckIn(locationStr);
        },
        (error) => {
          console.warn("GPS Error", error);
          completeCheckIn("Location Unavailable");
        }
      );
    } else {
      completeCheckIn("GPS Not Supported");
    }
  };

  const completeCheckIn = (location: string) => {
    const today = new Date().toISOString().slice(0, 10);
    let newStreakCount = streak.current;
    
    if (streak.lastCheckInDate !== today) {
      if (streak.lastCheckInDate) {
        const diff = Math.floor((new Date(today).getTime() - new Date(streak.lastCheckInDate).getTime()) / (1000 * 60 * 60 * 24));
        newStreakCount = diff === 1 ? streak.current + 1 : 1;
      } else {
        newStreakCount = 1;
      }
      setStreak({ current: newStreakCount, longest: Math.max(newStreakCount, streak.longest), lastCheckInDate: today });
    }

    setLogs([{ id: Date.now().toString(), timestamp: new Date().toISOString(), type: 'Check-In', location }, ...logs]);
    
    const count = logs.filter(l => l.type === 'Check-In').length + 1;
    if (count === 1) awardBadge('first_mtg', 'First Meeting');
    if (newStreakCount === 7) awardBadge('streak_7', '7 Day Streak');
    if (newStreakCount === 30) awardBadge('streak_30', '30 Day Streak');
    alert("Checked In! " + location);
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const shareApp = async () => {
    const data = {
      title: 'My Recovery Buddy',
      text: 'Check out this free recovery companion app by Penda Lane.',
      url: window.location.href
    };
    if (navigator.share) {
      try { await navigator.share(data); } catch(e) {}
    } else {
      alert("Copy this link to share: " + window.location.href);
    }
  };

  const menuItems = [
    { id: View.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
    { id: View.MEETINGS, icon: MapPin, label: 'Meeting Finder' },
    { id: View.AI_COACH, icon: BotMessageSquare, label: 'AI Companion' },
    { id: View.JOURNAL, icon: BookHeart, label: 'Journal' },
    { id: View.STEPWORK, icon: FileText, label: 'My Stepwork' },
    { id: View.BADGES, icon: Award, label: 'Badges' },
    { id: View.READINGS, icon: BookOpen, label: 'Readings' },
    { id: View.CONTACTS, icon: Phone, label: 'Phone Book' },
  ];

  const handleNav = (id: View) => {
    setView(id);
    setMenuOpen(false);
  }

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-penda-cream text-penda-purple"><Loader2 className="animate-spin mr-2"/> Loading your recovery space...</div>;

  const Sidebar = () => (
    <nav className="w-64 bg-[#f8e6f2] border-r border-[#e5cfe0] flex flex-col p-4 h-full shrink-0 overflow-y-auto">
        <div className="mb-8 text-center px-2">
          {/* USER PROFILE CARD (SIDEBAR) */}
          <div className="bg-white p-4 rounded-2xl border border-[#e5cfe0] mb-6 shadow-sm">
             <div className="relative group mx-auto w-16 h-16 mb-2">
                <img src={profilePhoto} alt="Profile" className="w-16 h-16 rounded-full border-2 border-[#7A0050] object-cover" />
                <label className="absolute bottom-0 right-0 bg-[#7A0050] text-white p-1 rounded-full cursor-pointer hover:bg-[#b33a89]">
                  <Camera size={12} />
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
             </div>
             {/* Editable username locally, but relies on WP sync primarily */}
             <input value={userName} onChange={e => setUserName(e.target.value)} className="text-center font-bold text-[#7A0050] w-full bg-transparent outline-none focus:bg-[#f8e6f2] rounded px-1" />
             
             {/* STATS ROW */}
             <div className="flex justify-center gap-3 mt-2 text-xs text-[#2d1b27]">
                <div className="flex items-center gap-1 bg-[#f8e6f2] px-2 py-1 rounded-full border border-[#e5cfe0]">
                    <Flame size={12} className="text-orange-500" /> 
                    <span className="font-bold">{streak.current}</span>
                </div>
                <div className="flex items-center gap-1 bg-[#f8e6f2] px-2 py-1 rounded-full border border-[#e5cfe0]">
                    <Award size={12} className="text-yellow-600" />
                    <span className="font-bold">{badges.length}</span>
                </div>
             </div>
          </div>
          
          <img 
            src="https://pendalane.com/wp-content/uploads/2024/04/cropped-Penda-Lane-Behavioral-Health-Logo.png" 
            alt="Penda Lane" 
            className="w-24 h-24 mx-auto mb-2 rounded-full object-cover mix-blend-multiply aspect-square"
          />
          <h1 className="font-bold text-[#7A0050] text-xl leading-tight mt-2">My Recovery Buddy</h1>
          <p className="text-[10px] text-[#2d1b27] uppercase tracking-wide mt-1 font-bold">By Penda Lane Behavioral Health</p>
          <p className="text-[10px] text-[#b33a89] italic mt-1 border-t border-[#e5cfe0] pt-2">"Meetings. Sponsors. Support. In your pocket."</p>
        </div>
      
      {menuItems.map(i => (
        <button key={i.id} onClick={() => handleNav(i.id)} className={`flex items-center gap-3 p-3 rounded-lg text-sm mb-1 whitespace-nowrap transition-all ${view === i.id ? 'bg-[#7A0050] text-white shadow-md' : 'text-[#7A0050] hover:bg-white hover:shadow-sm'}`}>
          <i.icon size={20} /> {i.label}
        </button>
      ))}

      <div className="mt-auto pt-4 border-t border-[#e5cfe0]/50 flex flex-col gap-2">
        <button onClick={shareApp} className="flex items-center gap-3 p-3 text-sm text-[#7A0050] hover:bg-white rounded-lg">
            <Share2 size={20} /> Share App
        </button>
        <a href="https://pendalane.com/membership-account/" className="flex items-center gap-3 p-3 text-sm text-[#7A0050] hover:bg-white rounded-lg">
            <UserCog size={20} /> My Membership
        </a>
        <button onClick={() => handleNav(View.HELP)} className="flex items-center gap-3 p-3 text-sm text-red-600 hover:bg-red-50 rounded-lg whitespace-nowrap font-medium">
            <AlertCircle size={20} /> Help & Crisis
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-[#FFF8EC] text-[#2d1b27]">
      {!mobile && <Sidebar />}
      
      <main className="flex-1 overflow-y-auto relative">
        {/* MOBILE HEADER */}
        {mobile && (
          <div className="sticky top-0 z-40 bg-[#FFF8EC] border-b border-[#e5cfe0] shadow-sm">
             <div className="flex items-center justify-between p-3">
                {/* Branding Left - Stacked */}
                <div className="flex items-center gap-3 flex-1">
                    <img 
                        src="https://pendalane.com/wp-content/uploads/2024/04/cropped-Penda-Lane-Behavioral-Health-Logo.png" 
                        alt="Logo" 
                        className="w-12 h-12 rounded-full object-cover mix-blend-multiply border border-[#e5cfe0] aspect-square flex-shrink-0"
                    />
                    <div className="flex flex-col leading-tight min-w-0">
                        <span className="font-bold text-[#7A0050] text-sm truncate">My Recovery Buddy</span>
                        <span className="text-[9px] text-[#2d1b27] uppercase font-bold truncate">By Penda Lane Behavioral Health</span>
                        <span className="text-[8px] text-[#b33a89] italic truncate">"Meetings. Sponsors. Support. In your pocket."</span>
                    </div>
                </div>

                {/* Right Profile & Menu */}
                <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                    {/* Hamburger Button */}
                    <button 
                        onClick={() => setMenuOpen(!menuOpen)} 
                        className="p-2 bg-white rounded-lg border border-[#e5cfe0] text-[#7A0050] hover:bg-[#f8e6f2]"
                    >
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
             </div>

             {/* MOBILE DROPDOWN MENU */}
             {menuOpen && (
                 <div className="absolute top-full left-0 w-full bg-white border-b border-[#e5cfe0] shadow-xl rounded-b-2xl p-4 flex flex-col gap-2 z-50 animate-in slide-in-from-top-2">
                    {/* User Profile Card Mobile Menu */}
                    <div className="bg-[#f8e6f2] p-4 rounded-xl flex items-center gap-3 mb-2">
                        <img src={profilePhoto} className="w-12 h-12 rounded-full border-2 border-[#7A0050] object-cover" />
                        <div>
                            <div className="font-bold text-[#7A0050]">{userName}</div>
                            <div className="flex gap-2 text-xs mt-1">
                                <span className="flex items-center gap-1"><Flame size={12} className="text-orange-500"/> {streak.current}</span>
                                <span className="flex items-center gap-1"><Award size={12} className="text-yellow-600"/> {badges.length}</span>
                            </div>
                        </div>
                    </div>

                    {menuItems.map(i => (
                        <button 
                            key={i.id} 
                            onClick={() => handleNav(i.id)} 
                            className={`flex items-center gap-4 p-3 rounded-xl text-sm font-medium transition-all ${view === i.id ? 'bg-[#7A0050] text-white' : 'bg-gray-50 text-[#7A0050]'}`}
                        >
                            <i.icon size={20} /> {i.label}
                        </button>
                    ))}
                    <div className="h-px bg-[#e5cfe0] my-2"></div>
                    <button onClick={shareApp} className="flex items-center gap-4 p-3 rounded-xl text-sm font-medium bg-white border border-[#e5cfe0] text-[#7A0050]">
                        <Share2 size={20} /> Share App
                    </button>
                    {user?.isLoggedIn ? (
                        <a href="/wp-login.php?action=logout&redirect_to=/" className="flex items-center gap-4 p-3 rounded-xl text-sm font-medium bg-white border border-[#e5cfe0] text-[#7A0050]">
                            <LogOut size={20} /> Log Out
                        </a>
                    ) : (
                        <a href="/login/" className="flex items-center gap-4 p-3 rounded-xl text-sm font-medium bg-white border border-[#e5cfe0] text-[#7A0050]">
                            <LogIn size={20} /> Sign In
                        </a>
                    )}
                    <button onClick={() => handleNav(View.HELP)} className="flex items-center gap-4 p-3 rounded-xl text-sm font-medium bg-red-50 text-red-600 border border-red-100">
                        <AlertCircle size={20} /> Help & Crisis
                    </button>
                 </div>
             )}
          </div>
        )}

        <div className="p-4 md:p-8 pb-24 max-w-5xl mx-auto">
            {/* CONTENT RENDER */}
            {view === View.DASHBOARD && <Dashboard sobrietyDate={sobrietyDate} setSobrietyDate={setSobrietyDate} journals={journals} streakCount={streak.current} />}
            {view === View.MEETINGS && <MeetingFinder logs={logs} onCheckIn={handleCheckIn} onCheckOut={() => setLogs([{id:Date.now().toString(), timestamp:new Date().toISOString(), type:'Check-Out'}, ...logs])} />}
            {view === View.AI_COACH && <AICoachView />}
            {view === View.JOURNAL && <JournalView journals={journals} setJournals={setJournals} awardBadge={awardBadge} />}
            {view === View.STEPWORK && <StepWorkComponent stepWorkList={stepwork} saveStepWork={w=>setStepwork([...stepwork, w])} deleteStepWork={id=>setStepwork(stepwork.filter(i=>i.id!==id))} />}
            {view === View.BADGES && <Badges badges={badges} streak={streak} />}
            {view === View.READINGS && <Readings />}
            {view === View.CONTACTS && <ContactsView list={contacts} setList={setContacts} />}
            {view === View.HELP && (
                <div className="text-center pt-10 max-w-lg mx-auto">
                    <Siren size={80} className="mx-auto text-red-500 animate-pulse" />
                    <h2 className="text-3xl font-bold mt-6 mb-2 text-[#2d1b27]">Immediate Crisis Support</h2>
                    <p className="text-gray-600 mb-8">If you are in danger or need immediate help, these options connect you now.</p>
                    
                    <div className="space-y-4">
                        <a href="tel:988" className="block w-full bg-red-600 text-white p-4 rounded-xl font-bold text-xl hover:bg-red-700 shadow-lg transition-transform hover:scale-[1.02]">
                            CALL 988
                        </a>
                        <a href="sms:988" className="block w-full bg-white border-2 border-red-600 text-red-600 p-4 rounded-xl text-lg font-bold hover:bg-red-50 transition-colors">
                            TEXT 988
                        </a>
                        <a href="https://findtreatment.gov" target="_blank" className="block w-full bg-[#2d1b27] text-white p-4 rounded-xl text-lg font-bold hover:opacity-90">
                            FIND TREATMENT NEAR YOU
                        </a>
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS (DEFINED LOCALLY) ---

const AICoachView = () => {
    const [msg, setMsg] = useState('');
    const [history, setHistory] = useState<{role:string, text:string}[]>([{role:'model', text:"Hi, I'm your Recovery Buddy. How are you feeling today?"}]);
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [history]);

    const send = async () => {
        if(!msg.trim()) return;
        const newHistory = [...history, {role:'user', text:msg}];
        setHistory(newHistory);
        setMsg('');
        setLoading(true);
        const response = await getAICoachResponse(newHistory, msg);
        setHistory([...newHistory, {role:'model', text: response}]);
        setLoading(false);
    }

    return (
        <div className="flex flex-col h-[70vh] bg-white rounded-2xl border border-[#e5cfe0] shadow-sm overflow-hidden">
            <div className="bg-[#f8e6f2] p-4 border-b border-[#e5cfe0] flex items-center gap-3">
                <div className="bg-white p-2 rounded-full text-[#7A0050]"><Bot size={20}/></div>
                <div><h3 className="font-bold text-[#7A0050]">AI Companion</h3><p className="text-xs text-[#b33a89]">Private & Secure</p></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {history.map((m, i) => (
                    <div key={i} className={`p-3 rounded-xl max-w-[85%] text-sm ${m.role==='user'?'ml-auto bg-[#7A0050] text-white':'bg-gray-100 text-[#2d1b27]'}`}>
                        {m.text}
                    </div>
                ))}
                {loading && <div className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="animate-spin" size={12}/> Thinking...</div>}
                <div ref={endRef} />
            </div>
            <div className="p-4 border-t border-[#e5cfe0] flex gap-2">
                <input className="flex-1 border border-[#e5cfe0] p-3 rounded-xl outline-none focus:border-[#7A0050]" value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type here..." />
                <button onClick={send} disabled={loading} className="bg-[#7A0050] text-white p-3 rounded-xl hover:bg-[#b33a89] disabled:opacity-50"><Send size={18}/></button>
            </div>
        </div>
    )
}

const JournalView = ({ journals, setJournals, awardBadge }: { journals: JournalEntry[], setJournals: any, awardBadge: any }) => {
    const [view, setView] = useState('list');
    const [mood, setMood] = useState('Okay');
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);

    const save = async () => {
        if(!text) return;
        setLoading(true);
        const ai = await analyzeJournalEntry(text, mood);
        const newEntry = { id: Date.now().toString(), date: new Date().toISOString(), mood, text, aiReflection: ai };
        const newList = [newEntry, ...journals];
        setJournals(newList);
        setLoading(false); setText(''); setView('list');
        if(newList.length === 1) awardBadge('journal_1', 'First Journal');
        if(newList.length === 5) awardBadge('journal_5', '5 Journal Entries');
    };

    if(view === 'new') return (
        <div className="bg-white p-6 rounded-2xl border border-[#e5cfe0] shadow-sm space-y-4">
            <h3 className="font-bold text-[#7A0050]">New Entry</h3>
            <div className="flex gap-2 flex-wrap">
                {['Great','Good','Okay','Struggling','Crisis'].map(m => (
                    <button key={m} onClick={()=>setMood(m)} className={`px-4 py-2 rounded-full text-sm border ${mood===m?'bg-[#7A0050] text-white':'bg-white text-gray-600'}`}>{m}</button>
                ))}
            </div>
            <textarea className="w-full border border-[#e5cfe0] p-4 rounded-xl h-40 outline-none focus:border-[#7A0050]" value={text} onChange={e=>setText(e.target.value)} placeholder="What's on your mind?" />
            <div className="flex gap-2">
                <button onClick={save} disabled={loading} className="flex-1 bg-[#7A0050] text-white py-3 rounded-xl font-bold hover:bg-[#b33a89] flex justify-center items-center gap-2">
                    {loading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Save
                </button>
                <button onClick={()=>setView('list')} className="px-6 py-3 border border-[#e5cfe0] rounded-xl text-[#7A0050] hover:bg-gray-50">Cancel</button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[#7A0050]">Journal</h2>
                <button onClick={()=>setView('new')} className="bg-[#7A0050] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm hover:bg-[#b33a89]"><Plus size={18}/> New Entry</button>
            </div>
            <div className="space-y-4">
                {journals.length === 0 ? <p className="text-gray-400 italic text-center py-10">No entries yet.</p> : journals.map(j => (
                    <div key={j.id} className="bg-white p-5 rounded-2xl border border-[#e5cfe0] shadow-sm">
                        <div className="flex justify-between mb-3 text-xs">
                            <span className="px-3 py-1 bg-[#f8e6f2] text-[#7A0050] rounded-full font-bold">{j.mood}</span>
                            <span className="text-gray-400">{new Date(j.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-[#2d1b27] mb-4 whitespace-pre-wrap">{j.text}</p>
                        {j.aiReflection && <div className="bg-[#f8e6f2] p-3 rounded-xl text-xs text-[#7A0050] flex gap-2"><Sparkles size={16} className="shrink-0"/> <div><b>AI Reflection:</b> {j.aiReflection}</div></div>}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ContactsView = ({ list, setList }: { list: Contact[], setList: any }) => {
    const [f, setF] = useState({ name: '', phone: '', role: 'Sponsor', fellowship: 'AA' });
    const save = () => {
        if(!f.name) return;
        setList([...list, { ...f, id: Date.now().toString() }]);
        setF({ name: '', phone: '', role: 'Sponsor', fellowship: 'AA' });
    };
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#7A0050]">Phone Book</h2>
            <div className="bg-white p-6 rounded-2xl border border-[#e5cfe0] shadow-sm space-y-3">
                <div className="flex gap-3">
                    <input value={f.name} onChange={e=>setF({...f, name:e.target.value})} placeholder="Name" className="flex-1 p-3 border border-[#e5cfe0] rounded-xl outline-none" />
                    <input value={f.phone} onChange={e=>setF({...f, phone:e.target.value})} placeholder="Phone" className="w-32 p-3 border border-[#e5cfe0] rounded-xl outline-none" />
                </div>
                <div className="flex gap-3">
                    <select value={f.role} onChange={e=>setF({...f, role:e.target.value})} className="flex-1 p-3 border border-[#e5cfe0] rounded-xl bg-white"><option>Sponsor</option><option>Peer</option><option>Therapist</option></select>
                    <select value={f.fellowship} onChange={e=>setF({...f, fellowship:e.target.value})} className="flex-1 p-3 border border-[#e5cfe0] rounded-xl bg-white"><option>AA</option><option>NA</option><option>CA</option><option>Other</option></select>
                </div>
                <button onClick={save} className="w-full bg-[#7A0050] text-white py-3 rounded-xl font-bold hover:bg-[#b33a89]">Add Contact</button>
            </div>
            <div className="space-y-2">
                {list.map(c => (
                    <div key={c.id} className="bg-white p-4 rounded-xl border border-[#e5cfe0] flex justify-between items-center shadow-sm">
                        <div>
                            <div className="font-bold text-[#2d1b27]">{c.name}</div>
                            <div className="text-xs text-gray-500">{c.role} • {c.fellowship}</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <a href={`tel:${c.phone}`} className="bg-[#f8e6f2] p-2 rounded-full text-[#7A0050] hover:bg-[#7A0050] hover:text-white transition-colors"><Phone size={18}/></a>
                            <button onClick={()=>setList(list.filter(l=>l.id!==c.id))} className="text-gray-300 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default App;
