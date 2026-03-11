import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, loginWithGoogle, logout, onAuthStateChanged, User, db, collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc, orderBy, getDocs } from './firebase';
import { Goal, Task, MemoryItem, DailyLog, UserProfile, ChatMessage } from './types';
import { Layout, MessageSquare, LayoutDashboard, Database, CheckSquare, LogOut, LogIn, Plus, Send, MoreVertical, Trash2, ExternalLink, ChevronRight, AlertCircle, Image as ImageIcon, X, History, Download, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// --- Contexts ---
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

// --- Components ---

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.startsWith('{')) {
        setHasError(true);
        setErrorInfo(event.error.message);
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle size={32} />
            <h2 className="text-xl font-bold">Firestore Error</h2>
          </div>
          <p className="text-gray-600 mb-6">
            There was a problem with your database permissions. Please check your security rules.
          </p>
          <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-40 mb-6">
            {errorInfo}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Bypassing real auth for "No Login" requirement
    setUser({
      uid: 'hua-default',
      displayName: 'hua',
      email: 'hua@example.com',
      photoURL: null,
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => { },
      getIdToken: async () => '',
      getIdTokenResult: async () => ({} as any),
      reload: async () => { },
      toJSON: () => ({})
    } as any);
    setLoading(false);
  }, []);

  const login = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
    }
  };

  const logoutUser = async () => {
    try {
      await logout();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-olive-600 rounded-full bg-[#5A5A40]"></div>
          <p className="text-[#5A5A40] font-serif italic">Loading Hua's World...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout: logoutUser }}>
      <ErrorBoundary>
        <MainApp />
      </ErrorBoundary>
    </AuthContext.Provider>
  );
}

function LoginScreen() {
  const { login } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[32px] shadow-2xl p-12 text-center border border-[#5A5A40]/10"
      >
        <div className="w-20 h-20 bg-[#5A5A40] rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
          <Layout className="text-white" size={40} />
        </div>
        <h1 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-4">Hua's Coach</h1>
        <p className="text-[#5A5A40] italic mb-10 text-lg">
          Your personal PM & productivity partner.
        </p>
        <button
          onClick={login}
          className="w-full py-4 bg-[#5A5A40] text-white rounded-full font-medium text-lg hover:bg-[#4a4a35] transition-all flex items-center justify-center gap-3 shadow-md active:scale-95"
        >
          <LogIn size={24} />
          Sign in with Google
        </button>
      </motion.div>
    </div>
  );
}

function MainApp() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'tasks' | 'memory' | 'archive'>('chat');

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex flex-col md:flex-row">
      {/* Sidebar */}
      <nav className="w-full md:w-24 bg-white border-b md:border-b-0 md:border-r border-[#5A5A40]/10 flex md:flex-col items-center justify-between p-4 md:py-8 z-50">
        <div className="hidden md:flex flex-col items-center gap-8 w-full">
          <div className="w-12 h-12 bg-[#5A5A40] rounded-2xl flex items-center justify-center shadow-md">
            <Layout className="text-white" size={24} />
          </div>
          <div className="flex flex-col gap-4 w-full items-center">
            <NavIcon active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={24} />} label="Coach" subLabel="教練對話" />
            <NavIcon active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} label="Dashboard" subLabel="儀表板" />
            <NavIcon active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={24} />} label="Tasks" subLabel="任務清單" />
            <NavIcon active={activeTab === 'memory'} onClick={() => setActiveTab('memory')} icon={<Database size={24} />} label="Memory" subLabel="記憶庫" />
            <NavIcon active={activeTab === 'archive'} onClick={() => setActiveTab('archive')} icon={<History size={24} />} label="Archive" subLabel="已完成" />
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="flex md:hidden items-center justify-around w-full">
          <NavIcon active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={24} />} />
          <NavIcon active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} />
          <NavIcon active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={24} />} />
          <NavIcon active={activeTab === 'memory'} onClick={() => setActiveTab('memory')} icon={<Database size={24} />} />
          <NavIcon active={activeTab === 'archive'} onClick={() => setActiveTab('archive')} icon={<History size={24} />} />
        </div>

        {/* No logout in no-login mode */}
        <div className="p-3 opacity-0 pointer-events-none">
          <LogOut size={24} />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && <ChatView key="chat" />}
          {activeTab === 'dashboard' && <DashboardView key="dashboard" />}
          {activeTab === 'tasks' && <TaskView key="tasks" />}
          {activeTab === 'memory' && <MemoryView key="memory" />}
          {activeTab === 'archive' && <HistoryView key="archive" />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavIcon({ active, onClick, icon, label, subLabel }: { active: boolean, onClick: () => void, icon: React.ReactNode, label?: string, subLabel?: string }) {
  return (
    <button
      onClick={onClick}
      className={`group relative p-3 rounded-2xl transition-all duration-300 flex flex-col items-center gap-0.5 ${active ? 'bg-[#5A5A40] text-white shadow-lg' : 'text-[#5A5A40] hover:bg-[#5A5A40]/10'}`}
    >
      {icon}
      {label && <span className={`text-[9px] font-bold uppercase tracking-[0.15em] ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{label}</span>}
      {subLabel && <span className={`text-[8px] font-medium opacity-60 ${active ? 'opacity-80' : 'opacity-0 group-hover:opacity-60'}`}>{subLabel}</span>}
    </button>
  );
}

// --- Views ---

function ChatView() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/chat`),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
      if (msgs.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'model',
          text: `你好 hua！今天是 ${new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}。我是你的專屬 PM 教練。準備好今天來處理一些微型任務了嗎？有什麼想聊聊的嗎？`,
          createdAt: new Date().toISOString()
        }]);
      } else {
        setMessages(msgs);
      }
    });
  }, [user]);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Use a lower quality to ensure it stays under 1MB (Firestore limit)
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setSelectedImage(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || isTyping || !user) return;

    const userMsg = input;
    const userImg = selectedImage;
    setInput('');
    setSelectedImage(null);
    setIsTyping(true);

    try {
      // Save user message to Firestore
      await addDoc(collection(db, `users/${user.uid}/chat`), {
        role: 'user',
        text: userMsg,
        image: userImg || null,
        createdAt: new Date().toISOString()
      });

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY! });

      const contents = messages.map(m => ({
        role: m.role,
        parts: [
          { text: m.text },
          ...(m.image ? [{
            inlineData: {
              mimeType: m.image.split(';')[0].split(':')[1],
              data: m.image.split(',')[1],
            }
          }] : [])
        ]
      }));

      contents.push({
        role: 'user',
        parts: [
          { text: userMsg },
          ...(userImg ? [{
            inlineData: {
              mimeType: userImg.split(';')[0].split(':')[1],
              data: userImg.split(',')[1],
            }
          }] : [])
        ]
      });

      const now = new Date();
      const dateStr = now.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
      const timeStr = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

      const tools: FunctionDeclaration[] = [
        {
          name: "addGoal",
          description: "Add a new long-term goal for hua.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "The title of the goal." },
              description: { type: Type.STRING, description: "Detailed description of the goal." }
            },
            required: ["title", "description"]
          }
        },
        {
          name: "addTask",
          description: "Add a new micro-task for hua.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              goalId: { type: Type.STRING, description: "Optional ID of the goal this task belongs to." },
              title: { type: Type.STRING, description: "The title of the task." },
              priority: { type: Type.STRING, enum: ["urgent", "easy", "normal"], description: "Task priority." },
              estimatedTime: { type: Type.NUMBER, description: "Estimated time in minutes (usually 10-15)." }
            },
            required: ["title", "priority"]
          }
        },
        {
          name: "updateTaskStatus",
          description: "Update the status of an existing task.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              taskId: { type: Type.STRING, description: "The ID of the task to update." },
              status: { type: Type.STRING, enum: ["todo", "done"], description: "The new status." }
            },
            required: ["taskId", "status"]
          }
        },
        {
          name: "addMemoryItem",
          description: "Save a thought, URL, or snippet to the memory bank.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING, description: "The content to save." },
              url: { type: Type.STRING, description: "Optional URL associated with the memory." },
              category: { type: Type.STRING, enum: ["daily", "learning", "project", "other"], description: "Category of the memory." }
            },
            required: ["content", "category"]
          }
        }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents,
        config: {
          systemInstruction: `You are a personal PM and productivity coach for "hua". `,
          tools: [{ functionDeclarations: tools }]
        }
      });

      const functionCalls = response.functionCalls;
      if (functionCalls) {
        for (const call of functionCalls) {
          const { name, args } = call;
          if (name === "addGoal") {
            await addDoc(collection(db, `users/${user.uid}/goals`), {
              ...args,
              id: Math.random().toString(36).substr(2, 9),
              progress: 0,
              status: 'active',
              createdAt: new Date().toISOString()
            });
          } else if (name === "addTask") {
            await addDoc(collection(db, `users/${user.uid}/tasks`), {
              ...args,
              id: Math.random().toString(36).substr(2, 9),
              status: 'todo',
              createdAt: new Date().toISOString()
            });
          } else if (name === "updateTaskStatus") {
            const { taskId, status } = args as any;
            const q = query(collection(db, `users/${user.uid}/tasks`), where('id', '==', taskId));
            const snap = await getDocs(q);
            if (!snap.empty) {
              await updateDoc(doc(db, `users/${user.uid}/tasks`, snap.docs[0].id), {
                status,
                completedAt: status === 'done' ? new Date().toISOString() : null
              });
            }
          } else if (name === "addMemoryItem") {
            await addDoc(collection(db, `users/${user.uid}/memory`), {
              ...args,
              id: Math.random().toString(36).substr(2, 9),
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // Save model response to Firestore
      await addDoc(collection(db, `users/${user.uid}/chat`), {
        role: 'model',
        text: response.text || (functionCalls ? "我已經幫你更新好進度了！還有什麼我可以幫你的嗎？" : "Sorry, I'm a bit stuck. Let's try again!"),
        createdAt: new Date().toISOString()
      });

    } catch (err) {
      console.error(err);
      await addDoc(collection(db, `users/${user.uid}/chat`), {
        role: 'model',
        text: "Oops, something went wrong. Check your connection!",
        createdAt: new Date().toISOString()
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <header className="p-6 border-b border-[#5A5A40]/10 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#1a1a1a]">Coach Chat</h2>
          <p className="text-[#5A5A40] text-sm italic">Supporting hua's journey</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-[#5A5A40] uppercase tracking-widest">Active</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] p-5 rounded-[24px] ${m.role === 'user' ? 'bg-[#5A5A40] text-white rounded-tr-none' : 'bg-[#f5f5f0] text-[#1a1a1a] rounded-tl-none border border-[#5A5A40]/5'}`}>
              {m.image && (
                <img
                  src={m.image}
                  alt="Uploaded content"
                  className="rounded-xl mb-3 max-h-60 object-cover border border-white/20"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-li:my-1">
                <ReactMarkdown>{m.text}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#f5f5f0] p-4 rounded-full flex gap-1">
              <div className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-[#5A5A40]/10">
        <div className="max-w-4xl mx-auto space-y-4">
          {selectedImage && (
            <div className="relative inline-block">
              <img
                src={selectedImage}
                alt="Preview"
                className="h-20 w-20 object-cover rounded-xl border-2 border-[#5A5A40]"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}
          <div className="flex gap-4">
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="w-14 h-14 bg-[#f5f5f0] text-[#5A5A40] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#e4e3e0] transition-all active:scale-95 border border-[#5A5A40]/10"
              >
                <ImageIcon size={24} />
              </label>
            </div>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              placeholder="跟教練聊聊吧，hua..."
              className="flex-1 bg-[#f5f5f0] border-none rounded-full px-6 py-4 focus:ring-2 focus:ring-[#5A5A40] transition-all outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={(!input.trim() && !selectedImage) || isTyping}
              className="w-14 h-14 bg-[#5A5A40] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#4a4a35] transition-all disabled:opacity-50 active:scale-95"
            >
              <Send size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardView() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!user) return;
    const qGoals = query(collection(db, `users/${user.uid}/goals`));
    const qTasks = query(collection(db, `users/${user.uid}/tasks`));

    const unsubGoals = onSnapshot(qGoals, (snap) => {
      setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Goal)));
    });

    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    return () => { unsubGoals(); unsubTasks(); };
  }, [user]);

  const stats = [
    { name: 'Completed', value: tasks.filter(t => t.status === 'done').length },
    { name: 'Pending', value: tasks.filter(t => t.status === 'todo').length },
  ];

  const COLORS = ['#5A5A40', '#E4E3E0'];

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#f5f5f0]">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h2 className="text-5xl font-serif font-bold text-[#1a1a1a] mb-2 tracking-tight">Daily Dashboard</h2>
          <p className="text-[#5A5A40] italic font-serif text-lg">視覺化 hua 的進度與成就 — Progress & Achievements</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Progress Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-2 bg-white rounded-[32px] p-8 shadow-sm border border-[#5A5A40]/5"
          >
            <h3 className="text-xl font-serif font-bold mb-6 flex items-center gap-2">
              <LayoutDashboard size={20} className="text-[#5A5A40]" />
              Project Progress
            </h3>
            <div className="space-y-6">
              {goals.map(goal => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-[#1a1a1a]">{goal.title}</span>
                    <span className="text-[#5A5A40]">{goal.progress}%</span>
                  </div>
                  <div className="h-3 bg-[#f5f5f0] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${goal.progress}%` }}
                      className="h-full bg-[#5A5A40]"
                    />
                  </div>
                </div>
              ))}
              {goals.length === 0 && (
                <div className="text-center py-12 text-[#5A5A40] italic">
                  目前還沒有進行中的專案。跟教練聊聊來開始一個吧！
                </div>
              )}
            </div>
          </motion.div>

          {/* Task Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-[32px] p-8 shadow-sm border border-[#5A5A40]/5 flex flex-col items-center"
          >
            <h3 className="text-xl font-serif font-bold mb-6 w-full">Task Split</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-4">
              {stats.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-xs font-medium text-[#5A5A40]">{s.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Tomorrow's Focus */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#5A5A40] rounded-[32px] p-10 text-white shadow-xl"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-serif font-bold italic">明日焦點</h3>
            <div className="bg-white/20 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">前三名</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tasks.filter(t => t.status === 'todo').slice(0, 3).map((task, i) => (
              <div key={task.id} className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 flex items-start gap-4">
                <div className="w-8 h-8 bg-white text-[#5A5A40] rounded-full flex items-center justify-center font-bold shrink-0">
                  {i + 1}
                </div>
                <p className="font-medium">{task.title}</p>
              </div>
            ))}
            {tasks.filter(t => t.status === 'todo').length === 0 && (
              <p className="col-span-3 text-center py-4 italic opacity-70">All caught up! Time to relax, hua.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function TaskView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/tasks`));
    return onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });
  }, [user]);

  const addTask = async () => {
    if (!newTask.trim() || !user) return;
    try {
      const task: Omit<Task, 'id'> = {
        title: newTask,
        status: 'todo',
        priority: 'normal',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, `users/${user.uid}/tasks`), task);
      setNewTask('');
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTask = async (task: Task) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/tasks`, task.id), {
        status: task.status === 'todo' ? 'done' : 'todo',
        completedAt: task.status === 'todo' ? new Date().toISOString() : null
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/tasks`, id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full p-8 bg-white overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10">
          <h2 className="text-5xl font-serif font-bold text-[#1a1a1a] mb-2 tracking-tight">Task Triage</h2>
          <p className="text-[#5A5A40] italic font-serif text-lg">用微型步驟邁向成功 — Micro-stepping to success</p>
        </header>

        <div className="flex gap-4 mb-10">
          <input
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && addTask()}
            placeholder="新增一個 10 分鐘的小任務..."
            className="flex-1 bg-[#f5f5f0] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none"
          />
          <button
            onClick={addTask}
            className="px-8 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4a4a35] transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            新增
          </button>
        </div>

        <div className="space-y-4">
          {tasks.sort((a, b) => a.status === 'todo' ? -1 : 1).map(task => (
            <motion.div
              layout
              key={task.id}
              className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${task.status === 'done' ? 'bg-[#f5f5f0]/50 border-transparent opacity-60' : 'bg-white border-[#5A5A40]/10 shadow-sm'}`}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleTask(task)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-[#5A5A40] border-[#5A5A40]' : 'border-[#5A5A40]/30 hover:border-[#5A5A40]'}`}
                >
                  {task.status === 'done' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </button>
                <span className={`font-medium ${task.status === 'done' ? 'line-through text-[#5A5A40]' : 'text-[#1a1a1a]'}`}>
                  {task.title}
                </span>
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                className="p-2 text-[#5A5A40]/30 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemoryView() {
  const { user } = useAuth();
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/memory`));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MemoryItem)));
    });
  }, [user]);

  const addMemory = async () => {
    if (!newItem.trim() || !user) return;
    try {
      const item: Omit<MemoryItem, 'id'> = {
        content: newItem,
        category: 'other',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, `users/${user.uid}/memory`), item);
      setNewItem('');
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMemory = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/memory`, id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full p-8 bg-[#f5f5f0] overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h2 className="text-5xl font-serif font-bold text-[#1a1a1a] mb-2 tracking-tight">Memory Bank</h2>
          <p className="text-[#5A5A40] italic font-serif text-lg">儲存 hua 的靈感火花 — Sparks of inspiration</p>
        </header>

        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-[#5A5A40]/5 mb-10">
          <textarea
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            placeholder="貼上連結或輸入想法..."
            className="w-full h-32 bg-[#f5f5f0] border-none rounded-2xl p-6 focus:ring-2 focus:ring-[#5A5A40] outline-none resize-none mb-4"
          />
          <div className="flex justify-end">
            <button
              onClick={addMemory}
              className="px-8 py-3 bg-[#5A5A40] text-white rounded-full font-bold hover:bg-[#4a4a35] transition-all flex items-center gap-2"
            >
              <Database size={20} />
              存入記憶庫
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map(item => (
            <motion.div
              layout
              key={item.id}
              className="bg-white p-6 rounded-[24px] shadow-sm border border-[#5A5A40]/5 flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40] bg-[#f5f5f0] px-3 py-1 rounded-full">
                    {item.category}
                  </span>
                  <button
                    onClick={() => deleteMemory(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-[#1a1a1a] mb-4 line-clamp-4">{item.content}</p>
              </div>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#f5f5f0]">
                <span className="text-[10px] text-[#5A5A40]">{new Date(item.createdAt).toLocaleDateString()}</span>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" className="text-[#5A5A40] hover:text-[#1a1a1a]">
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryView() {
  const { user } = useAuth();
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/tasks`),
      where('status', '==', 'done')
    );
    return onSnapshot(q, (snap) => {
      setCompletedTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });
  }, [user]);

  const exportPDF = () => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text("hua's Completed Tasks Archive", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    // Prepare table data
    const tableData = completedTasks.map(task => [
      task.title,
      task.priority || 'normal',
      task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'N/A',
      task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'N/A'
    ]);

    // Generate table
    (doc as any).autoTable({
      startY: 40,
      head: [['Task Title', 'Priority', 'Created At', 'Completed At']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [90, 90, 64] }, // #5A5A40
      styles: { font: 'helvetica', fontSize: 10 }
    });

    doc.save(`hua_completed_tasks_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="h-full p-8 bg-[#f5f5f0] overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-5xl font-serif font-bold text-[#1a1a1a] mb-2 tracking-tight">Archive</h2>
            <p className="text-[#5A5A40] italic font-serif text-lg">回顧 hua 已完成的成就 — Reviewing completed achievements</p>
          </div>
          <button
            onClick={exportPDF}
            disabled={completedTasks.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-[#5A5A40] text-white rounded-full font-bold hover:bg-[#4a4a35] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={20} />
            Export PDF (匯出)
          </button>
        </header>

        <div className="bg-white rounded-[32px] shadow-sm border border-[#5A5A40]/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f5f5f0]/50 border-b border-[#5A5A40]/10">
                  <th className="px-8 py-5 font-serif font-bold text-[#1a1a1a] uppercase tracking-widest text-xs">任務名稱 Task</th>
                  <th className="px-8 py-5 font-serif font-bold text-[#1a1a1a] uppercase tracking-widest text-xs">優先級 Priority</th>
                  <th className="px-8 py-5 font-serif font-bold text-[#1a1a1a] uppercase tracking-widest text-xs">建立日期 Created</th>
                  <th className="px-8 py-5 font-serif font-bold text-[#1a1a1a] uppercase tracking-widest text-xs">完成日期 Done</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f5f0]">
                {completedTasks.length > 0 ? (
                  completedTasks.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()).map(task => (
                    <tr key={task.id} className="hover:bg-[#f5f5f0]/30 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium text-[#1a1a1a]">{task.title}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${task.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                          task.priority === 'easy' ? 'bg-blue-100 text-blue-600' :
                            'bg-[#f5f5f0] text-[#5A5A40]'
                          }`}>
                          {task.priority || 'normal'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm text-[#5A5A40]">
                        {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-8 py-5 text-sm font-medium text-[#1a1a1a]">
                        {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-[#5A5A40] italic">
                      目前還沒有已完成的任務。繼續加油，hua！
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
