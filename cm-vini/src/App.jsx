import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { 
  Home, Dumbbell, Activity, User, Bell, ChevronRight,
  Target, Award, Settings, LogOut, ChevronLeft, Droplets, Plus, Minus, ShieldCheck,
  Edit2, Save, TrendingUp, DollarSign, Calendar, FileText, ImageIcon, Camera, RotateCcw,
  MessageCircle, Send, Heart, MoreVertical, X, CheckCircle,
  Footprints, Play, Pause, Square, MapPin, Clock, Share2, Navigation
} from 'lucide-react';

const logoCorpoMovimento = '/logo_cm_semfundo.png';
const imagemStoryInstagram = '/+1.png';


const InstagramStoryIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
  </svg>
);


// --- CONFIGURAÇÃO SUPABASE REAL (VIA FETCH NATIVO) ---
export const supabaseUrl = 'https://jaujldyuelyhsqyxyerc.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphdWpsZHl1ZWx5aHNxeXh5ZXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTU5NDEsImV4cCI6MjA4NzUzMTk0MX0.YluXKJHl0rfJAiwyoN8tFfJIDfeHB_CwV-oFdaLwkvw';

let currentSession = null;
let authListeners = [];

const getHeaders = () => ({
  'apikey': supabaseAnonKey,
  'Authorization': `Bearer ${currentSession?.access_token || supabaseAnonKey}`,
  'Content-Type': 'application/json'
});

class SupabaseQuery {
  constructor(table, isInsert = false, rows = null) {
    this.table = table;
    this.url = `${supabaseUrl}/rest/v1/${table}`;
    this.isInsert = isInsert;
    this.isUpdate = false;
    this.rows = rows;
    this.method = isInsert ? 'POST' : 'GET';
    this.headers = getHeaders();
    this.isSingle = false;
    this.isCount = false;
    this.queryParams = [];
  }
  select(columns = '*', options = {}) {
    if (options.count === 'exact') {
      this.isCount = true;
      this.headers['Prefer'] = 'count=exact';
      if (options.head) this.method = 'HEAD';
    }
    if ((this.isInsert || this.isUpdate) && !this.headers['Prefer']) {
      this.headers['Prefer'] = 'return=representation';
    }
    this.queryParams.push(`select=${encodeURIComponent(columns)}`);
    return this;
  }
  eq(field, value) {
    this.queryParams.push(`${field}=eq.${encodeURIComponent(value)}`);
    return this;
  }
  single() {
    this.isSingle = true;
    this.headers['Accept'] = 'application/vnd.pgrst.object+json';
    if (this.isInsert || this.isUpdate) {
      this.headers['Prefer'] = 'return=representation';
    }
    return this;
  }
  update(rows) {
    this.isUpdate = true;
    this.method = 'PATCH';
    this.rows = rows;
    return this;
  }
  async then(resolve, reject) {
    try {
      const finalUrl = this.queryParams.length > 0
        ? `${this.url}?${this.queryParams.join('&')}`
        : this.url;

      const options = { method: this.method, headers: this.headers };
      if (this.isInsert || this.isUpdate) options.body = JSON.stringify(this.rows);

      const res = await fetch(finalUrl, options);

      if (!res.ok) {
        const errText = await res.text();
        let err = {};
        try { err = JSON.parse(errText); } catch(e) { err.message = errText; }
        if (err.code === 'PGRST116') return resolve({ data: null, error: err });
        return resolve({ data: null, error: err });
      }

      if (this.isCount && this.method === 'HEAD') {
        const range = res.headers.get('content-range');
        const count = range ? parseInt(range.split('/')[1], 10) : 0;
        return resolve({ count, error: null });
      }

      if (this.method === 'HEAD') return resolve({ data: null, error: null });

      const textRes = await res.text();
      let data = null;
      if (textRes) {
        try { data = JSON.parse(textRes); } catch(e) { data = textRes; }
      }

      if (this.isInsert && this.isSingle && Array.isArray(data)) {
        return resolve({ data: data[0], error: null });
      }
      return resolve({ data, error: null });
    } catch (error) {
      return resolve({ data: null, error });
    }
  }
}

export const supabase = {
  auth: {
    getSession: async () => {
      const stored = localStorage.getItem('sb-session');
      if (stored) {
        currentSession = JSON.parse(stored);
        return { data: { session: currentSession }, error: null };
      }
      return { data: { session: null }, error: null };
    },
    updateUser: async (attributes) => {
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify(attributes)
      });
      const data = await res.json();
      if (!res.ok) return { error: new Error(data.msg || 'Erro ao atualizar user') };
      return { data, error: null };
    },
    onAuthStateChange: (cb) => {
      authListeners.push(cb);
      return { data: { subscription: { unsubscribe: () => { authListeners = authListeners.filter(l => l !== cb); } } } };
    },
    signUp: async ({ email, password, options }) => {
      const body = { email, password };
      if (options && options.data) {
        body.data = options.data;
      }
      const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) return { error: new Error(data.error_description || data.msg || 'Erro no cadastro') };
      return { data, error: null };
    },
    signInWithPassword: async ({ email, password }) => {
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) return { error: new Error(data.error_description || data.msg || 'Credenciais inválidas') };
      currentSession = { user: data.user, access_token: data.access_token };
      localStorage.setItem('sb-session', JSON.stringify(currentSession));
      authListeners.forEach(cb => cb('SIGNED_IN', currentSession));
      return { data: { session: currentSession }, error: null };
    },
    resetPasswordForEmail: async (email) => {
      const res = await fetch(`${supabaseUrl}/auth/v1/recover`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify({ email })
      });
      if (!res.ok) {
        const data = await res.json();
        return { error: new Error(data.error_description || data.msg || 'Erro ao recuperar senha') };
      }
      return { data: {}, error: null };
    },
    signOut: async () => {
      if (currentSession) {
        await fetch(`${supabaseUrl}/auth/v1/logout`, { method: 'POST', headers: getHeaders() }).catch(()=>null);
      }
      currentSession = null;
      localStorage.removeItem('sb-session');
      authListeners.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    }
  },
  from: (table) => ({
    select: (columns = '*', options = {}) => new SupabaseQuery(table).select(columns, options),
    insert: (rows) => new SupabaseQuery(table, true, rows),
    update: (rows) => new SupabaseQuery(table).update(rows),
    delete: () => {
      const query = new SupabaseQuery(table);
      query.method = 'DELETE';
      return query;
    }
  }),
  storage: {
    from: (bucket) => ({
      upload: async (path, file) => {
        const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${currentSession?.access_token || supabaseAnonKey}`,
            'Content-Type': file.type
          },
          body: file
        });
        if (!res.ok) {
          const errText = await res.text();
          let err = {};
          try { err = JSON.parse(errText); } catch(e) { err.message = errText; }
          return { error: new Error(err.message || 'Erro no upload') };
        }
        const data = await res.json();
        return { data, error: null };
      },
      getPublicUrl: (path) => {
        return { data: { publicUrl: `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}` } };
      }
    })
  }
};

// --- CONTEXTO E DADOS ---
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);


// --- PAPÉIS E FLUXO DE TREINO COM IA/RAG ---
const getUserRole = (profile) => profile?.role || (profile?.is_admin ? 'admin' : 'aluno');
const hasAdminAccess = (profile) => getUserRole(profile) === 'admin';
const hasStaffAccess = (profile) => ['admin', 'professor'].includes(getUserRole(profile));

// A Edge Function será responsável por consultar o RAG e retornar um treino estruturado.
// O front-end nunca publica a resposta da IA automaticamente: primeiro salva como rascunho.
const gerarTreinoComRAG = async ({ aluno, onboarding, progresso, historicoTreinos = null, instrucoesProfissional }) => {
  if (!currentSession?.access_token) throw new Error('Sessão expirada. Entre novamente.');

  const res = await fetch(`${supabaseUrl}/functions/v1/gerar-treino-rag`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${currentSession.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      aluno_id: aluno.id,
      aluno: {
        nome: aluno.nome,
        data_nascimento: aluno.data_nascimento,
        altura: aluno.altura,
        peso_atual: aluno.peso_atual
      },
      onboarding: onboarding || null,
      progresso: progresso || [],
      historico_treinos: historicoTreinos || null,
      instrucoes_profissional: instrucoesProfissional || ''
    })
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || payload?.message || 'Não foi possível gerar o treino com a IA.');
  if (!payload?.treino) throw new Error('A IA não retornou um treino estruturado.');
  return payload;
};

const modalidadesData = [
  { id: 1, titulo: 'Boxe', categoria: 'Combate', fases: 10, dietas: 2, icon: ({ size, strokeWidth }) => <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 7, titulo: 'Jiu-Jitsu', categoria: 'Luta Agarrada', fases: 10, dietas: 2, icon: ({ size, strokeWidth }) => <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 2, titulo: 'Pickleball', categoria: 'Esportes de Raquete', fases: 10, dietas: 2, icon: ({ size, strokeWidth }) => <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none"><circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 2v20" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 3, titulo: 'Corrida', categoria: 'Longa / Curta', fases: 10, dietas: 2, icon: Activity },
  { id: 4, titulo: 'Natação', categoria: 'Piscina / Mar', fases: 10, dietas: 2, icon: ({ size, strokeWidth }) => <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none"><path d="M2 12c2.667 0 5.333-2 8-2s5.333 2 8 2 5.333-2 8-2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 16c2.667 0 5.333-2 8-2s5.333 2 8 2 5.333-2 8-2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 5, titulo: 'Ciclismo', categoria: 'Longa / Curta', fases: 10, dietas: 2, icon: ({ size, strokeWidth }) => <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none"><circle cx="5" cy="18" r="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="19" cy="18" r="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 18l4-8h6l4 8M15 10l-3-6H8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 6, titulo: 'Body Builders', categoria: 'HOMEM - Mens / Classic\nMULHER - Figure / Wellness', fases: 10, dietas: 2, icon: Dumbbell },
  { id: 8, titulo: 'Musculação', categoria: 'Força / Hipertrofia / Condicionamento', fases: 10, dietas: 0, icon: Dumbbell },
  { id: 9, titulo: 'Treinamento Funcional', categoria: 'Força / Mobilidade / Condicionamento', fases: 10, dietas: 0, icon: Activity }
];

// --- COMPONENTES ---

const RunnerIcon = Navigation;

const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
    .playfair { font-family: 'Playfair Display', serif; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #1A4026; border-radius: 20px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #D4AF37; }
  `}} />
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [cidadeEstado, setCidadeEstado] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage('Link de recuperação enviado para seu e-mail!');
      } else if (isSignUp) {
        if (password !== confirmPassword) throw new Error('As senhas não coincidem.');
        const { error } = await supabase.auth.signUp({ 
          email, password, options: { data: { nome, phone, cpf, data_nascimento: dataNascimento, cidade_estado: cidadeEstado } }
        });
        if (error) throw error;
        setMessage('Conta criada com sucesso! Você já pode entrar.');
        setIsSignUp(false); setPassword(''); setConfirmPassword(''); setPhone('');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error.message === 'Invalid login credentials' ? 'Credenciais inválidas.' : error.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-white relative z-10 w-full h-full pt-20">
      <GlobalStyles />
      <div className="flex flex-col items-center mb-8 sm:mb-10 w-full">
        <img
          src={logoCorpoMovimento}
          alt="Corpo em Movimento"
          className="w-[180px] sm:w-[200px] h-auto max-h-[230px] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        />
        <p className="text-[#A0B3A6] text-sm tracking-widest uppercase mt-3">
          {isForgotPassword ? 'Recuperar Senha' : isSignUp ? 'Criar Conta' : 'Login'}
        </p>
      </div>
      <form className="w-full space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar pr-2" onSubmit={handleAuth}>
        {message && <div className="bg-[#1A3020] border border-[#D4AF37]/50 text-[#D4AF37] p-3 rounded-xl text-center text-sm">{message}</div>}
        {isSignUp && (
          <div>
            <label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">Nome Completo</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João da Silva" required className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" />
          </div>
        )}
        <div>
          <label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">E-mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ex: seuemail@exemplo.com" required className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" />
        </div>
        {isSignUp && (
          <>
            <div><label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">Telefone</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ex: (11) 99999-9999" required className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" /></div>
            <div><label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">CPF</label><input type="text" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="Ex: 000.000.000-00" required className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" /></div>
            <div><label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">Data de Nascimento</label><input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} required className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" style={{ colorScheme: 'dark' }}/></div>
            <div><label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">Cidade e Estado</label><input type="text" value={cidadeEstado} onChange={e => setCidadeEstado(e.target.value)} placeholder="Ex: São Paulo, SP" required className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" /></div>
          </>
        )}
        {!isForgotPassword && (
          <div><label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">Senha</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Digite sua senha" required className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" /></div>
        )}
        {isSignUp && (
          <div><label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">Confirmação de Senha</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirme sua senha" required className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" /></div>
        )}
        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] font-bold text-lg py-3 rounded-xl mt-6 active:scale-95 transition-transform disabled:opacity-50 shrink-0">
          {loading ? 'Aguarde...' : isForgotPassword ? 'Enviar Link' : isSignUp ? 'Criar Conta' : 'Entrar'}
        </button>
        <div className="flex flex-col items-center gap-3 mt-4 text-sm text-[#A0B3A6] shrink-0 pb-4">
          {!isForgotPassword && <button type="button" onClick={() => setIsForgotPassword(true)} className="hover:text-[#D4AF37] transition-colors">Esqueceu a senha?</button>}
          <button type="button" onClick={() => { setIsSignUp(!isSignUp); setIsForgotPassword(false); setMessage(''); }} className="hover:text-[#D4AF37] transition-colors">
            {isSignUp || isForgotPassword ? 'Já tenho uma conta. Fazer login' : 'Não tem conta? Criar uma'}
          </button>
        </div>
      </form>
    </div>
  );
};

const Onboarding = ({ profile, onComplete }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 12;
  const [formData, setFormData] = useState({
    nome: profile?.nome || '',
    genero: '',
    objetivo: '',
    altura: '',
    peso: '',
    meta: '',
    nivel: '',
    desafios: [],
    estrutura: '',
    dias: [],
    modalidade: '',
    termos: false
  });

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));
  const handleFinish = () => onComplete(formData);
  const toggleArray = (arr, item) => arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  return (
    <div className="absolute inset-0 bg-[#051109] z-50 flex flex-col text-white">
      <div className="flex items-center justify-between p-6 pb-2 border-b border-[#1A4026]">
        <div className="w-6 h-6" aria-hidden="true" />
        <div className="text-sm font-medium text-[#D4AF37]">{step} de {totalSteps}</div>
      </div>
      <div className="h-1 bg-[#1A3020] w-full">
         <div className="h-full bg-[#D4AF37] transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col custom-scrollbar">
        {step === 1 && (
          <div className="space-y-4 my-auto animate-in fade-in slide-in-from-right-4">
             <h2 className="text-2xl font-bold mb-6 text-center">Como vamos te chamar?</h2>
             <input type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} placeholder="Seu nome" className="w-full bg-[#0A1A10] border border-[#1A4026] text-white p-4 rounded-xl focus:border-[#D4AF37] outline-none text-center text-lg" autoFocus/>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4 my-auto animate-in fade-in slide-in-from-right-4">
             <h2 className="text-2xl font-bold mb-6 text-center">Qual seu gênero?</h2>
             {['Feminino', 'Masculino', 'Prefiro não dizer'].map(op => (
               <button key={op} onClick={() => { setFormData({...formData, genero: op}); nextStep(); }} className={`w-full p-4 rounded-xl border text-lg font-medium transition-colors ${formData.genero === op ? 'bg-[#1A3020] border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0A1A10] border-[#1A4026] text-white hover:border-[#D4AF37]/50'}`}>
                 {op}
               </button>
             ))}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4 my-auto animate-in fade-in slide-in-from-right-4">
             <h2 className="text-2xl font-bold mb-6 text-center">Seu principal objetivo?</h2>
             {['Perder peso', 'Manter peso', 'Ganhar peso', 'Ganhar massa muscular', 'Ter estilo de vida mais ativo', 'Melhorar desempenho na corrida'].map(op => (
               <button key={op} onClick={() => { setFormData({...formData, objetivo: op}); nextStep(); }} className={`w-full p-4 rounded-xl border text-sm font-medium transition-colors ${formData.objetivo === op ? 'bg-[#1A3020] border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0A1A10] border-[#1A4026] text-white hover:border-[#D4AF37]/50'}`}>
                 {op}
               </button>
             ))}
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4 my-auto animate-in fade-in slide-in-from-right-4">
             <h2 className="text-2xl font-bold mb-6 text-center">Qual sua altura? (cm)</h2>
             <input type="number" value={formData.altura} onChange={e => setFormData({...formData, altura: e.target.value})} placeholder="Ex: 170" className="w-full bg-[#0A1A10] border border-[#1A4026] text-white p-4 rounded-xl focus:border-[#D4AF37] outline-none text-center text-xl" autoFocus/>
          </div>
        )}
        {step === 5 && (
          <div className="space-y-4 my-auto animate-in fade-in slide-in-from-right-4">
             <h2 className="text-2xl font-bold mb-6 text-center">Quanto você pesa? (kg)</h2>
             <input type="number" value={formData.peso} onChange={e => setFormData({...formData, peso: e.target.value})} placeholder="Ex: 75.5" className="w-full bg-[#0A1A10] border border-[#1A4026] text-white p-4 rounded-xl focus:border-[#D4AF37] outline-none text-center text-xl" autoFocus/>
          </div>
        )}
        {step === 6 && (
          <div className="space-y-4 my-auto animate-in fade-in slide-in-from-right-4">
             <h2 className="text-2xl font-bold mb-6 text-center">Qual sua meta de peso? (kg)</h2>
             <input type="number" value={formData.meta} onChange={e => setFormData({...formData, meta: e.target.value})} placeholder="Ex: 68.0" className="w-full bg-[#0A1A10] border border-[#1A4026] text-white p-4 rounded-xl focus:border-[#D4AF37] outline-none text-center text-xl" autoFocus/>
          </div>
        )}
        {step === 7 && (
          <div className="space-y-4 my-auto animate-in fade-in slide-in-from-right-4">
             <h2 className="text-2xl font-bold mb-6 text-center">Qual seu nível de atividade atual?</h2>
             {['Não muito ativo', 'Levemente ativo', 'Ativo', 'Bastante ativo'].map(op => (
               <button key={op} onClick={() => { setFormData({...formData, nivel: op}); nextStep(); }} className={`w-full p-4 rounded-xl border text-base font-medium transition-colors ${formData.nivel === op ? 'bg-[#1A3020] border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0A1A10] border-[#1A4026] text-white hover:border-[#D4AF37]/50'}`}>
                 {op}
               </button>
             ))}
          </div>
        )}
        {step === 8 && (
          <div className="space-y-4 my-auto animate-in fade-in slide-in-from-right-4">
             <h2 className="text-2xl font-bold mb-6 text-center">Quais desafios te impediram de atingir seus objetivos?</h2>
             <p className="text-center text-[#A0B3A6] text-xs -mt-4 mb-4">Selecione todos que se aplicam</p>
             {['Falta de tempo', 'Dificuldade em seguir o treino', 'Dificuldade em seguir a dieta', 'Falta de progresso', 'Custo da alimentação saudável', 'Falta de organização com tempo', 'Falta de organização de dieta'].map(op => {
               const isSel = formData.desafios.includes(op);
               return (
                 <button key={op} onClick={() => setFormData({...formData, desafios: toggleArray(formData.desafios, op)})} className={`w-full p-3 rounded-xl border text-sm font-medium transition-colors ${isSel ? 'bg-[#1A3020] border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0A1A10] border-[#1A4026] text-white hover:border-[#D4AF37]/50'}`}>
                   {op}
                 </button>
               )
             })}
          </div>
        )}
        {step === 9 && (
          <div className="space-y-4 my-auto animate-in fade-in slide-in-from-right-4">
             <h2 className="text-2xl font-bold mb-6 text-center">Qual estrutura você tem disponível?</h2>
             {['Academia', 'Exercícios livres', 'Academia c/ poucos aparelhos'].map(op => (
               <button key={op} onClick={() => { setFormData({...formData, estrutura: op}); nextStep(); }} className={`w-full p-4 rounded-xl border text-base font-medium transition-colors ${formData.estrutura === op ? 'bg-[#1A3020] border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0A1A10] border-[#1A4026] text-white hover:border-[#D4AF37]/50'}`}>
                 {op}
               </button>
             ))}
          </div>
        )}
        {step === 10 && (
          <div className="space-y-4 my-auto animate-in fade-in slide-in-from-right-4">
             <h2 className="text-2xl font-bold mb-6 text-center">Disponibilidade para treinar?</h2>
             <p className="text-center text-[#A0B3A6] text-xs -mt-4 mb-4">Selecione os dias da semana</p>
             <div className="grid grid-cols-2 gap-3">
               {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(op => {
                 const isSel = formData.dias.includes(op);
                 return (
                   <button key={op} onClick={() => setFormData({...formData, dias: toggleArray(formData.dias, op)})} className={`p-3 rounded-xl border text-sm font-medium transition-colors ${isSel ? 'bg-[#1A3020] border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0A1A10] border-[#1A4026] text-white hover:border-[#D4AF37]/50'}`}>
                     {op}
                   </button>
                 )
               })}
             </div>
          </div>
        )}
        {step === 11 && (
          <div className="space-y-4 my-auto animate-in fade-in slide-in-from-right-4">
             <h2 className="text-2xl font-bold mb-2 text-center">Qual sua modalidade principal?</h2>
             <p className="text-center text-[#A0B3A6] text-xs mb-5">Essa informação ajuda a IA a contextualizar seu plano de treino.</p>
             {modalidadesData.map(modalidade => (
               <button
                 key={modalidade.id}
                 onClick={() => { setFormData({...formData, modalidade: modalidade.titulo}); nextStep(); }}
                 className={`w-full p-4 rounded-xl border text-left transition-colors ${formData.modalidade === modalidade.titulo ? 'bg-[#1A3020] border-[#D4AF37] text-[#D4AF37]' : 'bg-[#0A1A10] border-[#1A4026] text-white hover:border-[#D4AF37]/50'}`}
               >
                 <span className="font-medium block">{modalidade.titulo}</span>
                 <span className="text-[10px] text-[#A0B3A6] mt-1 block whitespace-pre-line">{modalidade.categoria}</span>
               </button>
             ))}
          </div>
        )}
        {step === 12 && (
          <div className="space-y-4 my-auto animate-in fade-in slide-in-from-right-4">
             <div className="bg-[#0A1A10] border border-[#1A4026] p-6 rounded-2xl">
               <ShieldCheck size={40} className="text-[#D4AF37] mb-4 mx-auto" />
               <h2 className="text-xl font-bold mb-4 text-center">Termos e Condições (LGPD)</h2>
               <p className="text-[#A0B3A6] text-xs text-justify mb-6">
                 Para oferecermos uma experiência personalizada, precisamos coletar e armazenar seus dados físicos, objetivos e preferências. 
                 Suas informações estão seguras conosco e não serão compartilhadas com terceiros sem seu consentimento explícito.
               </p>
               <label className="flex items-start gap-3 cursor-pointer group select-none">
                 <input
                   type="checkbox"
                   className="sr-only"
                   checked={formData.termos}
                   onChange={(e) => setFormData({ ...formData, termos: e.target.checked })}
                 />
                 <div
                   aria-hidden="true"
                   className={`w-6 h-6 rounded flex items-center justify-center border mt-0.5 flex-shrink-0 transition-colors ${formData.termos ? 'bg-[#D4AF37] border-[#D4AF37]' : 'bg-[#051109] border-[#1A4026] group-hover:border-[#D4AF37]'}`}
                 >
                   {formData.termos && <CheckCircle size={16} className="text-[#051109]" />}
                 </div>
                 <span className="text-sm font-medium">Eu li e aceito os Termos e Condições e concordo com o processamento dos dados.</span>
               </label>
             </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-[#1A4026] flex gap-4">
         {step > 1 && (
           <button onClick={prevStep} className="w-14 h-14 rounded-xl border border-[#1A4026] flex items-center justify-center text-white active:scale-95 transition-transform shrink-0">
             <ChevronLeft size={24} />
           </button>
         )}
         {(step === 1 || step === 4 || step === 5 || step === 6 || step === 8 || step === 10 || step === 12) && (
           <button 
             onClick={step === totalSteps ? handleFinish : nextStep} 
             disabled={
               (step === 1 && !formData.nome) || 
               (step === 4 && !formData.altura) || 
               (step === 5 && !formData.peso) || 
               (step === 6 && !formData.meta) || 
               (step === 8 && formData.desafios.length === 0) || 
               (step === 10 && formData.dias.length === 0) || 
               (step === 12 && !formData.termos)
             }
             className="flex-1 bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] font-bold text-lg py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
           >
             {step === totalSteps ? 'Concluir Cadastro' : 'Continuar'}
           </button>
         )}
      </div>
    </div>
  );
};

const OnboardingTransition = ({ nome, onDone }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => { setLoading(false); }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center bg-[#051109] text-white absolute inset-0 z-50">
      {loading ? (
        <div className="flex flex-col items-center animate-in fade-in duration-500">
           <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-6"></div>
           <h2 className="text-xl font-medium text-center px-6">Estamos procurando uma jornada ideal para você...</h2>
        </div>
      ) : (
        <div className="flex flex-col items-center animate-in zoom-in duration-500 w-full px-8">
           <div className="w-20 h-20 bg-[#1A3020] border-2 border-[#D4AF37] rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(212,175,55,0.4)]">
              <CheckCircle size={40} className="text-[#D4AF37]" />
           </div>
           <h2 className="text-2xl font-bold text-center mb-10">{nome || 'Aluno'}, encontramos seu treino ideal!</h2>
           <button onClick={onDone} className="w-full bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] font-bold py-4 rounded-full text-lg active:scale-95 transition-transform">
             Acessar meu treino
           </button>
        </div>
      )}
    </div>
  );
};

const Inicio = () => {
  const { profile, setActiveTab, diarioData, proteinGoal, proteinConsumed } = useApp();
  const [onbData, setOnbData] = useState(null);
  const [planoAtual, setPlanoAtual] = useState(null);
  const [stats, setStats] = useState({ treinosSemana: 0, treinosTotal: 0 });

  useEffect(() => {
    const loadInfo = async () => {
      const { data: onboarding } = await supabase.from('onboarding_respostas').select('*').eq('user_id', profile.id).single();
      if (onboarding) setOnbData(onboarding);

      const { data: planos } = await supabase.from('planos_treino').select('*').eq('user_id', profile.id).eq('status', 'publicado');
      const listaPlanos = Array.isArray(planos) ? planos : (planos ? [planos] : []);
      listaPlanos.sort((a, b) => new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0));
      setPlanoAtual(listaPlanos[0] || null);

      const { data: execucoes } = await supabase.from('execucoes_treino').select('*').eq('user_id', profile.id).eq('status', 'concluido');
      const listaExecucoes = Array.isArray(execucoes) ? execucoes : [];
      const agora = new Date();
      const inicioSemana = new Date(agora);
      const deslocamento = (agora.getDay() + 6) % 7;
      inicioSemana.setDate(agora.getDate() - deslocamento);
      inicioSemana.setHours(0, 0, 0, 0);
      const treinosSemana = listaExecucoes.filter(item => {
        const dataExecucao = new Date(item.concluido_em || item.created_at || 0);
        return dataExecucao >= inicioSemana;
      }).length;
      setStats({ treinosSemana, treinosTotal: listaExecucoes.length });
    };
    if (profile?.id) loadInfo();
  }, [profile?.id]);

  const treinoAtual = planoAtual?.treino_json || null;
  const diasPlano = Array.isArray(treinoAtual?.dias) ? treinoAtual.dias : [];
  const metaSemanal = Number(treinoAtual?.frequencia_semanal) || (Array.isArray(onbData?.disponibilidade) ? onbData.disponibilidade.length : 0);

  const proteinaRestante = Math.max(0, proteinGoal - proteinConsumed);
  const proteinPercentage = proteinGoal > 0 ? Math.min((proteinConsumed / proteinGoal) * 100, 100) : 0;
  const strokeDashoffsetValue = 339 - (339 * (proteinPercentage / 100));

  const percMovimento = metaSemanal > 0 ? Math.min(Math.round((stats.treinosSemana / metaSemanal) * 100), 100) : 0;
  const percNutricao = Number(diarioData.nutricao) || 0;
  const percRecuperacao = diarioData.horasSono ? Math.round(Math.min((Number(diarioData.horasSono) / 8) * 100, 100)) : 0;
  const percMentalidade = Number(diarioData.mentalidade) || 0;

  return (
    <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pb-24 text-white pt-2 px-1">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-3xl font-bold text-white">Hoje</h2>
      </div>

      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-1/2 left-[15%] w-32 h-32 bg-gradient-to-tr from-green-400/30 to-[#D4AF37]/30 rounded-full blur-2xl -translate-y-1/2 pointer-events-none"></div>
        <h3 className="text-[#D4AF37] font-medium text-base mb-0.5">Índice Corpo em Movimento</h3>
        <p className="text-[#A0B3A6] text-xs mb-4 sm:mb-6">Resumo do seu acompanhamento</p>
        <div className="flex items-center justify-between">
          <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
             <div className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] pointer-events-none" style={{ mixBlendMode: 'screen' }}></div>
             <svg className="absolute inset-0 w-full h-full transform -rotate-90">
               <circle cx="64" cy="64" r="54" stroke="#1A3020" strokeWidth="8" fill="none" />
               <circle cx="64" cy="64" r="54" stroke="url(#glowGradient)" strokeWidth="8" fill="none" strokeDasharray="339" strokeDashoffset={strokeDashoffsetValue} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }} />
               <defs><linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#D4AF37" /><stop offset="100%" stopColor="#4ADE80" /></linearGradient></defs>
             </svg>
             <div className="text-center z-10">
               <span className="text-3xl font-bold text-white">{proteinaRestante}</span>
               <span className="block text-xs text-[#A0B3A6] mt-1">g proteína restantes</span>
             </div>
          </div>
          <div className="flex flex-col justify-between flex-1 ml-2 sm:ml-4 py-1 h-32 overflow-hidden">
             <div className="flex justify-between items-center w-full gap-2"><div className="flex items-center gap-1.5 text-[#A0B3A6]"><Activity size={16}/><span className="text-xs">Movimento</span></div><span className="font-bold text-sm">{percMovimento}%</span></div>
             <div className="flex justify-between items-center w-full gap-2"><div className="flex items-center gap-1.5 text-[#A0B3A6]"><span className="text-base">🍽️</span><span className="text-xs">Nutrição</span></div><span className="font-bold text-sm">{percNutricao}%</span></div>
             <div className="flex justify-between items-center w-full gap-2"><div className="flex items-center gap-1.5 text-[#A0B3A6]"><Heart size={16}/><span className="text-xs">Recuperação</span></div><span className="font-bold text-sm">{percRecuperacao}%</span></div>
             <div className="flex justify-between items-center w-full gap-2"><div className="flex items-center gap-1.5 text-[#A0B3A6]"><Target size={16}/><span className="text-xs">Mentalidade</span></div><span className="font-bold text-sm">{percMentalidade}%</span></div>
          </div>
        </div>
      </div>

      <div className="pt-1">
        <h3 className="text-[#D4AF37] text-sm font-medium mb-0.5">Seu plano atual</h3>
        <h2 className="text-xl font-bold text-white mb-4">Treino da academia</h2>
        {planoAtual ? (
          <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#D4AF37]">Revisado e publicado</p>
                <h4 className="font-bold text-lg mt-1">{treinoAtual?.nome_plano || 'Treino Personalizado'}</h4>
                <p className="text-[#A0B3A6] text-xs mt-1">{treinoAtual?.objetivo || planoAtual.objetivo || 'Plano individualizado'}</p>
                {onbData?.modalidade && <p className="text-[10px] text-[#A0B3A6] mt-2">Modalidade: {onbData.modalidade}</p>}
              </div>
              <Dumbbell size={28} className="text-[#D4AF37] shrink-0" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-[#051109] border border-[#1A4026] rounded-xl p-3 text-center"><span className="text-xl font-bold">{stats.treinosSemana}</span><span className="block text-[10px] text-[#A0B3A6]">concluídos nesta semana</span></div>
              <div className="bg-[#051109] border border-[#1A4026] rounded-xl p-3 text-center"><span className="text-xl font-bold">{metaSemanal || diasPlano.length || '-'}</span><span className="block text-[10px] text-[#A0B3A6]">meta semanal</span></div>
            </div>
            <button onClick={() => setActiveTab('treino')} className="w-full mt-4 bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] font-bold py-3 rounded-xl active:scale-95 transition-transform">Abrir Meu Treino</button>
          </div>
        ) : (
          <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-6 text-center">
            <Dumbbell size={34} className="text-[#D4AF37] mx-auto mb-3" />
            <h4 className="font-medium">Seu treino está sendo preparado</h4>
            <p className="text-[#A0B3A6] text-xs mt-2 leading-relaxed">Assim que a equipe revisar e publicar seu plano, ele aparecerá aqui e em Meu Treino.</p>
            <button onClick={() => setActiveTab('treino')} className="mt-4 text-[#D4AF37] text-xs font-medium">Ver Meu Treino</button>
          </div>
        )}
      </div>
    </div>
  );
};

const Feed = () => {
  const { profile } = useApp();
  const [feedTab, setFeedTab] = useState('populares');
  const [isPosting, setIsPosting] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState(null);
  const [activeComment, setActiveComment] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    if (profile?.id) loadPosts();
  }, [profile, feedTab]);

  const loadPosts = async () => {
    setLoading(true);
    const { data: postsData } = await supabase.from('feed_posts').select('*');
    const { data: profilesData } = await supabase.from('profiles_public').select('id,nome,foto_url');
    const { data: likesData } = await supabase.from('feed_likes').select('*');
    const { data: commentsData } = await supabase.from('feed_comments').select('*');

    if (postsData) {
      let mergedPosts = postsData.map(p => {
        const prof = (profilesData || []).find(pr => pr.id === p.user_id);
        const postLikes = (likesData || []).filter(l => l.post_id === p.id);
        const postComments = (commentsData || []).filter(c => c.post_id === p.id).map(c => {
           const cProf = (profilesData || []).find(pr => pr.id === c.user_id);
           return { ...c, user_nome: cProf?.nome || 'Usuário', user_avatar: cProf?.foto_url };
        });
        const isLiked = postLikes.some(l => l.user_id === profile.id);
        
        return {
          ...p,
          user: prof?.nome || 'Usuário',
          avatar: prof?.foto_url || null,
          likes: postLikes.length,
          commentsList: postComments.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)),
          comments: postComments.length,
          isLiked
        };
      });

      if (feedTab === 'minhas postagens') {
         mergedPosts = mergedPosts.filter(p => p.user_id === profile.id);
      }

      mergedPosts.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      setPosts(mergedPosts);
    }
    setLoading(false);
  };

  const handlePost = async () => {
    if (!newPostText.trim() && !newPostImage) return;
    
    let imageUrl = null;
    if (newPostImage) {
      const fileExt = newPostImage.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('feed_images').upload(fileName, newPostImage);
      if (!uploadError) {
         const { data } = supabase.storage.from('feed_images').getPublicUrl(fileName);
         imageUrl = data.publicUrl;
      }
    }

    await supabase.from('feed_posts').insert([{
      user_id: profile.id,
      content: newPostText,
      image_url: imageUrl,
      tag: feedTab === 'populares' ? 'Geral' : feedTab
    }]);

    setNewPostText('');
    setNewPostImage(null);
    setIsPosting(false);
    loadPosts();
  };

  const handleLike = async (id, isLiked) => {
    if (isLiked) {
       await fetch(`${supabaseUrl}/rest/v1/feed_likes?post_id=eq.${id}&user_id=eq.${profile.id}`, {
         method: 'DELETE',
         headers: {
           'apikey': supabaseAnonKey,
           'Authorization': `Bearer ${currentSession?.access_token || supabaseAnonKey}`
         }
       });
    } else {
       await supabase.from('feed_likes').insert([{ post_id: id, user_id: profile.id }]);
    }
    loadPosts();
  };

  const handleAddComment = async (id) => {
    if (!commentText.trim()) return;
    await supabase.from('feed_comments').insert([{
       post_id: id,
       user_id: profile.id,
       content: commentText
    }]);
    setCommentText('');
    loadPosts();
  };

  const handleShare = (post) => {
    setNewPostText(`Compartilhado de ${post.user}:\n\n"${post.content}"`);
    setNewPostImage(null);
    setIsPosting(true);
  };

  const handleDeletePost = async (id) => {
    await supabase.from('feed_posts').delete().eq('id', id);
    setOpenMenuId(null);
    loadPosts();
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Agora';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div className="flex-1 flex flex-col relative text-white h-full -mx-6 px-6">
      <div className="sticky top-0 z-20 bg-[#051109] pt-4 pb-2 border-b border-[#1A4026]">
        <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2">
          {['populares', 'minhas postagens', 'seguindo'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFeedTab(tab)}
              className={`pb-1 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                feedTab === tab 
                  ? 'border-[#D4AF37] text-[#D4AF37]' 
                  : 'border-transparent text-[#A0B3A6] hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-6 pb-32">
        {loading ? (
          <div className="text-center text-[#A0B3A6] py-10">Carregando feed...</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-[#A0B3A6] py-10">Nenhuma postagem encontrada. Seja o primeiro a postar!</div>
        ) : posts.map((post) => (
           <div key={post.id} className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
             <div className="flex justify-between items-start mb-3">
               <div className="flex gap-3 items-center">
                 <div className="w-10 h-10 rounded-full overflow-hidden border border-[#D4AF37]/30 flex-shrink-0 bg-[#1A3020]">
                   {post.avatar ? (
                     <img src={post.avatar} alt={post.user} className="w-full h-full object-cover" />
                   ) : (
                     <User size={20} className="m-auto mt-2 text-[#D4AF37]" />
                   )}
                 </div>
                 <div>
                   <h4 className="font-bold text-white leading-tight">{post.user}</h4>
                   <span className="text-[10px] text-[#A0B3A6]">{formatTime(post.created_at)} • {post.tag}</span>
                 </div>
               </div>
               <div className="relative">
                 <button onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)} className="text-[#A0B3A6] hover:text-[#D4AF37] p-1">
                   <MoreVertical size={18} />
                 </button>
                 {openMenuId === post.id && post.user_id === profile.id && (
                   <div className="absolute right-0 mt-1 w-24 bg-[#051109] border border-[#1A4026] rounded-xl shadow-lg z-10 overflow-hidden">
                     <button onClick={() => handleDeletePost(post.id)} className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-[#1A3020] transition-colors">Excluir</button>
                   </div>
                 )}
               </div>
             </div>

             <p className="text-sm leading-relaxed mb-3 whitespace-pre-line text-gray-200">{post.content}</p>
             
             {post.image_url && (
               <div className="mb-3 rounded-xl overflow-hidden border border-[#1A4026] bg-[#051109]">
                 <img src={post.image_url} alt="Publicação" className="w-full max-h-80 object-cover" />
               </div>
             )}

             <div className="flex items-center gap-6 pt-3 border-t border-[#1A4026]/50 text-[#A0B3A6]">
               <button onClick={() => handleLike(post.id, post.isLiked)} className={`flex items-center gap-1.5 transition-colors ${post.isLiked ? 'text-[#D4AF37]' : 'hover:text-[#A0B3A6]'}`}>
                 <Heart size={18} fill={post.isLiked ? '#D4AF37' : 'none'} className={post.isLiked ? 'text-[#D4AF37]' : ''} />
                 <span className="text-xs font-medium">{post.likes}</span>
               </button>
               <button onClick={() => setActiveComment(activeComment === post.id ? null : post.id)} className="flex items-center gap-1.5 hover:text-[#D4AF37] transition-colors">
                 <MessageCircle size={18} />
                 <span className="text-xs font-medium">{post.comments}</span>
               </button>
               <button onClick={() => handleShare(post)} className="flex items-center gap-1.5 hover:text-[#D4AF37] transition-colors ml-auto">
                 <Send size={18} />
               </button>
             </div>

             {activeComment === post.id && (
               <div className="pt-4 flex flex-col gap-3 animate-in slide-in-from-top-2">
                 <div className="max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1">
                   {post.commentsList?.map(c => (
                     <div key={c.id} className="flex gap-2 items-start">
                       <div className="w-8 h-8 rounded-full bg-[#1A3020] flex-shrink-0 overflow-hidden border border-[#D4AF37]/20">
                         {c.user_avatar ? <img src={c.user_avatar} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-1.5 text-[#D4AF37]" />}
                       </div>
                       <div className="flex-1 relative pt-0.5">
                         <span className="text-[#D4AF37] text-[11px] font-bold mr-2">{c.user_nome}</span>
                         <span className="text-gray-300 text-xs break-words">{c.content}</span>
                       </div>
                     </div>
                   ))}
                   {post.commentsList?.length === 0 && <p className="text-[#A0B3A6] text-xs text-center pb-2">Nenhum comentário ainda. Seja o primeiro!</p>}
                 </div>
                 
                 <div className="flex gap-2 items-center mt-2">
                   <div className="w-8 h-8 rounded-full bg-[#1A3020] flex-shrink-0 overflow-hidden border border-[#D4AF37]/20 hidden sm:block">
                     {profile?.foto_url ? <img src={profile.foto_url} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-1.5 text-[#D4AF37]" />}
                   </div>
                   <input
                     type="text"
                     value={commentText}
                     onChange={(e) => setCommentText(e.target.value)}
                     placeholder="Escreva um comentário..."
                     className="flex-1 bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-full text-xs outline-none focus:border-[#D4AF37]"
                     autoFocus
                     onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                   />
                   <button
                     onClick={() => handleAddComment(post.id)}
                     disabled={!commentText.trim()}
                     className="bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50 active:scale-95 flex-shrink-0"
                   >
                     <Send size={14} className="ml-0.5" />
                   </button>
                 </div>
               </div>
             )}
           </div>
         ))}
       </div>

       <button 
         onClick={() => setIsPosting(true)}
         className="absolute bottom-20 right-6 w-14 h-14 bg-gradient-to-r from-[#CFB375] to-[#AC915B] rounded-full flex items-center justify-center text-[#051109] shadow-[0_0_20px_rgba(212,175,55,0.4)] active:scale-95 transition-transform z-30"
       >
         <Edit2 size={24} />
       </button>

       {isPosting && (
         <div className="absolute inset-0 z-50 bg-[#051109]/95 backdrop-blur-sm flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
           <div className="flex items-center justify-between mb-6 pt-4">
             <h3 className="text-xl font-bold text-[#D4AF37] playfair italic">Nova Postagem</h3>
             <button onClick={() => { setIsPosting(false); setNewPostImage(null); setNewPostText(''); }} className="text-[#A0B3A6] hover:text-white p-2 bg-[#1A3020] rounded-full">
               <X size={18} />
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
             <textarea
               value={newPostText}
               onChange={(e) => setNewPostText(e.target.value)}
               placeholder="Compartilhe suas conquistas, dúvidas ou pensamentos..."
               className="w-full h-48 bg-[#0A1A10] border border-[#1A4026] text-white p-4 rounded-xl focus:outline-none focus:border-[#D4AF37] resize-none text-sm custom-scrollbar"
               autoFocus
             />
             
             <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#1A4026] bg-[#0A1A10] p-6 rounded-xl text-[#A0B3A6] cursor-pointer hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors">
               <ImageIcon size={28} />
               <span className="text-sm font-medium text-center">
                 {newPostImage ? newPostImage.name : 'Clique aqui para adicionar uma foto'}
               </span>
               <input type="file" accept="image/*" className="hidden" onChange={(e) => setNewPostImage(e.target.files[0])} />
             </label>
           </div>

           <button
             onClick={handlePost}
             disabled={!newPostText.trim() && !newPostImage}
             className="w-full bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] font-bold text-lg py-3 rounded-xl mt-4 mb-16 active:scale-95 transition-transform disabled:opacity-50"
           >
             Publicar no Feed
           </button>
         </div>
       )}
    </div>
  );
};


const getLocalDateKey = () => {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const getSessaoKey = (dia, index = 0) => String(dia?.id || dia?.titulo || `treino-${index + 1}`);
const getExercicioKey = (exercicio, index = 0) => String(exercicio?.id || `exercicio-${index + 1}`);

const getQuantidadeSeries = (valor) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return 1;
  return Math.max(1, Math.min(12, Math.round(numero)));
};

const formatarDataExecucao = (valor) => {
  if (!valor) return '';
  const data = new Date(`${String(valor).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleDateString('pt-BR');
};

const ExecucaoTreino = ({ plano, dia, diaIndex, profile, onClose, onConcluido }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [execucao, setExecucao] = useState(null);
  const [exerciciosExec, setExerciciosExec] = useState([]);
  const [seriesExec, setSeriesExec] = useState([]);
  const [historicoAnterior, setHistoricoAnterior] = useState({});
  const [percepcaoEsforco, setPercepcaoEsforco] = useState('');
  const [observacoesAluno, setObservacoesAluno] = useState('');

  const sessaoKey = getSessaoKey(dia, diaIndex);
  const hoje = getLocalDateKey();

  const carregarHistoricoAnterior = async (execucaoAtualId, exercicios) => {
    const mapa = {};
    for (const exercicio of exercicios) {
      const { data } = await supabase.from('execucoes_series')
        .select('*')
        .eq('user_id', profile.id)
        .eq('exercicio_key', exercicio.exercicio_key)
        .eq('concluida', true);

      const anteriores = (data || [])
        .filter(item => item.execucao_treino_id !== execucaoAtualId)
        .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));

      anteriores.forEach(item => {
        const chave = `${exercicio.exercicio_key}-${item.numero_serie}`;
        if (!mapa[chave]) mapa[chave] = item;
      });
    }
    setHistoricoAnterior(mapa);
  };

  const carregarDetalhesExecucao = async (execucaoAtual) => {
    const { data: exercicios, error: exerciciosError } = await supabase.from('execucoes_exercicios')
      .select('*')
      .eq('execucao_treino_id', execucaoAtual.id);
    if (exerciciosError) throw exerciciosError;

    const listaExercicios = (exercicios || []).sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));

    const { data: series, error: seriesError } = await supabase.from('execucoes_series')
      .select('*')
      .eq('execucao_treino_id', execucaoAtual.id);
    if (seriesError) throw seriesError;

    const listaSeries = (series || []).sort((a, b) => {
      if (a.execucao_exercicio_id === b.execucao_exercicio_id) return Number(a.numero_serie) - Number(b.numero_serie);
      return String(a.execucao_exercicio_id).localeCompare(String(b.execucao_exercicio_id));
    });

    setExerciciosExec(listaExercicios);
    setSeriesExec(listaSeries);
    setPercepcaoEsforco(execucaoAtual.percepcao_esforco ? String(execucaoAtual.percepcao_esforco) : '');
    setObservacoesAluno(execucaoAtual.observacoes_aluno || '');
    await carregarHistoricoAnterior(execucaoAtual.id, listaExercicios);
    return { exercicios: listaExercicios, series: listaSeries };
  };

  const criarEstruturaExecucao = async (execucaoAtual) => {
    const exerciciosPlano = Array.isArray(dia?.exercicios) ? dia.exercicios : [];
    if (exerciciosPlano.length === 0) return;

    const linhasExercicios = exerciciosPlano.map((ex, index) => ({
      execucao_treino_id: execucaoAtual.id,
      plano_treino_id: plano.id,
      user_id: profile.id,
      sessao_key: sessaoKey,
      exercicio_key: getExercicioKey(ex, index),
      nome_exercicio: ex.nome || `Exercício ${index + 1}`,
      ordem: index + 1,
      series_planejadas: getQuantidadeSeries(ex.series),
      repeticoes_planejadas: ex.repeticoes != null ? String(ex.repeticoes) : null,
      carga_orientacao: ex.carga_orientacao || null,
      descanso_seg: ex.descanso_seg ? Number(ex.descanso_seg) : null,
      observacoes_planejamento: ex.observacoes || null
    }));

    const { data: criados, error: exerciciosError } = await supabase.from('execucoes_exercicios')
      .insert(linhasExercicios)
      .select();
    if (exerciciosError) throw exerciciosError;

    const exerciciosCriados = (criados || []).sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
    const linhasSeries = [];

    exerciciosCriados.forEach(exercicio => {
      const quantidade = getQuantidadeSeries(exercicio.series_planejadas);
      for (let numero = 1; numero <= quantidade; numero += 1) {
        linhasSeries.push({
          execucao_exercicio_id: exercicio.id,
          execucao_treino_id: execucaoAtual.id,
          plano_treino_id: plano.id,
          user_id: profile.id,
          exercicio_key: exercicio.exercicio_key,
          numero_serie: numero,
          carga_kg: null,
          repeticoes: null,
          concluida: false
        });
      }
    });

    if (linhasSeries.length > 0) {
      const { error: seriesError } = await supabase.from('execucoes_series').insert(linhasSeries);
      if (seriesError) throw seriesError;
    }
  };

  const iniciarOuRetomar = async () => {
    setLoading(true);
    setStatusMsg('');
    try {
      const { data: existentes, error: existentesError } = await supabase.from('execucoes_treino')
        .select('*')
        .eq('plano_treino_id', plano.id)
        .eq('user_id', profile.id)
        .eq('sessao_key', sessaoKey)
        .eq('data_execucao', hoje)
        .eq('status', 'iniciado');
      if (existentesError) throw existentesError;

      let atual = (existentes || []).sort((a, b) => new Date(b.iniciado_em || b.created_at || 0) - new Date(a.iniciado_em || a.created_at || 0))[0] || null;

      if (!atual) {
        const iniciadoEm = new Date().toISOString();
        const { data: criada, error: criarError } = await supabase.from('execucoes_treino').insert([{
          plano_treino_id: plano.id,
          user_id: profile.id,
          sessao_key: sessaoKey,
          status: 'iniciado',
          data_execucao: hoje,
          iniciado_em: iniciadoEm,
          dados_execucao: {
            titulo: dia?.titulo || 'Treino',
            foco: dia?.foco || null,
            sessao_key: sessaoKey,
            iniciado_em: iniciadoEm
          }
        }]).select().single();
        if (criarError) throw criarError;
        atual = criada;
        await criarEstruturaExecucao(atual);
      }

      setExecucao(atual);
      let detalhes = await carregarDetalhesExecucao(atual);
      if (detalhes.exercicios.length === 0) {
        await criarEstruturaExecucao(atual);
        detalhes = await carregarDetalhesExecucao(atual);
      }
    } catch (error) {
      console.error('Erro ao iniciar treino:', error);
      setStatusMsg('Não foi possível iniciar o treino. Verifique o banco do Passo 4.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    iniciarOuRetomar();
  }, [plano?.id, profile?.id, sessaoKey]);

  const atualizarSerieLocal = (id, campo, valor) => {
    setSeriesExec(prev => prev.map(item => item.id === id ? { ...item, [campo]: valor } : item));
  };

  const persistirSerie = async (serie, patch = {}) => {
    const atualizada = { ...serie, ...patch };
    const payload = {
      carga_kg: atualizada.carga_kg === '' || atualizada.carga_kg == null ? null : Number(atualizada.carga_kg),
      repeticoes: atualizada.repeticoes === '' || atualizada.repeticoes == null ? null : Number(atualizada.repeticoes),
      concluida: Boolean(atualizada.concluida),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('execucoes_series').update(payload).eq('id', serie.id);
    if (error) {
      setStatusMsg('Não foi possível salvar uma das séries.');
      return false;
    }
    return true;
  };

  const alternarSerie = async (serie) => {
    const novoValor = !serie.concluida;
    atualizarSerieLocal(serie.id, 'concluida', novoValor);
    await persistirSerie(serie, { concluida: novoValor });
  };

  const finalizarTreino = async () => {
    if (!execucao?.id) return;
    const concluidas = seriesExec.filter(item => item.concluida).length;
    const total = seriesExec.length;
    if (total === 0 || concluidas === 0) {
      setStatusMsg('Conclua pelo menos uma série antes de finalizar o treino.');
      return;
    }

    setSaving(true);
    setStatusMsg('Salvando seu treino...');

    try {
      for (const serie of seriesExec) {
        const ok = await persistirSerie(serie);
        if (!ok) throw new Error('Erro ao salvar séries');
      }

      const agora = new Date();
      const iniciado = new Date(execucao.iniciado_em || execucao.created_at || agora.toISOString());
      const duracaoMinutos = Math.max(1, Math.round((agora.getTime() - iniciado.getTime()) / 60000));
      const percentual = total > 0 ? Math.round((concluidas / total) * 10000) / 100 : 0;

      const exerciciosResumo = exerciciosExec.map(exercicio => ({
        exercicio_key: exercicio.exercicio_key,
        nome: exercicio.nome_exercicio,
        planejado: {
          series: exercicio.series_planejadas,
          repeticoes: exercicio.repeticoes_planejadas,
          carga_orientacao: exercicio.carga_orientacao,
          descanso_seg: exercicio.descanso_seg
        },
        series: seriesExec
          .filter(serie => serie.execucao_exercicio_id === exercicio.id)
          .sort((a, b) => Number(a.numero_serie) - Number(b.numero_serie))
          .map(serie => ({
            numero: serie.numero_serie,
            carga_kg: serie.carga_kg === '' || serie.carga_kg == null ? null : Number(serie.carga_kg),
            repeticoes: serie.repeticoes === '' || serie.repeticoes == null ? null : Number(serie.repeticoes),
            concluida: Boolean(serie.concluida)
          }))
      }));

      const concluidoEm = agora.toISOString();
      const esforcoNumero = percepcaoEsforco ? Number(percepcaoEsforco) : null;
      const dadosExecucao = {
        titulo: dia?.titulo || 'Treino',
        foco: dia?.foco || null,
        sessao_key: sessaoKey,
        data_execucao: hoje,
        iniciado_em: execucao.iniciado_em,
        concluido_em: concluidoEm,
        duracao_minutos: duracaoMinutos,
        total_series: total,
        series_concluidas: concluidas,
        percentual_conclusao: percentual,
        percepcao_esforco: esforcoNumero,
        observacoes_aluno: observacoesAluno || null,
        exercicios: exerciciosResumo
      };

      const { error } = await supabase.from('execucoes_treino').update({
        status: 'concluido',
        concluido_em: concluidoEm,
        duracao_minutos: duracaoMinutos,
        percepcao_esforco: esforcoNumero,
        observacoes_aluno: observacoesAluno || null,
        percentual_conclusao: percentual,
        dados_execucao: dadosExecucao,
        updated_at: concluidoEm
      }).eq('id', execucao.id);
      if (error) throw error;

      setStatusMsg('Treino concluído! Seu histórico foi salvo.');
      setTimeout(() => onConcluido?.(dadosExecucao), 700);
    } catch (error) {
      console.error('Erro ao finalizar treino:', error);
      setStatusMsg('Não foi possível finalizar o treino. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const totalSeries = seriesExec.length;
  const seriesConcluidas = seriesExec.filter(item => item.concluida).length;
  const percentualVisual = totalSeries > 0 ? Math.round((seriesConcluidas / totalSeries) * 100) : 0;

  return (
    <div className="absolute inset-0 z-[70] bg-[#051109] text-white flex flex-col">
      <div className="px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-4 border-b border-[#1A4026] bg-[#07150c] shrink-0">
        <div className="flex items-center justify-between gap-3">
          <button onClick={onClose} className="w-10 h-10 rounded-full border border-[#1A4026] flex items-center justify-center text-[#D4AF37] active:scale-95"><ChevronLeft size={20}/></button>
          <div className="flex-1 text-center min-w-0">
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#D4AF37]">Treino em andamento</p>
            <h2 className="font-bold text-base truncate">{dia?.titulo || 'Treino'}</h2>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#1A3020] border border-[#D4AF37]/30 flex items-center justify-center"><Dumbbell size={18} className="text-[#D4AF37]"/></div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-[#A0B3A6] mb-1"><span>{seriesConcluidas}/{totalSeries} séries</span><span>{percentualVisual}%</span></div>
          <div className="h-2 rounded-full bg-[#1A3020] overflow-hidden"><div className="h-full bg-[#D4AF37] transition-all duration-300" style={{ width: `${percentualVisual}%` }} /></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-32 space-y-5">
        {statusMsg && <div className="bg-[#1A3020] border border-[#D4AF37]/40 text-[#D4AF37] p-3 rounded-xl text-xs text-center">{statusMsg}</div>}

        {loading ? (
          <div className="text-center text-[#A0B3A6] py-16">Preparando seu treino...</div>
        ) : exerciciosExec.length === 0 ? (
          <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-5 text-center text-sm text-[#A0B3A6]">Nenhum exercício foi encontrado nesta sessão.</div>
        ) : (
          exerciciosExec.map((exercicio, exIndex) => {
            const seriesDoExercicio = seriesExec
              .filter(serie => serie.execucao_exercicio_id === exercicio.id)
              .sort((a, b) => Number(a.numero_serie) - Number(b.numero_serie));
            const concluidasExercicio = seriesDoExercicio.filter(item => item.concluida).length;

            return (
              <div key={exercicio.id} className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[#1A4026]">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-[#D4AF37]">Exercício {exIndex + 1}</p>
                      <h3 className="font-bold text-base mt-0.5">{exercicio.nome_exercicio}</h3>
                    </div>
                    <span className="text-[10px] bg-[#051109] border border-[#1A4026] text-[#A0B3A6] px-2 py-1 rounded-full whitespace-nowrap">{concluidasExercicio}/{seriesDoExercicio.length}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#A0B3A6]">
                    {exercicio.repeticoes_planejadas && <span>Meta: {exercicio.series_planejadas} × {exercicio.repeticoes_planejadas}</span>}
                    {exercicio.descanso_seg && <span>Descanso: {exercicio.descanso_seg}s</span>}
                    {exercicio.carga_orientacao && <span>Carga: {exercicio.carga_orientacao}</span>}
                  </div>
                  {exercicio.observacoes_planejamento && <p className="text-[10px] text-[#A0B3A6] mt-2 leading-relaxed">{exercicio.observacoes_planejamento}</p>}
                </div>

                <div className="p-4 space-y-2">
                  <div className="grid grid-cols-[34px_1fr_1fr_42px] gap-2 text-[9px] uppercase tracking-wider text-[#A0B3A6] px-1">
                    <span>Série</span><span>Carga kg</span><span>Reps</span><span className="text-center">OK</span>
                  </div>
                  {seriesDoExercicio.map(serie => {
                    const anterior = historicoAnterior[`${exercicio.exercicio_key}-${serie.numero_serie}`];
                    return (
                      <div key={serie.id} className={`grid grid-cols-[34px_1fr_1fr_42px] gap-2 items-center rounded-xl p-2 border transition-colors ${serie.concluida ? 'bg-[#142619] border-[#D4AF37]/50' : 'bg-[#051109] border-[#1A4026]'}`}>
                        <span className="text-center font-bold text-[#D4AF37]">{serie.numero_serie}</span>
                        <div>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={serie.carga_kg ?? ''}
                            onChange={e => atualizarSerieLocal(serie.id, 'carga_kg', e.target.value)}
                            onBlur={() => persistirSerie(serie)}
                            placeholder={anterior?.carga_kg != null ? String(anterior.carga_kg) : 'kg'}
                            className="w-full bg-[#0A1A10] border border-[#1A4026] rounded-lg px-2 py-2 text-sm text-white outline-none focus:border-[#D4AF37]"
                          />
                          {anterior?.carga_kg != null && <span className="block mt-1 text-[8px] text-[#A0B3A6]">Anterior: {anterior.carga_kg} kg</span>}
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={serie.repeticoes ?? ''}
                            onChange={e => atualizarSerieLocal(serie.id, 'repeticoes', e.target.value)}
                            onBlur={() => persistirSerie(serie)}
                            placeholder={anterior?.repeticoes != null ? String(anterior.repeticoes) : 'reps'}
                            className="w-full bg-[#0A1A10] border border-[#1A4026] rounded-lg px-2 py-2 text-sm text-white outline-none focus:border-[#D4AF37]"
                          />
                          {anterior?.repeticoes != null && <span className="block mt-1 text-[8px] text-[#A0B3A6]">Anterior: {anterior.repeticoes}</span>}
                        </div>
                        <button onClick={() => alternarSerie(serie)} className={`w-9 h-9 rounded-full border flex items-center justify-center active:scale-95 transition-all ${serie.concluida ? 'bg-[#D4AF37] border-[#D4AF37] text-[#051109]' : 'bg-[#0A1A10] border-[#1A4026] text-[#A0B3A6]'}`}>
                          {serie.concluida ? <CheckCircle size={18}/> : <span className="text-xs">✓</span>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {!loading && exerciciosExec.length > 0 && (
          <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-4">
            <div>
              <label className="text-xs text-[#D4AF37] font-medium block mb-2">Como foi o esforço geral?</label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(valor => (
                  <button key={valor} onClick={() => setPercepcaoEsforco(String(valor))} className={`py-2 rounded-lg border text-xs font-bold ${Number(percepcaoEsforco) === valor ? 'bg-[#D4AF37] text-[#051109] border-[#D4AF37]' : 'bg-[#051109] text-[#A0B3A6] border-[#1A4026]'}`}>{valor}</button>
                ))}
              </div>
              <p className="text-[9px] text-[#A0B3A6] mt-2">2 = leve • 10 = esforço máximo</p>
            </div>
            <div>
              <label className="text-xs text-[#D4AF37] font-medium block mb-2">Observações do treino</label>
              <textarea value={observacoesAluno} onChange={e => setObservacoesAluno(e.target.value)} placeholder="Ex.: carga confortável, dor, fadiga ou algo que o professor deva saber." rows="3" className="w-full bg-[#051109] border border-[#1A4026] text-white p-3 rounded-xl text-xs outline-none resize-none focus:border-[#D4AF37]" />
            </div>
          </div>
        )}
      </div>

      {!loading && exerciciosExec.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-[#07150c]/95 backdrop-blur-md border-t border-[#1A4026]">
          <button disabled={saving || seriesConcluidas === 0} onClick={finalizarTreino} className="w-full bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] font-bold py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-40">
            {saving ? 'Salvando...' : `Finalizar treino • ${seriesConcluidas}/${totalSeries} séries`}
          </button>
        </div>
      )}
    </div>
  );
};

const MeuTreino = () => {
  const { profile } = useApp();
  const [plano, setPlano] = useState(null);
  const [loadingPlano, setLoadingPlano] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const [execucoes, setExecucoes] = useState([]);
  const [treinoAtivo, setTreinoAtivo] = useState(null);

  const carregarExecucoes = async (planoId) => {
    if (!planoId || !profile?.id) {
      setExecucoes([]);
      return;
    }
    const { data } = await supabase.from('execucoes_treino').select('*').eq('plano_treino_id', planoId).eq('user_id', profile.id);
    const lista = (data || []).sort((a, b) => new Date(b.concluido_em || b.iniciado_em || b.created_at || 0) - new Date(a.concluido_em || a.iniciado_em || a.created_at || 0));
    setExecucoes(lista);
  };

  const carregarPlano = async () => {
    if (!profile?.id) return;
    setLoadingPlano(true);
    setStatusMsg('');
    const { data, error } = await supabase.from('planos_treino').select('*').eq('user_id', profile.id).eq('status', 'publicado');
    if (error) {
      setStatusMsg('Ainda não foi possível carregar seu treino.');
      setPlano(null);
      setExecucoes([]);
    } else {
      const lista = Array.isArray(data) ? data : (data ? [data] : []);
      lista.sort((a, b) => new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0));
      const atual = lista[0] || null;
      setPlano(atual);
      await carregarExecucoes(atual?.id);
    }
    setLoadingPlano(false);
  };

  useEffect(() => { carregarPlano(); }, [profile?.id]);

  const treino = plano?.treino_json || null;
  const dias = Array.isArray(treino?.dias) ? treino.dias : [];
  const hoje = getLocalDateKey();

  const getStatusSessao = (dia, index) => {
    const chave = getSessaoKey(dia, index);
    const daSessao = execucoes.filter(item => item.sessao_key === chave);
    const emAndamentoHoje = daSessao.find(item => item.status === 'iniciado' && String(item.data_execucao || item.iniciado_em || '').slice(0, 10) === hoje);
    const concluidoHoje = daSessao.find(item => item.status === 'concluido' && String(item.data_execucao || item.concluido_em || '').slice(0, 10) === hoje);
    const ultimoConcluido = daSessao.find(item => item.status === 'concluido') || null;
    return { emAndamentoHoje, concluidoHoje, ultimoConcluido };
  };

  const abrirTreino = (dia, index) => {
    const status = getStatusSessao(dia, index);
    if (status.concluidoHoje) {
      setStatusMsg('Este treino já foi concluído hoje.');
      setTimeout(() => setStatusMsg(''), 3000);
      return;
    }
    setTreinoAtivo({ dia, index });
  };

  const handleConcluido = async () => {
    setTreinoAtivo(null);
    setStatusMsg('Treino concluído e salvo no histórico!');
    await carregarExecucoes(plano?.id);
    setTimeout(() => setStatusMsg(''), 3500);
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar pb-24 pt-4 text-white">
      {treinoAtivo && plano && (
        <ExecucaoTreino
          plano={plano}
          dia={treinoAtivo.dia}
          diaIndex={treinoAtivo.index}
          profile={profile}
          onClose={() => setTreinoAtivo(null)}
          onConcluido={handleConcluido}
        />
      )}

      <div className="mb-5 border-l-2 border-[#D4AF37] pl-3 py-1">
        <h2 className="text-[#D4AF37] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">Meu Treino</h2>
        <h3 className="text-white text-lg font-medium mb-1">Seu plano atual</h3>
        <p className="text-[#A0B3A6] text-xs">Registre cada série, carga e repetição para acompanhar sua evolução.</p>
      </div>

      {statusMsg && <div className="bg-[#1A3020] border border-[#D4AF37]/40 text-[#D4AF37] p-3 rounded-xl text-xs text-center">{statusMsg}</div>}

      {loadingPlano ? (
        <div className="text-center text-[#A0B3A6] py-12">Carregando seu treino...</div>
      ) : !plano ? (
        <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-6 text-center">
          <Dumbbell size={34} className="text-[#D4AF37] mx-auto mb-3" />
          <h4 className="font-medium mb-2">Seu treino está sendo preparado</h4>
          <p className="text-[#A0B3A6] text-xs leading-relaxed">A IA poderá gerar o plano, mas ele só aparece aqui depois da revisão e publicação pela equipe profissional.</p>
        </div>
      ) : (
        <>
          <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
            <div className="flex justify-between gap-3 items-start">
              <div>
                <p className="text-[#D4AF37] text-[10px] uppercase tracking-wider">Plano publicado</p>
                <h4 className="text-xl font-bold mt-1">{treino?.nome_plano || 'Treino Personalizado'}</h4>
                <p className="text-[#A0B3A6] text-xs mt-1">{treino?.objetivo || plano.objetivo || 'Plano individualizado'}</p>
              </div>
              <span className="text-[9px] bg-[#1A3020] border border-[#D4AF37]/30 text-[#D4AF37] px-2 py-1 rounded-full whitespace-nowrap">REVISADO</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-center">
              <div className="bg-[#051109] rounded-xl p-3 border border-[#1A4026]"><span className="text-lg font-bold">{treino?.frequencia_semanal || dias.length || '-'}</span><span className="block text-[10px] text-[#A0B3A6]">treinos/semana</span></div>
              <div className="bg-[#051109] rounded-xl p-3 border border-[#1A4026]"><span className="text-lg font-bold">{treino?.duracao_semanas || '-'}</span><span className="block text-[10px] text-[#A0B3A6]">semanas</span></div>
            </div>
          </div>

          <div className="space-y-4">
            {dias.map((dia, idx) => {
              const status = getStatusSessao(dia, idx);
              const ultimaData = status.ultimoConcluido?.data_execucao || status.ultimoConcluido?.concluido_em;
              return (
                <div key={dia.id || idx} className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-[#1A4026] flex justify-between items-start gap-3">
                    <div>
                      <p className="text-[#D4AF37] text-[10px] uppercase">{dia.foco || `Treino ${idx + 1}`}</p>
                      <h4 className="font-bold text-base">{dia.titulo || `Sessão ${idx + 1}`}</h4>
                      {ultimaData && <p className="text-[9px] text-[#A0B3A6] mt-1">Última execução: {formatarDataExecucao(ultimaData)}{status.ultimoConcluido?.percentual_conclusao != null ? ` • ${Math.round(Number(status.ultimoConcluido.percentual_conclusao))}%` : ''}</p>}
                    </div>
                    {dia.duracao_min && <span className="text-[10px] text-[#A0B3A6] whitespace-nowrap">≈ {dia.duracao_min} min</span>}
                  </div>
                  <div className="p-4 space-y-3">
                    {(dia.exercicios || []).map((ex, exIdx) => (
                      <div key={ex.id || exIdx} className="bg-[#051109] border border-[#1A4026] rounded-xl p-3">
                        <div className="flex justify-between gap-3"><span className="text-sm font-medium">{ex.nome}</span><span className="text-[#D4AF37] text-xs whitespace-nowrap">{ex.series || '-'} × {ex.repeticoes || '-'}</span></div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#A0B3A6]">
                          {ex.descanso_seg && <span>Descanso: {ex.descanso_seg}s</span>}
                          {ex.carga_orientacao && <span>Carga: {ex.carga_orientacao}</span>}
                        </div>
                        {ex.observacoes && <p className="text-[10px] text-[#A0B3A6] mt-2 leading-relaxed">{ex.observacoes}</p>}
                      </div>
                    ))}

                    <button
                      onClick={() => abrirTreino(dia, idx)}
                      disabled={Boolean(status.concluidoHoje)}
                      className={`w-full font-bold py-3 rounded-xl active:scale-95 transition-transform ${status.concluidoHoje ? 'bg-[#1A3020] text-[#D4AF37] border border-[#D4AF37]/30 opacity-80' : 'bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109]'}`}
                    >
                      {status.concluidoHoje ? '✓ Concluído hoje' : status.emAndamentoHoje ? 'Continuar treino' : status.ultimoConcluido ? 'Iniciar nova sessão' : 'Iniciar treino'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};


const Diario = () => {
  const { diarioData, setDiarioData, setActiveTab } = useApp();
  const [salvo, setSalvo] = useState(false);

  const salvarDiario = () => {
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-24 text-white pt-4">
      <div className="mb-4 border-l-2 border-[#D4AF37] pl-3 py-1 mt-4">
        <h2 className="text-[#D4AF37] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">Diário</h2>
        <h3 className="text-white text-lg font-medium mb-1">Como foi seu dia?</h3>
        <p className="text-[#A0B3A6] text-xs">O treino não fica mais aqui. Seu plano oficial está em Meu Treino.</p>
      </div>

      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[#D4AF37] text-[10px] uppercase tracking-wider">Treino</p>
          <h4 className="font-medium mt-1">Acesse sua ficha atual</h4>
          <p className="text-[#A0B3A6] text-xs mt-1">Somente o plano revisado e publicado pela academia.</p>
        </div>
        <button onClick={() => setActiveTab('treino')} className="shrink-0 bg-[#1A3020] border border-[#D4AF37]/40 text-[#D4AF37] px-3 py-2 rounded-xl text-xs font-medium active:scale-95">Meu Treino</button>
      </div>

      <div className="space-y-4">
        <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-4 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-[#1A4026] pb-3">
             <div className="w-10 h-10 rounded-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37] text-lg">🍽️</div>
             <div><h4 className="font-medium text-white">Nutrição</h4><p className="text-xs text-[#A0B3A6]">Como você avalia sua alimentação hoje?</p></div>
          </div>
          <div className="px-2">
            <div className="flex justify-between items-end text-xs text-[#A0B3A6] mb-3 font-medium">
              <span className="w-20 text-left leading-tight">Muito fora da rotina</span>
              <span className="text-[#D4AF37] font-bold text-2xl">{diarioData.nutricao}%</span>
              <span className="w-20 text-right leading-tight">Muito alinhada</span>
            </div>
            <input type="range" min="0" max="100" value={diarioData.nutricao} onChange={e => setDiarioData(prev => ({ ...prev, nutricao: Number(e.target.value) }))} className="w-full h-2 bg-[#1A3020] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]" />
          </div>
        </div>

        <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-4 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-[#1A4026] pb-3">
             <div className="w-10 h-10 rounded-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37]"><Heart size={20} /></div>
             <div><h4 className="font-medium text-white">Recuperação</h4><p className="text-xs text-[#A0B3A6]">Quantas horas você dormiu?</p></div>
          </div>
          <input type="number" min="0" max="24" step="0.5" value={diarioData.horasSono} onChange={e => setDiarioData(prev => ({ ...prev, horasSono: e.target.value }))} placeholder="Ex: 8" className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] text-center text-xl font-bold" />
        </div>

        <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-4 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-[#1A4026] pb-3">
             <div className="w-10 h-10 rounded-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37]"><Target size={20} /></div>
             <div><h4 className="font-medium text-white">Disposição</h4><p className="text-xs text-[#A0B3A6]">Como você está se sentindo hoje?</p></div>
          </div>
          <div className="px-2">
            <div className="flex justify-between items-end text-xs text-[#A0B3A6] mb-3 font-medium">
              <span className="w-20 text-left leading-tight">Sem disposição</span>
              <span className="text-[#D4AF37] font-bold text-2xl">{diarioData.mentalidade}%</span>
              <span className="w-20 text-right leading-tight">Disposição total</span>
            </div>
            <input type="range" min="0" max="100" value={diarioData.mentalidade} onChange={e => setDiarioData(prev => ({ ...prev, mentalidade: Number(e.target.value) }))} className="w-full h-2 bg-[#1A3020] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]" />
          </div>
        </div>

        {salvo && <div className="text-center text-[#D4AF37] text-xs">Diário atualizado.</div>}
        <button onClick={salvarDiario} className="w-full bg-[#1A3020] text-[#D4AF37] border border-[#D4AF37]/30 py-3 rounded-xl font-medium active:scale-95 transition-transform flex justify-center items-center gap-2 text-sm mt-4"><Save size={18} /> Salvar Diário</button>
      </div>
    </div>
  );
};

const Progresso = () => {
  const { 
    profile, registrarConquista,
    proteinGoal, setProteinGoal,
    proteinConsumed, setProteinConsumed,
    proteinPortion, setProteinPortion,
    proteinConquista, setProteinConquista,
    waterGoal, setWaterGoal,
    waterConsumed, setWaterConsumed,
    waterInterval, setWaterInterval,
    drinkSize, setDrinkSize,
    conquistaRegistrada, setConquistaRegistrada
  } = useApp();
  const [progressoUser, setProgressoUser] = useState({ mes: '', peso: '', braco: '', cintura: '', coxa: '' });
  const [historico, setHistorico] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');

  const proteinFill = Math.min((proteinConsumed / proteinGoal) * 100, 100);
  const fillPercentage = Math.min((waterConsumed / waterGoal) * 100, 100);

  useEffect(() => {
    if (fillPercentage >= 100 && !conquistaRegistrada) {
      if (registrarConquista) registrarConquista("💧 Conquista: Meta de água diária concluída!");
      setConquistaRegistrada(true);
    } else if (fillPercentage < 100) {
      setConquistaRegistrada(false); 
    }
  }, [fillPercentage, conquistaRegistrada, registrarConquista]);

  useEffect(() => {
    if (proteinFill >= 100 && !proteinConquista) {
      if (registrarConquista) registrarConquista("🥩 Conquista: Meta de proteína diária concluída!");
      setProteinConquista(true);
    } else if (proteinFill < 100) {
      setProteinConquista(false);
    }
  }, [proteinFill, proteinConquista, registrarConquista]);

  useEffect(() => {
    if (profile?.id) loadHistorico();
  }, [profile]);

  const loadHistorico = async () => {
    const { data, error } = await supabase.from('progresso_mensal').select('*').eq('user_id', profile.id);
    if (!error && data) {
      setHistorico(data.sort((a, b) => a.mes.localeCompare(b.mes)));
    }
  };

  const handleSave = async () => {
    if (!progressoUser.mes || !progressoUser.peso) {
      setStatusMsg('Mês e Peso são obrigatórios!');
      setTimeout(() => setStatusMsg(''), 3000);
      return;
    }
    
    setStatusMsg('Salvando...');
    const existente = historico.find(h => h.mes === progressoUser.mes);

    if (existente) {
      const { error } = await supabase.from('progresso_mensal').update({
        peso: Number(progressoUser.peso),
        braco: Number(progressoUser.braco),
        cintura: Number(progressoUser.cintura),
        coxa: Number(progressoUser.coxa)
      }).eq('id', existente.id);

      if (!error) {
        setStatusMsg('Atualizado com sucesso!');
        loadHistorico();
      } else setStatusMsg('Erro ao atualizar.');
    } else {
      const { error } = await supabase.from('progresso_mensal').insert([{
        user_id: profile.id,
        mes: progressoUser.mes,
        peso: Number(progressoUser.peso),
        braco: Number(progressoUser.braco),
        cintura: Number(progressoUser.cintura),
        coxa: Number(progressoUser.coxa)
      }]);

      if (!error) {
        setStatusMsg('Salvo com sucesso!');
        loadHistorico();
      } else setStatusMsg('Erro ao salvar.');
    }
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const compartilharInstagram = async (conquistaNome) => {
       const canvas = document.createElement('canvas');
       canvas.width = 1080;
       canvas.height = 1080;
       const ctx = canvas.getContext('2d');

       const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
       gradient.addColorStop(0, '#0A1A10');
       gradient.addColorStop(1, '#051109');
       ctx.fillStyle = gradient;
       ctx.fillRect(0, 0, 1080, 1080);

       ctx.strokeStyle = '#D4AF37';
       ctx.lineWidth = 15;
       ctx.strokeRect(30, 30, 1020, 1020);

       ctx.fillStyle = '#D4AF37';
       ctx.font = 'italic bold 80px "Playfair Display", serif';
       ctx.textAlign = 'center';
       ctx.fillText('Corpo em Movimento', 540, 200);

       ctx.beginPath();
       ctx.arc(540, 500, 180, 0, Math.PI * 2);
       ctx.fillStyle = '#1A3020';
       ctx.fill();
       ctx.lineWidth = 10;
       ctx.strokeStyle = '#D4AF37';
       ctx.stroke();

       ctx.fillStyle = '#D4AF37';
       ctx.font = '120px Arial';
       ctx.fillText('🏆', 540, 540);

       ctx.fillStyle = '#FFFFFF';
       ctx.font = 'bold 60px Arial';
       ctx.fillText('Desafio Concluído!', 540, 800);

       ctx.fillStyle = '#D4AF37';
       ctx.font = '50px Arial';
       ctx.fillText(conquistaNome, 540, 900);

       canvas.toBlob(async (blob) => {
         const file = new File([blob], 'conquista.png', { type: 'image/png' });
         if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
           try {
             await navigator.share({
               title: 'Minha Conquista',
               text: 'Acabei de concluir mais um desafio no app Corpo em Movimento! 🏆💪',
               files: [file]
             });
           } catch (error) {
             console.error('Erro ao compartilhar:', error);
           }
         } else {
           const url = URL.createObjectURL(blob);
           const a = document.createElement('a');
           a.href = url;
           a.download = 'corpo-em-movimento-conquista.png';
           a.click();
           URL.revokeObjectURL(url);
           alert("Imagem gerada e baixada! Agora você pode compartilhar no seu Instagram.");
         }
       }, 'image/png');
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-24 text-white">
      <div className="mb-6 border-l-2 border-[#D4AF37] pl-3 py-1 mt-4">
        <h2 className="text-[#D4AF37] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">Evolução</h2>
        <h3 className="text-white text-lg font-medium mb-1">Seu Progresso Pessoal</h3>
      </div>

      {/* --- JOGO DA PROTEÍNA --- */}
      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
        <div className="mb-4">
          <h4 className="font-medium text-[#D4AF37]">Meta de Proteína</h4>
          <p className="text-[#A0B3A6] text-[10px]">Acompanhe seu consumo diário.</p>
        </div>
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-32 h-48 cursor-pointer transition-transform active:scale-95 drop-shadow-[0_0_20px_rgba(26,64,38,0.4)] mx-auto" onClick={() => setProteinConsumed(prev => prev + proteinPortion)}>
            {/* Silhueta Vazia (Fundo) */}
            <svg viewBox="0 0 100 200" className="w-32 h-48 text-[#1A3020]" fill="currentColor">
              <path d="M50 10a13 13 0 1 0 0 26 13 13 0 0 0 0-26zm-16 38c-9 0-16 7-16 16v40c0 5 3 8 7 8h3v73c0 6 5 10 9 10s9-4 9-10v-45h8v45c0 6 5 10 9 10s9-4 9-10v-73h3c4 0 7-3 7-8V64c0-9-7-16-16-16H34z" />
            </svg>
            
            {/* Container de Preenchimento (Corte animado) */}
            <div className="absolute bottom-0 left-0 w-32 overflow-hidden transition-all duration-[800ms] ease-in-out" style={{ height: `${proteinFill}%` }}>
              <svg viewBox="0 0 100 200" className="absolute bottom-0 left-0 w-32 h-48">
                <defs>
                  <linearGradient id="proteinGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
                <path d="M50 10a13 13 0 1 0 0 26 13 13 0 0 0 0-26zm-16 38c-9 0-16 7-16 16v40c0 5 3 8 7 8h3v73c0 6 5 10 9 10s9-4 9-10v-45h8v45c0 6 5 10 9 10s9-4 9-10v-73h3c4 0 7-3 7-8V64c0-9-7-16-16-16H34z" fill="url(#proteinGradient)" />
              </svg>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center">
            <div className="flex items-baseline gap-1"><span className="text-4xl font-bold text-[#D4AF37]">{proteinConsumed}</span><span className="text-[#A0B3A6] text-lg">/ {proteinGoal} g</span></div>
            <p className="text-[#D4AF37] text-xs font-medium uppercase tracking-widest mt-1">{proteinFill >= 100 ? 'Meta Atingida!' : 'Continue Consumindo'}</p>
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <button onClick={() => setProteinConsumed(0)} className="w-14 h-14 bg-[#051109] border border-red-900/30 rounded-2xl flex items-center justify-center text-red-500 active:scale-95 transition-transform" title="Zerar"><RotateCcw size={24} /></button>
          <button onClick={() => setProteinConsumed(prev => Math.max(0, prev - proteinPortion))} className="w-14 h-14 bg-[#051109] border border-[#1A4026] rounded-2xl flex items-center justify-center text-white active:scale-95 transition-transform"><Minus size={24} /></button>
          <button onClick={() => setProteinConsumed(prev => prev + proteinPortion)} className="flex-1 bg-[#1A3020] border border-[#D4AF37]/30 text-[#D4AF37] rounded-2xl flex items-center justify-center gap-2 font-medium active:scale-95 transition-transform"><Plus size={24} /> {proteinPortion}g</button>
        </div>
        <div className="bg-[#051109] border border-[#1A4026] rounded-xl p-3 mt-4 space-y-3">
          <h5 className="text-[#D4AF37] text-xs font-semibold">Configurações de Proteína</h5>
          <div className="flex justify-between items-center"><label className="text-xs text-[#A0B3A6]">Meta Diária (g)</label><input type="number" value={proteinGoal} onChange={e => setProteinGoal(Number(e.target.value))} className="bg-[#0A1A10] border border-[#1A4026] text-white px-3 py-1.5 rounded-lg w-20 text-right text-sm focus:outline-none focus:border-[#D4AF37]" /></div>
          <div className="flex justify-between items-center"><label className="text-xs text-[#A0B3A6]">Porção (g)</label><input type="number" value={proteinPortion} onChange={e => setProteinPortion(Number(e.target.value))} className="bg-[#0A1A10] border border-[#1A4026] text-white px-3 py-1.5 rounded-lg w-20 text-right text-sm focus:outline-none focus:border-[#D4AF37]" /></div>
        </div>
      </div>

      {/* --- JOGO DA ÁGUA --- */}
      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
        <div className="mb-4">
          <h4 className="font-medium text-[#D4AF37]">Meta de Água</h4>
          <p className="text-[#A0B3A6] text-[10px]">Acompanhe seu consumo diário.</p>
        </div>
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-32 h-48 border-[6px] border-[#1A3020] rounded-b-3xl rounded-t-lg bg-[#051109] overflow-hidden shadow-[0_0_30px_rgba(26,64,38,0.3)] cursor-pointer transition-transform active:scale-95 mx-auto" onClick={() => setWaterConsumed(prev => prev + drinkSize)}>
            <div className="absolute top-1/4 left-0 w-2 h-0.5 bg-[#1A3020] z-10"></div>
            <div className="absolute top-2/4 left-0 w-2 h-0.5 bg-[#1A3020] z-10"></div>
            <div className="absolute top-3/4 left-0 w-2 h-0.5 bg-[#1A3020] z-10"></div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-[800ms] ease-in-out opacity-90" style={{ height: `${fillPercentage}%` }}>
              <div className="absolute top-0 left-0 right-0 h-2 bg-cyan-300/60 rounded-t-full"></div>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center">
            <div className="flex items-baseline gap-1"><span className="text-4xl font-bold text-[#D4AF37]">{waterConsumed}</span><span className="text-[#A0B3A6] text-lg">/ {waterGoal} ml</span></div>
            <p className="text-[#D4AF37] text-xs font-medium uppercase tracking-widest mt-1">{fillPercentage >= 100 ? 'Meta Atingida!' : 'Continue Bebendo'}</p>
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <button onClick={() => setWaterConsumed(0)} className="w-14 h-14 bg-[#051109] border border-red-900/30 rounded-2xl flex items-center justify-center text-red-500 active:scale-95 transition-transform" title="Zerar"><RotateCcw size={24} /></button>
          <button onClick={() => setWaterConsumed(prev => Math.max(0, prev - drinkSize))} className="w-14 h-14 bg-[#051109] border border-[#1A4026] rounded-2xl flex items-center justify-center text-white active:scale-95 transition-transform"><Minus size={24} /></button>
          <button onClick={() => setWaterConsumed(prev => prev + drinkSize)} className="flex-1 bg-[#1A3020] border border-[#D4AF37]/30 text-[#D4AF37] rounded-2xl flex items-center justify-center gap-2 font-medium active:scale-95 transition-transform"><Plus size={24} /> {drinkSize}ml</button>
        </div>
        <div className="bg-[#051109] border border-[#1A4026] rounded-xl p-3 mt-4 space-y-3">
          <h5 className="text-[#D4AF37] text-xs font-semibold">Configurações de Água</h5>
          <div className="flex justify-between items-center"><label className="text-xs text-[#A0B3A6]">Meta Diária (ml)</label><input type="number" value={waterGoal} onChange={e => setWaterGoal(Number(e.target.value))} className="bg-[#0A1A10] border border-[#1A4026] text-white px-3 py-1.5 rounded-lg w-20 text-right text-sm focus:outline-none focus:border-[#D4AF37]" /></div>
          <div className="flex justify-between items-center"><label className="text-xs text-[#A0B3A6]">Intervalo (min)</label><input type="number" value={waterInterval} onChange={e => setWaterInterval(Number(e.target.value))} className="bg-[#0A1A10] border border-[#1A4026] text-white px-3 py-1.5 rounded-lg w-20 text-right text-sm focus:outline-none focus:border-[#D4AF37]" /></div>
          <div className="flex justify-between items-center"><label className="text-xs text-[#A0B3A6]">Porção (ml)</label><input type="number" value={drinkSize} onChange={e => setDrinkSize(Number(e.target.value))} className="bg-[#0A1A10] border border-[#1A4026] text-white px-3 py-1.5 rounded-lg w-20 text-right text-sm focus:outline-none focus:border-[#D4AF37]" /></div>
        </div>
      </div>

      {/* --- GRÁFICOS (Evolução de Peso) --- */}
      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
         <div className="flex justify-between items-center mb-4">
           <h4 className="font-medium text-[#D4AF37]">Gráficos - Histórico de Peso (kg)</h4>
           <span className="text-sm font-bold text-white">
             {historico.length > 0 ? `${historico[historico.length - 1].peso} kg` : '0 kg'}
           </span>
         </div>
         <div className="h-32 flex items-end gap-2 pt-4 border-b border-[#1A4026] opacity-70">
            {historico.length > 0 ? historico.map((h, i) => (
              <div key={i} className="flex-1 bg-[#D4AF37] rounded-t-sm" style={{ height: `${Math.min((h.peso / 150) * 100, 100)}%` }}></div>
            )) : (
              <div className="flex-1 text-center text-[#A0B3A6] text-xs pb-4">Nenhum dado registrado</div>
            )}
         </div>
         <div className="flex justify-between text-[#A0B3A6] text-[10px] mt-2 overflow-x-auto gap-4 custom-scrollbar">
           {historico.map((h, i) => {
             const [ano, mes] = h.mes.split('-');
             return <span key={i} className="whitespace-nowrap">{mes}/{ano}</span>;
           })}
         </div>
      </div>

      {/* --- DESAFIOS SEMANAIS E MEDALHAS --- */}
      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
        <h4 className="font-medium text-[#D4AF37] mb-1">Desafios da Semana</h4>
        <p className="text-[#A0B3A6] text-[10px] mb-4">Complete as metas e compartilhe sua vitória!</p>
        
        <div className="space-y-3">
           <div className="flex items-center justify-between p-3 bg-[#051109] border border-[#D4AF37]/30 rounded-xl">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-[#1A3020] flex items-center justify-center border border-[#D4AF37]">
                 <Award className="text-[#D4AF37]" size={20} />
               </div>
               <div>
                 <p className="text-sm font-bold text-white">4 Dias de Treino</p>
                 <p className="text-[10px] text-[#A0B3A6]">Concluído 4/4</p>
               </div>
             </div>
             <button onClick={() => compartilharInstagram('4 Dias de Treino')} className="bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
               COMPARTILHAR
             </button>
           </div>
           
           <div className="flex items-center justify-between p-3 bg-[#051109] border border-[#1A4026] rounded-xl opacity-60">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-[#1A3020] flex items-center justify-center border border-[#1A4026]">
                 <Droplets className="text-[#A0B3A6]" size={20} />
               </div>
               <div>
                 <p className="text-sm font-bold text-white">10L de Água na Semana</p>
                 <p className="text-[10px] text-[#A0B3A6]">Pendente 6/10 L</p>
               </div>
             </div>
             <span className="text-[10px] text-[#A0B3A6]">EM ANDAMENTO</span>
           </div>
        </div>
      </div>

      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-[#D4AF37] flex items-center gap-2"><Edit2 size={16}/> Atualizar Medidas Físicas</h4>
          {statusMsg && <span className="text-[#D4AF37] text-xs font-medium">{statusMsg}</span>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Mês de Referência</label>
            <input type="month" value={progressoUser.mes} onChange={e => setProgressoUser({...progressoUser, mes: e.target.value})} className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" style={{ colorScheme: 'dark' }} />
          </div>
          <div>
            <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Peso (kg)</label>
            <input type="number" value={progressoUser.peso} onChange={e => setProgressoUser({...progressoUser, peso: e.target.value})} className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Braço (cm)</label>
            <input type="number" value={progressoUser.braco} onChange={e => setProgressoUser({...progressoUser, braco: e.target.value})} className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Cintura (cm)</label>
            <input type="number" value={progressoUser.cintura} onChange={e => setProgressoUser({...progressoUser, cintura: e.target.value})} className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Coxa (cm)</label>
            <input type="number" value={progressoUser.coxa} onChange={e => setProgressoUser({...progressoUser, coxa: e.target.value})} className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" />
          </div>
        </div>
        <button onClick={handleSave} className="w-full bg-[#1A3020] text-[#D4AF37] border border-[#D4AF37]/30 py-2 rounded-xl mt-2 font-medium flex items-center justify-center gap-2 active:scale-95"><Save size={18}/> Salvar Progresso</button>
      </div>

      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 flex items-center justify-between active:scale-95 transition-transform cursor-pointer">
        <div className="flex items-center gap-3"><Camera className="text-[#D4AF37]" size={24} /><div><h4 className="font-medium">Galeria de Evolução</h4><p className="text-[#A0B3A6] text-xs">Adicionar fotos de progresso</p></div></div>
        <ChevronRight className="text-[#D4AF37] opacity-80" size={18} />
      </div>
    </div>
  );
};

// --- CORRIDA PRO: mapa real, elevação, zonas, metas, conquistas e Feed ---
let leafletPromise = null;
const ensureLeaflet = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Mapa indisponível neste ambiente.'));
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    const cssId = 'cem-leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    const existing = document.getElementById('cem-leaflet-js');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L), { once: true });
      existing.addEventListener('error', () => reject(new Error('Não foi possível carregar o mapa.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'cem-leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Não foi possível carregar o mapa.'));
    document.head.appendChild(script);
  });

  return leafletPromise;
};

const StreetRouteMap = ({ points = [], heightClass = 'h-52', followLast = false }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const routeRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let resizeTimer = null;

    ensureLeaflet().then((L) => {
      if (cancelled || !containerRef.current) return;
      if (!mapRef.current) {
        const validPoints = (points || []).filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
        const initial = validPoints.length ? [Number(validPoints[validPoints.length - 1].lat), Number(validPoints[validPoints.length - 1].lng)] : [-14.235, -51.9253];
        const zoom = validPoints.length ? 15 : 3;
        const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView(initial, zoom);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        mapRef.current = map;
        resizeTimer = setTimeout(() => map.invalidateSize(), 120);
      }

      const map = mapRef.current;
      const validPoints = (points || []).filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
      if (!validPoints.length) return;
      const latlngs = validPoints.map(p => [Number(p.lat), Number(p.lng)]);

      if (!routeRef.current) {
        routeRef.current = L.polyline(latlngs, { color: '#FC4C02', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
      } else {
        routeRef.current.setLatLngs(latlngs);
      }

      if (!startMarkerRef.current && latlngs.length) {
        startMarkerRef.current = L.circleMarker(latlngs[0], { radius: 6, color: '#D4AF37', fillColor: '#D4AF37', fillOpacity: 1, weight: 2 }).addTo(map).bindTooltip('Início');
      }

      const last = latlngs[latlngs.length - 1];
      if (!endMarkerRef.current) {
        endMarkerRef.current = L.circleMarker(last, { radius: 6, color: '#FC4C02', fillColor: '#FC4C02', fillOpacity: 1, weight: 2 }).addTo(map).bindTooltip('Atual');
      } else {
        endMarkerRef.current.setLatLng(last);
      }

      if (followLast) {
        map.panTo(last, { animate: false });
      } else if (latlngs.length > 1) {
        const bounds = L.latLngBounds(latlngs);
        map.fitBounds(bounds, { padding: [22, 22], maxZoom: 16 });
      } else {
        map.setView(last, 16);
      }
    }).catch((e) => setMapError(e.message || 'Mapa indisponível.'));

    return () => {
      cancelled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [points, followLast]);

  useEffect(() => () => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, []);

  if (mapError) {
    return <div className={`${heightClass} bg-[#051109] rounded-2xl border border-[#1A4026] flex items-center justify-center text-xs text-[#A0B3A6] px-4 text-center`}>{mapError}</div>;
  }

  return <div ref={containerRef} className={`${heightClass} w-full rounded-2xl overflow-hidden border border-[#1A4026] bg-[#051109]`} />;
};

const Corrida = () => {
  const { profile } = useApp();
  const [atividades, setAtividades] = useState([]);
  const [loadingAtividades, setLoadingAtividades] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distanceM, setDistanceM] = useState(0);
  const [paceSecKm, setPaceSecKm] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [routePoints, setRoutePoints] = useState([]);
  const [splits, setSplits] = useState([]);
  const [meta, setMeta] = useState({ weekly_distance_km: 15, weekly_runs: 3, reference_pace_sec_km: null });
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaDraft, setMetaDraft] = useState({ weekly_distance_km: 15, weekly_runs: 3, reference_pace: '' });
  const [conquistas, setConquistas] = useState([]);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState(null);
  const [sharingFeedId, setSharingFeedId] = useState(null);

  const watchIdRef = useRef(null);
  const timerRef = useRef(null);
  const pausedRef = useRef(false);
  const elapsedRef = useRef(0);
  const distanceRef = useRef(0);
  const pointsRef = useRef([]);
  const lastPointRef = useRef(null);
  const startedAtRef = useRef(null);
  const maxSpeedRef = useRef(0);

  const formatDuration = (totalSeconds = 0) => {
    const sec = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0
      ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatPace = (value) => {
    const sec = Number(value);
    if (!sec || !Number.isFinite(sec) || sec <= 0) return '--:--';
    const min = Math.floor(sec / 60);
    const rem = Math.round(sec % 60);
    return `${min}:${String(rem).padStart(2, '0')}`;
  };

  const parsePace = (value) => {
    const text = String(value || '').trim();
    if (!text) return null;
    const parts = text.split(':').map(Number);
    if (parts.some(v => !Number.isFinite(v))) return null;
    if (parts.length === 1) return Math.round(parts[0] * 60);
    return Math.round(parts[0] * 60 + parts[1]);
  };

  const haversineMeters = (a, b) => {
    const R = 6371000;
    const toRad = (v) => (v * Math.PI) / 180;
    const dLat = toRad(Number(b.lat) - Number(a.lat));
    const dLng = toRad(Number(b.lng) - Number(a.lng));
    const lat1 = toRad(Number(a.lat));
    const lat2 = toRad(Number(b.lat));
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };

  const routePolyline = (points, width = 100, height = 60, pad = 6) => {
    if (!Array.isArray(points) || points.length < 2) return '';
    const lats = points.map(p => Number(p.lat)).filter(Number.isFinite);
    const lngs = points.map(p => Number(p.lng)).filter(Number.isFinite);
    if (!lats.length || !lngs.length) return '';
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latSpan = Math.max(maxLat - minLat, 0.00001);
    const lngSpan = Math.max(maxLng - minLng, 0.00001);
    return points.map(p => {
      const x = pad + ((Number(p.lng) - minLng) / lngSpan) * (width - pad * 2);
      const y = height - pad - ((Number(p.lat) - minLat) / latSpan) * (height - pad * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  };

  const sampleRoute = (points, max = 100) => {
    const valid = (points || []).filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
    if (valid.length <= max) return valid;
    const sampled = [];
    for (let i = 0; i < max; i++) {
      sampled.push(valid[Math.round((i * (valid.length - 1)) / (max - 1))]);
    }
    return sampled;
  };

  const buscarPerfilElevacao = async (points) => {
    // Privacidade: a rota não é enviada a um serviço externo de elevação.
    // Usamos somente a altitude que o próprio GPS do aparelho fornecer.
    const sampled = sampleRoute(points, 300);
    const raw = sampled
      .filter(p => Number.isFinite(Number(p.altitude)) && (!Number.isFinite(Number(p.altitude_accuracy)) || Number(p.altitude_accuracy) <= 50))
      .map(p => ({ ...p, elevation_m: Number(p.altitude) }));
    if (raw.length < 2) return [];

    // Suavização local simples para reduzir ruído vertical do GPS.
    return raw.map((p, i) => {
      const from = Math.max(0, i - 2);
      const to = Math.min(raw.length, i + 3);
      const vals = raw.slice(from, to).map(x => Number(x.elevation_m)).filter(Number.isFinite);
      const smooth = vals.reduce((a,b) => a+b, 0) / Math.max(1, vals.length);
      return { ...p, elevation_m: Number(smooth.toFixed(1)) };
    });
  };

  const calcularElevacao = (profilePoints) => {
    if (!Array.isArray(profilePoints) || profilePoints.length < 2) return { gain: null, loss: null, min: null, max: null };
    const vals = profilePoints.map(p => Number(p.elevation_m)).filter(Number.isFinite);
    if (vals.length < 2) return { gain: null, loss: null, min: null, max: null };
    let gain = 0;
    let loss = 0;
    for (let i = 1; i < profilePoints.length; i++) {
      const a = Number(profilePoints[i - 1].elevation_m);
      const b = Number(profilePoints[i].elevation_m);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const delta = b - a;
      // Pequeno filtro antirruído para DEM/GPS.
      if (Math.abs(delta) < 1.5 || Math.abs(delta) > 40) continue;
      if (delta > 0) gain += delta;
      else loss += Math.abs(delta);
    }
    return { gain: Math.round(gain), loss: Math.round(loss), min: Math.round(Math.min(...vals)), max: Math.round(Math.max(...vals)) };
  };

  const getReferencePace = (list = atividades) => {
    const configured = Number(meta?.reference_pace_sec_km);
    if (configured > 0) return configured;
    const values = (list || []).slice(0, 8).map(a => Number(a.avg_pace_sec_km)).filter(v => Number.isFinite(v) && v > 0 && v < 1800).sort((a,b) => a-b);
    if (!values.length) return 420;
    return values[Math.floor(values.length / 2)];
  };

  const zoneForPace = (pace, reference) => {
    if (!Number.isFinite(pace) || pace <= 0 || !Number.isFinite(reference) || reference <= 0) return null;
    if (pace >= reference * 1.20) return 'Z1';
    if (pace >= reference * 1.10) return 'Z2';
    if (pace >= reference) return 'Z3';
    if (pace >= reference * 0.92) return 'Z4';
    return 'Z5';
  };

  const calcularZonas = (points, referencePace) => {
    const zones = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
    for (let i = 1; i < (points || []).length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const dd = Number(b.distance_m) - Number(a.distance_m);
      const dt = Number(b.elapsed_s) - Number(a.elapsed_s);
      if (!Number.isFinite(dd) || !Number.isFinite(dt) || dd < 3 || dt <= 0 || dt > 120) continue;
      const pace = dt / (dd / 1000);
      if (pace < 120 || pace > 1800) continue;
      const z = zoneForPace(pace, referencePace);
      if (z) zones[z] += dt;
    }
    return Object.entries(zones).map(([zone, seconds]) => ({ zone, seconds: Math.round(seconds) }));
  };

  const calcularSplitsDetalhados = (points, elevationProfile = []) => {
    if (!Array.isArray(points) || points.length < 2) return [];
    const totalDistance = Number(points[points.length - 1]?.distance_m || 0);
    if (totalDistance <= 0) return [];
    const fullKm = Math.floor(totalDistance / 1000);
    const result = [];
    let prevElapsed = 0;

    const ganhoNoIntervalo = (fromM, toM) => {
      const filtered = elevationProfile.filter(p => Number(p.distance_m) >= fromM && Number(p.distance_m) <= toM);
      const calc = calcularElevacao(filtered);
      return calc.gain;
    };

    for (let km = 1; km <= fullKm; km++) {
      const target = km * 1000;
      const point = points.find(p => Number(p.distance_m) >= target) || points[points.length - 1];
      const elapsedAt = Number(point.elapsed_s || 0);
      const splitTime = Math.max(1, elapsedAt - prevElapsed);
      result.push({ km, distance_km: 1, tempo_s: splitTime, pace_sec_km: splitTime, elev_gain_m: ganhoNoIntervalo((km - 1) * 1000, km * 1000), acumulado_s: elapsedAt, parcial: false });
      prevElapsed = elapsedAt;
    }

    const remainder = totalDistance - fullKm * 1000;
    if (remainder >= 200) {
      const last = points[points.length - 1];
      const elapsedAt = Number(last.elapsed_s || 0);
      const splitTime = Math.max(1, elapsedAt - prevElapsed);
      const kmDistance = remainder / 1000;
      result.push({ km: fullKm + 1, distance_km: Number(kmDistance.toFixed(2)), tempo_s: splitTime, pace_sec_km: Math.round(splitTime / kmDistance), elev_gain_m: ganhoNoIntervalo(fullKm * 1000, totalDistance), acumulado_s: elapsedAt, parcial: true });
    }
    return result;
  };

  const carregarAtividades = async () => {
    if (!profile?.id) return [];
    setLoadingAtividades(true);
    try {
      const url = `${supabaseUrl}/rest/v1/corridas?select=*&user_id=eq.${encodeURIComponent(profile.id)}&status=eq.concluida&order=started_at.desc&limit=60`;
      const res = await fetch(url, { headers: getHeaders() });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.message || 'Erro ao carregar corridas.');
      const list = Array.isArray(data) ? data : [];
      setAtividades(list);
      return list;
    } catch (e) {
      console.error(e);
      setStatusMsg('Não foi possível carregar o histórico de corrida.');
      return [];
    } finally {
      setLoadingAtividades(false);
    }
  };

  const carregarMeta = async () => {
    if (!profile?.id) return;
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/corrida_metas?select=*&user_id=eq.${encodeURIComponent(profile.id)}&limit=1`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && Array.isArray(data) && data[0]) {
        const m = data[0];
        setMeta(m);
        setMetaDraft({ weekly_distance_km: m.weekly_distance_km ?? 15, weekly_runs: m.weekly_runs ?? 3, reference_pace: m.reference_pace_sec_km ? formatPace(m.reference_pace_sec_km) : '' });
      }
    } catch (e) { console.error(e); }
  };

  const salvarMeta = async () => {
    const weeklyKm = Math.max(1, Math.min(300, Number(metaDraft.weekly_distance_km) || 15));
    const weeklyRuns = Math.max(1, Math.min(14, Number(metaDraft.weekly_runs) || 3));
    const reference = parsePace(metaDraft.reference_pace);
    const payload = { user_id: profile.id, weekly_distance_km: weeklyKm, weekly_runs: weeklyRuns, reference_pace_sec_km: reference, updated_at: new Date().toISOString() };
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/corrida_metas?on_conflict=user_id`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.message || 'Erro ao salvar meta.');
      setMeta(Array.isArray(data) ? data[0] || payload : payload);
      setEditingMeta(false);
      setStatusMsg('Meta semanal atualizada.');
    } catch (e) {
      console.error(e);
      setStatusMsg('Não foi possível salvar a meta semanal.');
    }
  };

  const carregarConquistas = async () => {
    if (!profile?.id) return;
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/corrida_conquistas?select=*&user_id=eq.${encodeURIComponent(profile.id)}&order=unlocked_at.desc`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setConquistas(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    carregarAtividades();
    carregarMeta();
    carregarConquistas();
    return () => {
      if (watchIdRef.current != null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [profile?.id]);

  const limparTracking = () => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const iniciarCorrida = () => {
    if (!navigator.geolocation) {
      setStatusMsg('Este dispositivo não oferece localização por GPS.');
      return;
    }

    setStatusMsg('Buscando sinal de GPS...');
    setTracking(true);
    setPaused(false);
    pausedRef.current = false;
    setElapsed(0);
    setDistanceM(0);
    setPaceSecKm(null);
    setGpsAccuracy(null);
    setRoutePoints([]);
    setSplits([]);
    elapsedRef.current = 0;
    distanceRef.current = 0;
    pointsRef.current = [];
    lastPointRef.current = null;
    startedAtRef.current = Date.now();
    maxSpeedRef.current = 0;

    timerRef.current = setInterval(() => {
      if (!pausedRef.current) {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (distanceRef.current >= 100) setPaceSecKm(elapsedRef.current / (distanceRef.current / 1000));
      }
    }, 1000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed, altitude, altitudeAccuracy } = pos.coords;
        setGpsAccuracy(Math.round(accuracy || 0));
        if (pausedRef.current) return;
        if (accuracy && accuracy > 80) {
          setStatusMsg('GPS com baixa precisão. Aguardando sinal melhor...');
          return;
        }

        const point = {
          lat: latitude,
          lng: longitude,
          accuracy: accuracy || null,
          altitude: Number.isFinite(altitude) ? altitude : null,
          altitude_accuracy: Number.isFinite(altitudeAccuracy) ? altitudeAccuracy : null,
          timestamp: pos.timestamp || Date.now(),
          elapsed_s: elapsedRef.current,
          distance_m: distanceRef.current
        };

        const last = lastPointRef.current;
        if (last) {
          const delta = haversineMeters(last, point);
          if (delta >= 2 && delta <= 250) {
            distanceRef.current += delta;
            point.distance_m = distanceRef.current;
            setDistanceM(distanceRef.current);
          }
        }

        if (typeof speed === 'number' && speed > 0) maxSpeedRef.current = Math.max(maxSpeedRef.current, speed * 3.6);
        lastPointRef.current = point;
        pointsRef.current = [...pointsRef.current, point].slice(-5000);
        setRoutePoints(pointsRef.current);

        const liveSplits = calcularSplitsDetalhados(pointsRef.current, []);
        setSplits(liveSplits);
        setStatusMsg('GPS conectado');
      },
      (error) => {
        const msg = error?.code === 1 ? 'Permita o acesso à localização para registrar a corrida.' : 'Não foi possível obter sua localização. Verifique o GPS.';
        setStatusMsg(msg);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
  };

  const alternarPausa = () => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    setStatusMsg(next ? 'Corrida pausada' : 'Corrida retomada');
  };

  const avaliarConquistas = async (nova, listaCompleta) => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setHours(0,0,0,0);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const week = listaCompleta.filter(a => new Date(a.started_at) >= monday);
    const kmWeek = week.reduce((s,a) => s + Number(a.distance_m || 0), 0) / 1000;
    const totalKm = listaCompleta.reduce((s,a) => s + Number(a.distance_m || 0), 0) / 1000;

    const defs = [
      { code:'primeira_corrida', title:'Primeiros passos', description:'Concluiu a primeira corrida registrada.', ok: listaCompleta.length >= 1 },
      { code:'5k', title:'5K concluído', description:'Completou uma corrida de pelo menos 5 km.', ok: Number(nova.distance_m) >= 5000 },
      { code:'10k', title:'10K concluído', description:'Completou uma corrida de pelo menos 10 km.', ok: Number(nova.distance_m) >= 10000 },
      { code:'3_semana', title:'Trinca da semana', description:'Concluiu 3 corridas na mesma semana.', ok: week.length >= 3 },
      { code:'25k_semana', title:'Semana de 25K', description:'Somou 25 km ou mais na semana.', ok: kmWeek >= 25 },
      { code:'50k_total', title:'50K acumulados', description:'Somou 50 km em corridas registradas.', ok: totalKm >= 50 },
      { code:'100m_elevacao', title:'Subida forte', description:'Acumulou 100 m ou mais de ganho de elevação em uma corrida.', ok: Number(nova.elevation_gain_m || 0) >= 100 }
    ].filter(d => d.ok);

    const existingCodes = new Set(conquistas.map(c => c.code));
    const novas = defs.filter(d => !existingCodes.has(d.code));
    for (const d of novas) {
      await fetch(`${supabaseUrl}/rest/v1/corrida_conquistas`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Prefer': 'return=minimal' },
        body: JSON.stringify({ user_id: profile.id, corrida_id: nova.id, code: d.code, title: d.title, description: d.description })
      }).catch(() => null);
    }
    if (novas.length) {
      setStatusMsg(`Nova conquista: ${novas[0].title}!`);
      await carregarConquistas();
    }
  };

  const finalizarCorrida = async () => {
    if (!tracking) return;
    if (!window.confirm('Finalizar e salvar esta corrida?')) return;

    limparTracking();
    setTracking(false);
    setPaused(false);
    pausedRef.current = false;

    const totalDistance = Math.round(distanceRef.current);
    const totalElapsed = elapsedRef.current;
    const avgPace = totalDistance >= 100 ? Math.round(totalElapsed / (totalDistance / 1000)) : null;
    if (totalDistance < 20 || totalElapsed < 10) {
      setStatusMsg('Atividade muito curta. Ela não foi salva.');
      return;
    }

    setStatusMsg('Calculando elevação e parciais...');
    const elevationProfile = await buscarPerfilElevacao(pointsRef.current);
    const elevation = calcularElevacao(elevationProfile);
    const referencePace = getReferencePace();
    const detailedSplits = calcularSplitsDetalhados(pointsRef.current, elevationProfile);
    const paceZones = calcularZonas(pointsRef.current, referencePace);

    setStatusMsg('Salvando sua corrida...');
    const payload = {
      user_id: profile.id,
      started_at: new Date(startedAtRef.current).toISOString(),
      finished_at: new Date().toISOString(),
      duration_seconds: totalElapsed,
      distance_m: totalDistance,
      avg_pace_sec_km: avgPace,
      max_speed_kmh: Number(maxSpeedRef.current.toFixed(2)) || null,
      elevation_gain_m: elevation.gain,
      elevation_loss_m: elevation.loss,
      min_elevation_m: elevation.min,
      max_elevation_m: elevation.max,
      route_points: pointsRef.current,
      elevation_profile: elevationProfile,
      splits: detailedSplits,
      pace_zones: paceZones,
      pace_reference_sec_km: referencePace,
      source: 'gps_web',
      status: 'concluida'
    };

    const { data: saved, error } = await supabase.from('corridas').insert([payload]).select('*').single();
    if (error || !saved) {
      console.error(error);
      setStatusMsg('A corrida terminou, mas houve erro ao salvar no histórico.');
      return;
    }

    const lista = [saved, ...atividades];
    setAtividades(lista);
    await avaliarConquistas(saved, lista);
    setAtividadeSelecionada(saved);
    setStatusMsg('Corrida salva com sucesso!');
  };

  const carregarImagemCanvas = (src) => new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

  const desenharLogoNoCanvas = async (ctx, canvasWidth, y, maxWidth = 260, maxHeight = 220) => {
    const logo = await carregarImagemCanvas(logoCorpoMovimento);
    if (!logo) {
      ctx.fillStyle = '#D4AF37';
      ctx.font = 'italic bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Corpo em Movimento', canvasWidth / 2, y + 55);
      return;
    }
    const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    ctx.drawImage(logo, (canvasWidth - w) / 2, y, w, h);
  };

  const criarCardBlob = async (atividade) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const gradient = ctx.createLinearGradient(0, 0, 0, 1350);
    gradient.addColorStop(0, '#102417');
    gradient.addColorStop(1, '#051109');
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,1080,1350);
    ctx.textAlign = 'center';

    await desenharLogoNoCanvas(ctx, 1080, 42, 250, 150);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 92px Arial';
    ctx.fillText(`${(Number(atividade.distance_m||0)/1000).toFixed(2)} km`, 540, 270);
    ctx.fillStyle = '#A0B3A6';
    ctx.font = '28px Arial';
    ctx.fillText('CORRIDA', 540, 320);

    const pts = Array.isArray(atividade.route_points) ? atividade.route_points : [];
    if (pts.length > 1) {
      const poly = routePolyline(pts, 860, 430, 35).split(' ').map(p => p.split(',').map(Number));
      ctx.save();
      ctx.translate(110, 375);
      ctx.strokeStyle = '#FC4C02';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      poly.forEach(([x,y], i) => i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y));
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(10,26,16,0.94)';
    ctx.roundRect(80, 870, 920, 300, 34);
    ctx.fill();
    const metrics = [
      [formatPace(atividade.avg_pace_sec_km), 'PACE / KM'],
      [formatDuration(atividade.duration_seconds), 'TEMPO'],
      [atividade.elevation_gain_m != null ? `${Math.round(Number(atividade.elevation_gain_m))} m` : '—', 'ELEVAÇÃO']
    ];
    metrics.forEach((m,i) => {
      const x = 230 + i*310;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 45px Arial';
      ctx.fillText(m[0], x, 1010);
      ctx.fillStyle = '#A0B3A6';
      ctx.font = '22px Arial';
      ctx.fillText(m[1], x, 1055);
    });
    ctx.fillStyle = '#D4AF37';
    ctx.font = '28px Arial';
    ctx.fillText('Cada passo conta.', 540, 1260);
    return await new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png', 0.92));
  };

  const criarStoryBlob = async () => {
    // O arquivo fica em /public/+1.png e, em produção, é servido pela raiz do site.
    const response = await fetch(imagemStoryInstagram, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Imagem do Story não encontrada (${response.status}).`);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('A imagem do Story está vazia.');
    }

    // Mantém o tipo correto para o compartilhamento nativo no celular.
    if (blob.type === 'image/png') return blob;
    const buffer = await blob.arrayBuffer();
    return new Blob([buffer], { type: 'image/png' });
  };

  const compartilharCorrida = async (atividade) => {
    const blob = await criarCardBlob(atividade);
    if (!blob) return;
    const file = new File([blob], 'corrida-corpo-em-movimento.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })) {
      try { await navigator.share({ title:'Minha corrida', text:'Minha corrida no Corpo em Movimento', files:[file] }); } catch(e) { if (e?.name !== 'AbortError') console.error(e); }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const compartilharStoriesInstagram = async (atividade) => {
    if (!atividade) return;
    setStatusMsg('Preparando Story da corrida...');
    try {
      const blob = await criarStoryBlob();
      if (!blob) throw new Error('Não foi possível gerar a imagem do Story.');
      const file = new File([blob], 'mais-um-treino-corpo-em-movimento.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Minha corrida — Corpo em Movimento',
          files: [file]
        });
        setStatusMsg('Story preparado. Escolha Instagram na tela de compartilhamento.');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setStatusMsg('Imagem do Story salva. Abra o Instagram e publique em Seu story.');
      }
    } catch (e) {
      if (e?.name === 'AbortError') {
        setStatusMsg('Compartilhamento cancelado.');
      } else {
        console.error(e);
        setStatusMsg('Não foi possível preparar o Story do Instagram.');
      }
    } finally {
      setTimeout(() => setStatusMsg(''), 4500);
    }
  };

  const compartilharNoFeed = async (atividade) => {
    if (!atividade || sharingFeedId) return;
    setSharingFeedId(atividade.id);
    setStatusMsg('Preparando publicação no Feed...');
    try {
      const blob = await criarCardBlob(atividade);
      if (!blob) throw new Error('Não foi possível gerar o card.');
      const fileName = `${profile.id}-${Date.now()}-corrida.png`;
      const file = new File([blob], fileName, { type:'image/png' });
      const { error: uploadError } = await supabase.storage.from('feed_images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const imageUrl = supabase.storage.from('feed_images').getPublicUrl(fileName).data.publicUrl;
      const elev = atividade.elevation_gain_m != null ? ` • ${Math.round(Number(atividade.elevation_gain_m))} m de elevação` : '';
      const content = `🏃 ${(Number(atividade.distance_m||0)/1000).toFixed(2)} km • pace ${formatPace(atividade.avg_pace_sec_km)}/km • ${formatDuration(atividade.duration_seconds)}${elev}`;
      const { error: postError } = await supabase.from('feed_posts').insert([{ user_id: profile.id, content, image_url: imageUrl, tag:'Corrida' }]);
      if (postError) throw postError;
      await supabase.from('corridas').update({ shared_to_feed_at: new Date().toISOString() }).eq('id', atividade.id).eq('user_id', profile.id);
      const sharedAt = new Date().toISOString();
      setAtividades(prev => prev.map(a => a.id === atividade.id ? { ...a, shared_to_feed_at: sharedAt } : a));
      setAtividadeSelecionada(prev => prev?.id === atividade.id ? { ...prev, shared_to_feed_at: sharedAt } : prev);
      setStatusMsg('Corrida publicada no Feed!');
    } catch (e) {
      console.error(e);
      setStatusMsg('Não foi possível publicar a corrida no Feed.');
    } finally {
      setSharingFeedId(null);
    }
  };

  const inicioSemana = new Date();
  const day = inicioSemana.getDay();
  const diff = day === 0 ? 6 : day - 1;
  inicioSemana.setHours(0,0,0,0);
  inicioSemana.setDate(inicioSemana.getDate() - diff);
  const atividadesSemana = atividades.filter(a => new Date(a.started_at) >= inicioSemana);
  const kmSemana = atividadesSemana.reduce((acc,a) => acc + Number(a.distance_m||0),0)/1000;
  const tempoSemana = atividadesSemana.reduce((acc,a) => acc + Number(a.duration_seconds||0),0);
  const paceSemana = kmSemana > 0 ? tempoSemana/kmSemana : null;
  const maiorDistancia = atividades.length ? Math.max(...atividades.map(a => Number(a.distance_m||0))) : 0;
  const melhoresPaces = atividades.map(a => Number(a.avg_pace_sec_km)).filter(v => Number.isFinite(v)&&v>0);
  const melhorPace = melhoresPaces.length ? Math.min(...melhoresPaces) : null;
  const metaKm = Math.max(1, Number(meta.weekly_distance_km)||15);
  const metaRuns = Math.max(1, Number(meta.weekly_runs)||3);
  const pctKm = Math.min(100, Math.round((kmSemana/metaKm)*100));
  const pctRuns = Math.min(100, Math.round((atividadesSemana.length/metaRuns)*100));
  const liveZone = zoneForPace(Number(paceSecKm), getReferencePace());

  const zoneLabels = {
    Z1:['Recuperação','#6BAED6'],
    Z2:['Leve','#63BE7B'],
    Z3:['Moderado','#D4AF37'],
    Z4:['Ritmo','#FF8C42'],
    Z5:['Forte','#E95A5A']
  };

  const semanas = Array.from({ length:4 }, (_,idx) => {
    const end = new Date(); end.setHours(23,59,59,999); end.setDate(end.getDate()-idx*7);
    const start = new Date(end); start.setDate(start.getDate()-6); start.setHours(0,0,0,0);
    const km = atividades.filter(a => { const d = new Date(a.started_at); return d>=start&&d<=end; }).reduce((acc,a) => acc+Number(a.distance_m||0),0)/1000;
    return { label: idx===0?'Atual':`-${idx} sem`, km };
  }).reverse();
  const maxKmGrafico = Math.max(1,...semanas.map(s=>s.km));

  const renderZones = (atividade) => {
    const zones = Array.isArray(atividade?.pace_zones) ? atividade.pace_zones : [];
    const total = zones.reduce((s,z)=>s+Number(z.seconds||0),0);
    if (!total) return <p className="text-xs text-[#A0B3A6]">Zonas indisponíveis para esta atividade.</p>;
    return (
      <div className="space-y-2">
        {zones.map(z => {
          const [label,color] = zoneLabels[z.zone] || [z.zone,'#888'];
          const pct = Math.round((Number(z.seconds||0)/total)*100);
          return <div key={z.zone} className="grid grid-cols-[72px_1fr_48px] gap-2 items-center text-[10px]"><span>{z.zone} · {label}</span><div className="h-2 bg-[#051109] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:color}} /></div><span className="text-right text-[#A0B3A6]">{pct}%</span></div>;
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar pb-24 text-white pt-3">
      <div className="flex items-start justify-between gap-3">
        <div className="border-l-2 border-[#FC4C02] pl-3 py-1">
          <div className="flex items-center gap-2 text-[#FC4C02] mb-1"><Navigation size={17}/><span className="text-[10px] font-semibold tracking-[0.15em] uppercase">Corrida</span></div>
          <h2 className="text-white text-2xl font-bold">Corrida & Rotas</h2>
          <p className="text-[#A0B3A6] text-xs mt-1">GPS, mapa de ruas, elevação, splits, zonas e evolução.</p>
        </div>
      </div>

      {!tracking ? (
        <button onClick={iniciarCorrida} className="w-full bg-[#FC4C02] text-white rounded-2xl p-4 flex items-center justify-between shadow-lg active:scale-[0.98] transition-transform">
          <div className="text-left"><p className="font-bold text-lg">Iniciar corrida</p><p className="text-white/80 text-xs">Registrar percurso com GPS</p></div>
          <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center"><Play size={24} fill="currentColor"/></div>
        </button>
      ) : (
        <div className="bg-[#0A1A10] border border-[#FC4C02]/60 rounded-3xl p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between"><div><p className="text-[#FFB199] text-[10px] uppercase tracking-[0.16em] font-bold">Atividade em andamento</p><h3 className="text-xl font-bold">{paused?'Corrida pausada':'Correndo agora'}</h3></div><div className={`w-3 h-3 rounded-full ${paused?'bg-yellow-400':'bg-green-400 animate-pulse'}`}/></div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-[#051109] rounded-xl p-2"><p className="text-[8px] text-[#A0B3A6] uppercase">Distância</p><p className="text-lg font-bold">{(distanceM/1000).toFixed(2)}</p><p className="text-[8px] text-[#A0B3A6]">km</p></div>
            <div className="bg-[#051109] rounded-xl p-2"><p className="text-[8px] text-[#A0B3A6] uppercase">Pace</p><p className="text-lg font-bold">{formatPace(paceSecKm)}</p><p className="text-[8px] text-[#A0B3A6]">/km</p></div>
            <div className="bg-[#051109] rounded-xl p-2"><p className="text-[8px] text-[#A0B3A6] uppercase">Tempo</p><p className="text-lg font-bold">{formatDuration(elapsed)}</p></div>
            <div className="bg-[#051109] rounded-xl p-2"><p className="text-[8px] text-[#A0B3A6] uppercase">Zona</p><p className="text-lg font-bold text-[#FC4C02]">{liveZone||'—'}</p></div>
          </div>
          {routePoints.length ? <StreetRouteMap points={routePoints} heightClass="h-56" followLast /> : <div className="h-56 bg-[#051109] rounded-2xl border border-[#1A4026] flex items-center justify-center text-[#A0B3A6] text-xs">Aguardando posição GPS...</div>}
          <div className="flex items-center justify-between text-[9px] text-[#A0B3A6]"><span className="flex items-center gap-1"><MapPin size={11}/> GPS {gpsAccuracy?`±${gpsAccuracy} m`:'...'}</span><span>Zonas relativas ao seu ritmo de referência</span></div>
          {splits.length>0 && <div><p className="text-xs font-medium text-[#D4AF37] mb-2">Splits</p><div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">{splits.slice(-5).map((s,i)=><div key={`${s.km}-${i}`} className="min-w-[95px] bg-[#051109] border border-[#1A4026] rounded-xl p-2 text-center"><p className="text-[9px] text-[#A0B3A6]">{s.parcial?'PARCIAL':`KM ${s.km}`}</p><p className="font-bold text-sm">{formatPace(s.pace_sec_km)}</p><p className="text-[8px] text-[#6F8174]">{s.distance_km?.toFixed?.(2)||'1.00'} km</p></div>)}</div></div>}
          <div className="grid grid-cols-2 gap-3"><button onClick={alternarPausa} className="bg-[#1A3020] border border-[#D4AF37]/40 text-[#D4AF37] py-3 rounded-xl font-bold flex items-center justify-center gap-2">{paused?<><Play size={18}/>Retomar</>:<><Pause size={18}/>Pausar</>}</button><button onClick={finalizarCorrida} className="bg-red-950/50 border border-red-700/60 text-red-300 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Square size={16} fill="currentColor"/>Finalizar</button></div>
        </div>
      )}

      {statusMsg && <div className="text-center text-[10px] text-[#A0B3A6] -mt-2">{statusMsg}</div>}

      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between"><div><h4 className="font-semibold">Meta semanal</h4><p className="text-[10px] text-[#A0B3A6]">Construa consistência, não só recordes.</p></div><button onClick={()=>setEditingMeta(v=>!v)} className="text-[10px] px-3 py-1.5 rounded-full border border-[#D4AF37]/40 text-[#D4AF37]">{editingMeta?'Cancelar':'Editar meta'}</button></div>
        {editingMeta ? <div className="grid grid-cols-3 gap-2"><label className="text-[9px] text-[#A0B3A6]">Km/sem<input type="number" min="1" max="300" value={metaDraft.weekly_distance_km} onChange={e=>setMetaDraft({...metaDraft,weekly_distance_km:e.target.value})} className="mt-1 w-full bg-[#051109] border border-[#1A4026] rounded-lg p-2 text-white"/></label><label className="text-[9px] text-[#A0B3A6]">Corridas<input type="number" min="1" max="14" value={metaDraft.weekly_runs} onChange={e=>setMetaDraft({...metaDraft,weekly_runs:e.target.value})} className="mt-1 w-full bg-[#051109] border border-[#1A4026] rounded-lg p-2 text-white"/></label><label className="text-[9px] text-[#A0B3A6]">Ritmo ref.<input type="text" placeholder="6:30" value={metaDraft.reference_pace} onChange={e=>setMetaDraft({...metaDraft,reference_pace:e.target.value})} className="mt-1 w-full bg-[#051109] border border-[#1A4026] rounded-lg p-2 text-white"/></label><button onClick={salvarMeta} className="col-span-3 bg-[#D4AF37] text-[#051109] rounded-xl py-2 font-bold text-xs">Salvar meta</button></div> : <><div><div className="flex justify-between text-xs mb-1"><span>{kmSemana.toFixed(1)} / {metaKm.toFixed(1)} km</span><span>{pctKm}%</span></div><div className="h-2 bg-[#051109] rounded-full overflow-hidden"><div className="h-full bg-[#FC4C02] rounded-full" style={{width:`${pctKm}%`}}/></div></div><div><div className="flex justify-between text-xs mb-1"><span>{atividadesSemana.length} / {metaRuns} corridas</span><span>{pctRuns}%</span></div><div className="h-2 bg-[#051109] rounded-full overflow-hidden"><div className="h-full bg-[#D4AF37] rounded-full" style={{width:`${pctRuns}%`}}/></div></div></>}
      </div>

      <div className="grid grid-cols-3 gap-2"><div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-3"><p className="text-[9px] text-[#A0B3A6] uppercase">Esta semana</p><p className="text-xl font-bold mt-1">{kmSemana.toFixed(1)}<span className="text-[10px] font-normal text-[#A0B3A6]"> km</span></p></div><div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-3"><p className="text-[9px] text-[#A0B3A6] uppercase">Atividades</p><p className="text-xl font-bold mt-1">{atividadesSemana.length}</p></div><div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-3"><p className="text-[9px] text-[#A0B3A6] uppercase">Pace médio</p><p className="text-xl font-bold mt-1">{formatPace(paceSemana)}</p></div></div>

      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4"><div className="flex justify-between items-center mb-4"><div><h4 className="font-semibold">Volume de corrida</h4><p className="text-[10px] text-[#A0B3A6]">Últimas 4 semanas</p></div><TrendingUp size={20} className="text-[#D4AF37]"/></div><div className="h-28 flex items-end gap-3">{semanas.map((s,i)=><div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1"><span className="text-[9px] text-[#A0B3A6]">{s.km.toFixed(1)}</span><div className="w-full max-w-10 bg-[#FC4C02] rounded-t-lg min-h-[4px]" style={{height:`${Math.max(4,(s.km/maxKmGrafico)*82)}px`}}/><span className="text-[8px] text-[#6F8174]">{s.label}</span></div>)}</div></div>

      <div className="grid grid-cols-2 gap-3"><div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4"><Award className="text-[#D4AF37] mb-2" size={19}/><p className="text-[9px] uppercase text-[#A0B3A6]">Maior distância</p><p className="font-bold text-lg">{(maiorDistancia/1000).toFixed(2)} km</p></div><div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4"><Activity className="text-[#D4AF37] mb-2" size={19}/><p className="text-[9px] uppercase text-[#A0B3A6]">Melhor pace médio</p><p className="font-bold text-lg">{formatPace(melhorPace)} <span className="text-[9px] text-[#A0B3A6] font-normal">/km</span></p></div></div>

      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4"><div className="flex items-center justify-between mb-3"><div><h4 className="font-semibold">Conquistas</h4><p className="text-[10px] text-[#A0B3A6]">Marcos desbloqueados</p></div><Award size={20} className="text-[#D4AF37]"/></div>{conquistas.length?<div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">{conquistas.slice(0,10).map(c=><div key={c.id} className="min-w-[150px] bg-[#051109] border border-[#D4AF37]/25 rounded-xl p-3"><div className="w-8 h-8 rounded-full bg-[#D4AF37]/15 flex items-center justify-center mb-2"><Award size={16} className="text-[#D4AF37]"/></div><p className="text-xs font-bold">{c.title}</p><p className="text-[9px] text-[#A0B3A6] mt-1 leading-snug">{c.description}</p></div>)}</div>:<p className="text-xs text-[#A0B3A6]">Conclua sua primeira corrida para desbloquear a primeira conquista.</p>}</div>

      <div><div className="flex items-center justify-between mb-3"><div><h4 className="font-semibold text-lg">Atividades recentes</h4><p className="text-[10px] text-[#A0B3A6]">Toque em uma corrida para ver os detalhes.</p></div></div>{loadingAtividades?<div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-6 text-center text-[#A0B3A6] text-sm">Carregando atividades...</div>:atividades.length===0?<div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-6 text-center"><Navigation size={30} className="text-[#D4AF37] mx-auto mb-3"/><p className="font-medium">Sua primeira corrida aparecerá aqui.</p></div>:<div className="space-y-3">{atividades.slice(0,8).map(a=><div key={a.id} className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl overflow-hidden"><button onClick={()=>setAtividadeSelecionada(a)} className="w-full text-left"><div className="p-4 flex items-start justify-between"><div><div className="flex items-center gap-2"><Navigation size={16} className="text-[#FC4C02]"/><p className="font-bold">Corrida</p></div><p className="text-[10px] text-[#A0B3A6] mt-1">{new Date(a.started_at).toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'})} • {new Date(a.started_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</p></div><ChevronRight size={18} className="text-[#A0B3A6]"/></div><div className="grid grid-cols-4 gap-2 px-4 pb-4 text-center"><div><p className="text-[8px] text-[#A0B3A6] uppercase">Distância</p><p className="font-bold text-xs">{(Number(a.distance_m||0)/1000).toFixed(2)} km</p></div><div><p className="text-[8px] text-[#A0B3A6] uppercase">Pace</p><p className="font-bold text-xs">{formatPace(a.avg_pace_sec_km)}</p></div><div><p className="text-[8px] text-[#A0B3A6] uppercase">Tempo</p><p className="font-bold text-xs">{formatDuration(a.duration_seconds)}</p></div><div><p className="text-[8px] text-[#A0B3A6] uppercase">Elevação</p><p className="font-bold text-xs">{a.elevation_gain_m!=null?`${Math.round(Number(a.elevation_gain_m))} m`:'—'}</p></div></div></button><div className="border-t border-[#1A4026] p-3 grid grid-cols-3 gap-2"><button onClick={()=>compartilharStoriesInstagram(a)} className="rounded-xl py-2 text-[10px] text-white font-semibold flex items-center justify-center gap-1 bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] active:scale-95"><InstagramStoryIcon size={14}/>Stories</button><button onClick={()=>compartilharCorrida(a)} className="border border-[#1A4026] rounded-xl py-2 text-[10px] text-[#D4AF37] flex items-center justify-center gap-1"><Share2 size={14}/>Compartilhar</button><button onClick={()=>compartilharNoFeed(a)} disabled={!!sharingFeedId || !!a.shared_to_feed_at} className="bg-[#1A3020] border border-[#D4AF37]/30 rounded-xl py-2 text-[10px] text-[#D4AF37] disabled:opacity-50">{a.shared_to_feed_at?'No Feed':sharingFeedId===a.id?'Publicando...':'Feed'}</button></div></div>)}</div>}</div>

      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 flex gap-3 items-start"><Clock size={20} className="text-[#D4AF37] shrink-0 mt-0.5"/><div><p className="text-xs font-medium">Sobre o rastreamento</p><p className="text-[10px] text-[#A0B3A6] mt-1 leading-relaxed">O GPS funciona melhor ao ar livre, com localização precisa permitida. O mapa usa OpenStreetMap. A elevação é calculada localmente com a altitude fornecida pelo GPS, quando o aparelho disponibiliza esse dado. Em navegadores móveis, bloquear a tela pode interromper o rastreamento.</p></div></div>

      {atividadeSelecionada && <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"><div className="w-full max-w-lg max-h-[92vh] overflow-y-auto custom-scrollbar bg-[#07140C] border border-[#1A4026] rounded-t-3xl sm:rounded-3xl p-5 space-y-5"><div className="flex items-start justify-between"><div><p className="text-[#FC4C02] text-[10px] uppercase font-bold tracking-wider">Detalhes da corrida</p><h3 className="text-2xl font-bold">{(Number(atividadeSelecionada.distance_m||0)/1000).toFixed(2)} km</h3><p className="text-xs text-[#A0B3A6]">{new Date(atividadeSelecionada.started_at).toLocaleString('pt-BR')}</p></div><button onClick={()=>setAtividadeSelecionada(null)} className="w-9 h-9 rounded-full bg-[#0A1A10] border border-[#1A4026] flex items-center justify-center"><X size={18}/></button></div>{Array.isArray(atividadeSelecionada.route_points)&&atividadeSelecionada.route_points.length?<StreetRouteMap points={atividadeSelecionada.route_points} heightClass="h-64"/>:null}<div className="grid grid-cols-4 gap-2 text-center"><div className="bg-[#0A1A10] rounded-xl p-2"><p className="text-[8px] text-[#A0B3A6]">PACE</p><p className="font-bold text-sm">{formatPace(atividadeSelecionada.avg_pace_sec_km)}</p></div><div className="bg-[#0A1A10] rounded-xl p-2"><p className="text-[8px] text-[#A0B3A6]">TEMPO</p><p className="font-bold text-sm">{formatDuration(atividadeSelecionada.duration_seconds)}</p></div><div className="bg-[#0A1A10] rounded-xl p-2"><p className="text-[8px] text-[#A0B3A6]">GANHO</p><p className="font-bold text-sm">{atividadeSelecionada.elevation_gain_m!=null?`${Math.round(Number(atividadeSelecionada.elevation_gain_m))} m`:'—'}</p></div><div className="bg-[#0A1A10] rounded-xl p-2"><p className="text-[8px] text-[#A0B3A6]">MÁX.</p><p className="font-bold text-sm">{atividadeSelecionada.max_elevation_m!=null?`${Math.round(Number(atividadeSelecionada.max_elevation_m))} m`:'—'}</p></div></div><div><h4 className="font-semibold mb-3">Splits detalhados</h4><div className="space-y-2">{Array.isArray(atividadeSelecionada.splits)&&atividadeSelecionada.splits.length?atividadeSelecionada.splits.map((s,i)=><div key={i} className="grid grid-cols-[60px_1fr_80px_70px] items-center bg-[#0A1A10] rounded-xl px-3 py-2 text-xs"><span className="font-bold">{s.parcial?'Final':`KM ${s.km}`}</span><span className="text-[#A0B3A6]">{Number(s.distance_km||1).toFixed(2)} km</span><span className="font-bold">{formatPace(s.pace_sec_km)}/km</span><span className="text-right text-[#D4AF37]">{s.elev_gain_m!=null?`+${Math.round(Number(s.elev_gain_m))} m`:'—'}</span></div>):<p className="text-xs text-[#A0B3A6]">Sem splits disponíveis.</p>}</div></div><div><h4 className="font-semibold mb-3">Zonas de ritmo</h4>{renderZones(atividadeSelecionada)}<p className="text-[9px] text-[#6F8174] mt-2">As zonas são relativas ao ritmo de referência configurado no app e não representam zonas fisiológicas ou cardíacas.</p></div><div className="grid grid-cols-3 gap-2"><button onClick={()=>compartilharStoriesInstagram(atividadeSelecionada)} className="rounded-xl py-3 text-[11px] text-white font-bold flex items-center justify-center gap-1 bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] active:scale-95"><InstagramStoryIcon size={15}/>Stories</button><button onClick={()=>compartilharCorrida(atividadeSelecionada)} className="border border-[#1A4026] rounded-xl py-3 text-[11px] text-[#D4AF37] flex items-center justify-center gap-1"><Share2 size={15}/>Compartilhar</button><button onClick={()=>compartilharNoFeed(atividadeSelecionada)} disabled={!!sharingFeedId || !!atividadeSelecionada.shared_to_feed_at} className="bg-[#D4AF37] text-[#051109] rounded-xl py-3 text-[11px] font-bold disabled:opacity-50">{atividadeSelecionada.shared_to_feed_at?'No Feed':'Feed'}</button></div></div></div>}
    </div>
  );
};


const Perfil = () => {
  const { profile, handleLogout, setProfile, setAdminView } = useApp();
  const [userData, setUserData] = useState({
    nome: profile?.nome || '',
    phone: profile?.phone || '',
    cpf: profile?.cpf || '',
    data_nascimento: profile?.data_nascimento || '',
    cidade_estado: profile?.cidade_estado || '',
    altura: profile?.altura || '',
    peso_atual: profile?.peso_atual || ''
  });
  const [statusMsg, setStatusMsg] = useState('');

  const handleSave = async () => {
    setStatusMsg('Salvando...');
    const { error } = await supabase.from('profiles').update(userData).eq('id', profile.id);
    if (error) {
      setStatusMsg('Erro ao salvar!');
    } else {
      setProfile({ ...profile, ...userData });
      setStatusMsg('Salvo com sucesso!');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatusMsg('Enviando foto...');
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);

    if (uploadError) {
      setStatusMsg('Erro ao enviar foto!');
      setTimeout(() => setStatusMsg(''), 3000);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const { error: updateError } = await supabase.from('profiles').update({ foto_url: publicUrl }).eq('id', profile.id);

    if (updateError) {
      setStatusMsg('Erro ao salvar foto no perfil!');
    } else {
      setProfile({ ...profile, foto_url: publicUrl });
      setStatusMsg('Foto atualizada!');
    }
    setTimeout(() => setStatusMsg(''), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-24 text-white">
      <div className="flex flex-col items-center mb-6 mt-4">
        <label className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#D4AF37] mb-4 shadow-[0_0_15px_rgba(212,175,55,0.3)] relative group cursor-pointer block">
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          {profile?.foto_url ? (
            <img src={profile.foto_url} alt="Perfil" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37]"><User size={48} strokeWidth={1} /></div>
          )}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={24} className="text-white"/></div>
        </label>
        <h2 className="text-xl font-bold">{profile?.nome || 'Usuário'}</h2>
        <p className="text-[#A0B3A6] text-sm">{profile?.email || ''}</p>
        <span className="mt-2 bg-[#D4AF37]/20 text-[#D4AF37] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">{getUserRole(profile) === 'admin' ? 'Administrador' : getUserRole(profile) === 'professor' ? 'Professor' : 'Aluno'}</span>
      </div>

      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-4">
        <div className="flex justify-between items-center border-b border-[#1A4026] pb-2">
          <h4 className="text-[#D4AF37] font-medium flex items-center gap-2">Dados Pessoais <Edit2 size={14}/></h4>
          {statusMsg && <span className="text-[#D4AF37] text-xs font-medium">{statusMsg}</span>}
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Nome</label>
            <input type="text" value={userData.nome} onChange={e => setUserData({...userData, nome: e.target.value})} placeholder="Ex: João da Silva" className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Telefone</label>
            <input type="tel" value={userData.phone} onChange={e => setUserData({...userData, phone: e.target.value})} placeholder="Ex: (11) 99999-9999" className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">CPF</label>
              <input type="text" value={userData.cpf} onChange={e => setUserData({...userData, cpf: e.target.value})} placeholder="Ex: 000.000.000-00" className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Nascimento</label>
              <input type="date" value={userData.data_nascimento} onChange={e => setUserData({...userData, data_nascimento: e.target.value})} className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" style={{ colorScheme: 'dark' }} />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Cidade e Estado</label>
            <input type="text" value={userData.cidade_estado} onChange={e => setUserData({...userData, cidade_estado: e.target.value})} placeholder="Ex: São Paulo, SP" className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Altura (m)</label>
              <input type="number" step="0.01" value={userData.altura} onChange={e => setUserData({...userData, altura: e.target.value})} placeholder="Ex: 1.75" className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Peso Atual (kg)</label>
              <input type="number" step="0.1" value={userData.peso_atual} onChange={e => setUserData({...userData, peso_atual: e.target.value})} placeholder="Ex: 75.5" className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" />
            </div>
          </div>
        </div>
        <button onClick={handleSave} className="w-full bg-[#1A3020] text-[#D4AF37] border border-[#D4AF37]/30 py-2 rounded-xl mt-2 font-medium flex items-center justify-center gap-2 active:scale-95"><Save size={18}/> Salvar Alterações</button>
      </div>

      <div className="space-y-2">
        {hasStaffAccess(profile) && (
          <button onClick={() => setAdminView(true)} className="w-full bg-[#1A3020] border border-[#D4AF37] rounded-xl p-4 flex items-center justify-between transition-all active:scale-[0.98]">
            <div className="flex items-center gap-3"><ShieldCheck className="text-[#D4AF37]" size={20} /><span className="text-[#D4AF37] font-medium">Acessar Área Administrativa</span></div><ChevronRight className="text-[#D4AF37] opacity-80" size={18} />
          </button>
        )}
        <button className="w-full bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex items-center justify-between transition-all active:scale-[0.98] hover:border-[#2A5036]"><div className="flex items-center gap-3"><Settings className="text-[#D4AF37]" size={20} /><span>Configurações do App</span></div><ChevronRight className="text-[#D4AF37] opacity-80" size={18} /></button>
        <button onClick={handleLogout} className="w-full mt-4 bg-transparent border border-red-900/50 rounded-xl p-4 flex items-center justify-center gap-2 text-red-500 transition-all active:scale-[0.98] hover:bg-red-900/10"><LogOut size={20} /><span>Sair da Conta</span></button>
      </div>
    </div>
  );
};

const Notificacoes = () => {
  const { profile, setNotifCount, setActiveTab } = useApp();
  const [notificacoes, setNotificacoes] = useState([]);

  useEffect(() => {
    loadNotificacoes();
  }, []);

  const loadNotificacoes = async () => {
    const { data } = await supabase.from('notificacoes').select('*').eq('user_id', profile.id);
    if (data) {
      const sorted = data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setNotificacoes(sorted);
      setNotifCount(sorted.filter(n => !n.lida).length);
    }
  };

  const marcarComoLida = async (id) => {
    const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
    if (!error) loadNotificacoes();
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar pb-24 text-white pt-4">
      <button onClick={() => setActiveTab('inicio')} className="flex items-center text-[#D4AF37] mb-4 hover:opacity-80 transition-opacity">
        <ChevronLeft size={20} /><span>Voltar</span>
      </button>
      <h2 className="text-2xl font-bold text-[#D4AF37] playfair italic mb-4">Suas Notificações</h2>
      
      {notificacoes.length === 0 ? (
        <p className="text-[#A0B3A6] text-sm">Nenhuma notificação no momento.</p>
      ) : (
        notificacoes.map(n => (
          <div key={n.id} className={`bg-[#0A1A10] border ${n.lida ? 'border-[#1A4026]' : 'border-[#D4AF37]'} rounded-xl p-4 flex flex-col gap-2 relative`}>
            {!n.lida && <span className="absolute top-3 right-3 w-2 h-2 bg-[#D4AF37] rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]"></span>}
            <p className="text-sm text-white">{n.mensagem}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] text-[#A0B3A6]">
                {n.created_at ? new Date(n.created_at).toLocaleDateString('pt-BR') : ''}
              </span>
              {!n.lida && (
                <button onClick={() => marcarComoLida(n.id)} className="text-[#D4AF37] text-[10px] uppercase font-bold tracking-wider active:scale-95">Marcar como lida</button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const calcularDiasDesde = (valor) => {
  if (!valor) return null;
  const data = new Date(String(valor).length <= 10 ? `${valor}T12:00:00` : valor);
  if (Number.isNaN(data.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - data.getTime()) / 86400000));
};

const mediaNumerica = (lista) => {
  const validos = lista.map(Number).filter(v => Number.isFinite(v));
  if (!validos.length) return null;
  return validos.reduce((a, b) => a + b, 0) / validos.length;
};

const formatarNumero = (valor, casas = 0) => {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
};

const formatarDataHora = (valor) => {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleDateString('pt-BR') + ' • ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const StaffMetricCard = ({ titulo, valor, detalhe }) => (
  <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-3 min-h-[92px] flex flex-col justify-between">
    <p className="text-[9px] text-[#A0B3A6] uppercase tracking-wider">{titulo}</p>
    <p className="text-xl font-bold text-[#D4AF37] mt-1">{valor}</p>
    {detalhe && <p className="text-[9px] text-[#A0B3A6] mt-1 leading-snug">{detalhe}</p>}
  </div>
);

const AdminPanel = ({ onExitAdmin }) => {
  const { profile } = useApp();
  const [adminTab, setAdminTab] = useState('evolucao');
  const [gestaoView, setGestaoView] = useState('menu');
  const [alunos, setAlunos] = useState([]);
  const [execucoesAcademia, setExecucoesAcademia] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [mensagemStatus, setMensagemStatus] = useState('');
  const [dossieAluno, setDossieAluno] = useState(null);
  const [loadingDossie, setLoadingDossie] = useState(false);
  const [historicoFiltroDias, setHistoricoFiltroDias] = useState(30);
  const [historicoExpandidoId, setHistoricoExpandidoId] = useState(null);
  const [ranking, setRanking] = useState([]);

  const [ragAlunoId, setRagAlunoId] = useState('');
  const [ragInstrucoes, setRagInstrucoes] = useState('');
  const [ragGerando, setRagGerando] = useState(false);
  const [ragTreino, setRagTreino] = useState(null);
  const [ragPlanoId, setRagPlanoId] = useState(null);
  const [ragStatus, setRagStatus] = useState('');
  const [ragResumoAluno, setRagResumoAluno] = useState(null);
  const [ragResumoLoading, setRagResumoLoading] = useState(false);
  const [ragRascunhoLoading, setRagRascunhoLoading] = useState(false);
  const [ragEditando, setRagEditando] = useState(false);
  const [ragTreinoEditavel, setRagTreinoEditavel] = useState(null);
  const [ragSalvandoEdicao, setRagSalvandoEdicao] = useState(false);

  const calcularIdade = (dataNasc) => {
    if (!dataNasc) return 'N/A';
    const hoje = new Date();
    const nasc = new Date(`${String(dataNasc).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(nasc.getTime())) return 'N/A';
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  };

  const montarDossie = async (alunoId) => {
    const { data: onboarding } = await supabase.from('onboarding_respostas').select('*').eq('user_id', alunoId).single();
    const { data: progresso } = await supabase.from('progresso_mensal').select('*').eq('user_id', alunoId);
    const { data: planos } = await supabase.from('planos_treino').select('*').eq('user_id', alunoId);
    const { data: execucoes } = await supabase.from('execucoes_treino').select('*').eq('user_id', alunoId);
    const { data: exercicios } = await supabase.from('execucoes_exercicios').select('*').eq('user_id', alunoId);
    const { data: series } = await supabase.from('execucoes_series').select('*').eq('user_id', alunoId);

    const progressoOrdenado = [...(progresso || [])].sort((a, b) => String(a.mes).localeCompare(String(b.mes)));
    const execucoesOrdenadas = [...(execucoes || [])].sort((a, b) => {
      const da = new Date(a.concluido_em || a.iniciado_em || a.created_at || 0).getTime();
      const db = new Date(b.concluido_em || b.iniciado_em || b.created_at || 0).getTime();
      return db - da;
    });
    const concluidas = execucoesOrdenadas.filter(e => e.status === 'concluido');
    const hojeMs = Date.now();
    const ultimos30 = concluidas.filter(e => hojeMs - new Date(e.concluido_em || e.iniciado_em || e.created_at).getTime() <= 30 * 86400000);
    const ultimos7 = concluidas.filter(e => hojeMs - new Date(e.concluido_em || e.iniciado_em || e.created_at).getTime() <= 7 * 86400000);
    const ultimaExecucao = concluidas[0] || null;

    const planoAtual = [...(planos || [])]
      .filter(p => p.status === 'publicado')
      .sort((a, b) => new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0))[0] || null;

    const exerciciosPorExecucao = {};
    for (const ex of (exercicios || [])) {
      if (!exerciciosPorExecucao[ex.execucao_treino_id]) exerciciosPorExecucao[ex.execucao_treino_id] = [];
      exerciciosPorExecucao[ex.execucao_treino_id].push(ex);
    }
    Object.values(exerciciosPorExecucao).forEach(lista => lista.sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)));

    const seriesPorExercicio = {};
    for (const serie of (series || [])) {
      if (!seriesPorExercicio[serie.execucao_exercicio_id]) seriesPorExercicio[serie.execucao_exercicio_id] = [];
      seriesPorExercicio[serie.execucao_exercicio_id].push(serie);
    }
    Object.values(seriesPorExercicio).forEach(lista => lista.sort((a, b) => Number(a.numero_serie || 0) - Number(b.numero_serie || 0)));

    const execucaoPorId = Object.fromEntries(execucoesOrdenadas.map(e => [e.id, e]));
    const exerciciosMap = {};
    for (const ex of (exercicios || [])) {
      const execucao = execucaoPorId[ex.execucao_treino_id];
      if (!execucao || execucao.status !== 'concluido') continue;
      const listaSeries = (seriesPorExercicio[ex.id] || []).filter(s => s.concluida);
      if (!listaSeries.length) continue;
      const key = ex.exercicio_key || ex.nome_exercicio;
      if (!exerciciosMap[key]) exerciciosMap[key] = { nome: ex.nome_exercicio, sessoes: [] };
      const cargas = listaSeries.map(s => Number(s.carga_kg)).filter(Number.isFinite);
      const reps = listaSeries.map(s => Number(s.repeticoes)).filter(Number.isFinite);
      exerciciosMap[key].sessoes.push({
        data: execucao.concluido_em || execucao.iniciado_em || execucao.created_at,
        cargaMax: cargas.length ? Math.max(...cargas) : null,
        repsTotal: reps.reduce((a, b) => a + b, 0),
        series: listaSeries.length,
        volume: listaSeries.reduce((acc, s) => {
          const c = Number(s.carga_kg);
          const r = Number(s.repeticoes);
          return acc + (Number.isFinite(c) && Number.isFinite(r) ? c * r : 0);
        }, 0)
      });
    }

    const evolucaoExercicios = Object.values(exerciciosMap).map(item => {
      const sessoes = item.sessoes.sort((a, b) => new Date(b.data) - new Date(a.data));
      const atual = sessoes[0] || null;
      const anterior = sessoes[1] || null;
      return {
        nome: item.nome,
        atual,
        anterior,
        deltaCarga: atual?.cargaMax != null && anterior?.cargaMax != null ? atual.cargaMax - anterior.cargaMax : null,
        deltaVolume: atual?.volume != null && anterior?.volume != null ? atual.volume - anterior.volume : null
      };
    }).sort((a, b) => new Date(b.atual?.data || 0) - new Date(a.atual?.data || 0));

    const inicioFisico = progressoOrdenado[0] || null;
    const atualFisico = progressoOrdenado[progressoOrdenado.length - 1] || null;
    const pesoDelta = inicioFisico?.peso != null && atualFisico?.peso != null ? Number(atualFisico.peso) - Number(inicioFisico.peso) : null;
    const cinturaDelta = inicioFisico?.cintura != null && atualFisico?.cintura != null ? Number(atualFisico.cintura) - Number(inicioFisico.cintura) : null;

    const metricas = {
      totalTreinos: concluidas.length,
      treinos7d: ultimos7.length,
      treinos30d: ultimos30.length,
      frequenciaSemanal30d: ultimos30.length / (30 / 7),
      ultimaData: ultimaExecucao?.concluido_em || ultimaExecucao?.data_execucao || null,
      diasSemTreino: calcularDiasDesde(ultimaExecucao?.concluido_em || ultimaExecucao?.data_execucao),
      esforcoMedio30d: mediaNumerica(ultimos30.map(e => e.percepcao_esforco)),
      duracaoMedia30d: mediaNumerica(ultimos30.map(e => e.duracao_minutos)),
      conclusaoMedia30d: mediaNumerica(ultimos30.map(e => e.percentual_conclusao)),
      pesoAtual: atualFisico?.peso ?? null,
      pesoDelta,
      cinturaDelta,
      seriesConcluidas30d: (series || []).filter(s => {
        if (!s.concluida) return false;
        const exec = execucaoPorId[s.execucao_treino_id];
        if (!exec || exec.status !== 'concluido') return false;
        const data = new Date(exec.concluido_em || exec.iniciado_em || exec.created_at || 0).getTime();
        return hojeMs - data <= 30 * 86400000;
      }).length
    };

    const alertas = [];
    if (metricas.diasSemTreino != null && metricas.diasSemTreino >= 14) alertas.push({ nivel: 'alto', texto: `${metricas.diasSemTreino} dias sem treino concluído.` });
    else if (metricas.diasSemTreino != null && metricas.diasSemTreino >= 7) alertas.push({ nivel: 'medio', texto: `${metricas.diasSemTreino} dias sem treino concluído.` });
    if (metricas.esforcoMedio30d != null && metricas.esforcoMedio30d >= 9) alertas.push({ nivel: 'medio', texto: `Esforço médio elevado (${formatarNumero(metricas.esforcoMedio30d, 1)}/10).` });
    if (metricas.conclusaoMedia30d != null && metricas.conclusaoMedia30d < 70) alertas.push({ nivel: 'medio', texto: `Conclusão média baixa (${formatarNumero(metricas.conclusaoMedia30d, 0)}%).` });
    const observacaoRecente = concluidas.find(e => String(e.observacoes_aluno || '').trim());
    if (observacaoRecente) alertas.push({ nivel: 'info', texto: `Observação recente: “${String(observacaoRecente.observacoes_aluno).slice(0, 100)}${String(observacaoRecente.observacoes_aluno).length > 100 ? '…' : ''}”` });

    return {
      onboarding: onboarding || null,
      progresso: progressoOrdenado,
      planos: planos || [],
      planoAtual,
      execucoes: execucoesOrdenadas,
      exercicios: exercicios || [],
      series: series || [],
      exerciciosPorExecucao,
      seriesPorExercicio,
      evolucaoExercicios,
      metricas,
      alertas
    };
  };

  const carregarBaseAdmin = async () => {
    const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*');

    if (profilesError) {
      console.error('Erro ao carregar alunos:', profilesError);
      setAlunos([]);
      if (gestaoView === 'treinos_rag') {
        setRagStatus(profilesError?.message || 'Não foi possível carregar os alunos.');
      }
      return;
    }

    // Considera aluno todo perfil que não seja da equipe. Isso também mantém
    // compatibilidade com cadastros antigos que ainda não possuem role preenchido.
    const alunosData = (profilesData || []).filter(p => {
      const role = getUserRole(p);
      return !['admin', 'professor'].includes(role);
    });

    setAlunos(alunosData);

    const { data: execucoes, error: execucoesError } = await supabase.from('execucoes_treino').select('*').eq('status', 'concluido');
    if (execucoesError) console.error('Erro ao carregar execuções da academia:', execucoesError);

    const todas = execucoes || [];
    setExecucoesAcademia(todas);
    const r = alunosData
      .map(a => ({ ...a, treinosCount: todas.filter(t => t.user_id === a.id).length }))
      .sort((a, b) => b.treinosCount - a.treinosCount);
    setRanking(r);
  };

  useEffect(() => {
    if (profile?.id) carregarBaseAdmin();
  }, [profile?.id, gestaoView]);

  useEffect(() => {
    if (!alunoSelecionado) {
      setDossieAluno(null);
      setHistoricoExpandidoId(null);
      return;
    }
    let ativo = true;
    setLoadingDossie(true);
    montarDossie(alunoSelecionado)
      .then(d => { if (ativo) setDossieAluno(d); })
      .catch(err => { console.error('Erro ao carregar histórico do aluno:', err); if (ativo) setDossieAluno(null); })
      .finally(() => { if (ativo) setLoadingDossie(false); });
    return () => { ativo = false; };
  }, [alunoSelecionado]);

  useEffect(() => {
    if (!ragAlunoId) {
      setRagResumoAluno(null);
      return;
    }
    let ativo = true;
    setRagResumoLoading(true);
    montarDossie(ragAlunoId)
      .then(d => { if (ativo) setRagResumoAluno(d); })
      .catch(() => { if (ativo) setRagResumoAluno(null); })
      .finally(() => { if (ativo) setRagResumoLoading(false); });
    return () => { ativo = false; };
  }, [ragAlunoId]);

  // Recupera o rascunho mais recente salvo no Supabase sempre que um aluno é selecionado.
  // Assim, atualizar a página não faz o treino em revisão desaparecer do painel.
  useEffect(() => {
    if (!ragAlunoId) {
      setRagTreino(null);
      setRagPlanoId(null);
      setRagRascunhoLoading(false);
      return;
    }

    let ativo = true;

    const carregarRascunhoSalvo = async () => {
      setRagRascunhoLoading(true);

      try {
        const { data, error } = await supabase
          .from('planos_treino')
          .select('*')
          .eq('user_id', ragAlunoId)
          .eq('status', 'rascunho');

        if (!ativo) return;
        if (error) throw error;

        const rascunhos = Array.isArray(data) ? data : (data ? [data] : []);
        rascunhos.sort((a, b) => {
          const dataA = new Date(a.updated_at || a.created_at || 0).getTime();
          const dataB = new Date(b.updated_at || b.created_at || 0).getTime();
          return dataB - dataA;
        });

        const maisRecente = rascunhos[0] || null;

        if (maisRecente?.treino_json) {
          setRagTreino(maisRecente.treino_json);
          setRagPlanoId(maisRecente.id);
          setRagEditando(false);
          setRagTreinoEditavel(null);
          setRagInstrucoes(maisRecente.observacoes_profissional || '');
          setRagStatus('Rascunho salvo recuperado. Revise ou publique quando estiver pronto.');
        } else {
          setRagTreino(null);
          setRagPlanoId(null);
          setRagEditando(false);
          setRagTreinoEditavel(null);
          setRagInstrucoes('');
          setRagStatus('');
        }
      } catch (error) {
        console.error('Erro ao carregar rascunho salvo:', error);
        if (ativo) {
          setRagTreino(null);
          setRagPlanoId(null);
          setRagStatus('Não foi possível carregar o rascunho salvo deste aluno.');
        }
      } finally {
        if (ativo) setRagRascunhoLoading(false);
      }
    };

    carregarRascunhoSalvo();
    return () => { ativo = false; };
  }, [ragAlunoId]);

  const handleEnviarMensagem = async () => {
    if (!alunoSelecionado || !mensagem.trim()) {
      setMensagemStatus('Selecione um aluno e digite a mensagem.');
      return;
    }
    setMensagemStatus('Enviando...');
    const { error } = await supabase.from('notificacoes').insert([{ user_id: alunoSelecionado, mensagem: mensagem.trim(), lida: false }]);
    if (!error) {
      setMensagemStatus('Mensagem enviada!');
      setMensagem('');
    } else setMensagemStatus('Erro ao enviar.');
    setTimeout(() => setMensagemStatus(''), 3000);
  };

  const montarHistoricoParaRag = (dossie) => {
    if (!dossie) return null;
    const recentes = dossie.execucoes.filter(e => e.status === 'concluido').slice(0, 12).map(e => {
      const exs = dossie.exerciciosPorExecucao[e.id] || [];
      return {
        data: e.concluido_em || e.data_execucao,
        sessao_key: e.sessao_key,
        duracao_minutos: e.duracao_minutos,
        percepcao_esforco: e.percepcao_esforco,
        percentual_conclusao: e.percentual_conclusao,
        observacoes_aluno: e.observacoes_aluno,
        exercicios: exs.map(ex => ({
          nome: ex.nome_exercicio,
          series: (dossie.seriesPorExercicio[ex.id] || []).filter(s => s.concluida).map(s => ({
            numero: s.numero_serie,
            carga_kg: s.carga_kg,
            repeticoes: s.repeticoes,
            rpe: s.rpe
          }))
        }))
      };
    });
    return { metricas: dossie.metricas, sessoes_recentes: recentes };
  };

  const handleGerarTreinoRAG = async () => {
    const aluno = alunos.find(a => a.id === ragAlunoId);

    if (!aluno) {
      setRagStatus('Selecione um aluno para gerar o treino.');
      return;
    }

    setRagGerando(true);
    setRagStatus('Consultando a base de conhecimento e gerando o treino...');
    setRagTreino(null);
    setRagPlanoId(null);
    setRagEditando(false);
    setRagTreinoEditavel(null);

    try {
      const resumo =
        ragResumoAluno ||
        await montarDossie(aluno.id);

      const resultado = await gerarTreinoComRAG({
        aluno,
        onboarding: resumo?.onboarding || null,
        progresso: resumo?.progresso || [],
        historicoTreinos: montarHistoricoParaRag(resumo),
        instrucoesProfissional: ragInstrucoes
      });

      if (!resultado?.treino) {
        throw new Error(
          resultado?.motivo ||
          resultado?.mensagem ||
          'O RAG não retornou um treino válido.'
        );
      }

      if (!resultado?.plano_id) {
        throw new Error(
          'O treino foi gerado, mas o ID do rascunho não foi retornado pelo n8n.'
        );
      }

      // O rascunho já foi salvo pelo n8n.
      // O aplicativo NÃO salva novamente.
      setRagTreino(resultado.treino);
      setRagPlanoId(resultado.plano_id);

      setRagStatus(
        resultado.mensagem ||
        'Treino gerado e salvo como rascunho. Revise antes de publicar.'
      );

    } catch (error) {
      console.error('Erro RAG:', error);

      setRagStatus(
        error?.message ||
        'Erro ao gerar o treino.'
      );
    } finally {
      setRagGerando(false);
    }
  };

  const iniciarEdicaoTreinoRAG = () => {
    if (!ragTreino || !ragPlanoId) return;
    setRagTreinoEditavel(JSON.parse(JSON.stringify(ragTreino)));
    setRagEditando(true);
    setRagStatus('Modo de edição ativado. Salve as alterações antes de publicar.');
  };

  const cancelarEdicaoTreinoRAG = () => {
    setRagTreinoEditavel(null);
    setRagEditando(false);
    setRagStatus('Edição cancelada. O rascunho salvo foi mantido sem alterações.');
  };

  const atualizarCampoPlanoRAG = (campo, valor) => {
    setRagTreinoEditavel(prev => ({ ...(prev || {}), [campo]: valor }));
  };

  const atualizarCampoDiaRAG = (diaIndex, campo, valor) => {
    setRagTreinoEditavel(prev => {
      const proximo = JSON.parse(JSON.stringify(prev || {}));
      if (!Array.isArray(proximo.dias)) proximo.dias = [];
      if (!proximo.dias[diaIndex]) return prev;
      proximo.dias[diaIndex][campo] = valor;
      return proximo;
    });
  };

  const atualizarCampoExercicioRAG = (diaIndex, exIndex, campo, valor) => {
    setRagTreinoEditavel(prev => {
      const proximo = JSON.parse(JSON.stringify(prev || {}));
      const exercicios = proximo?.dias?.[diaIndex]?.exercicios;
      if (!Array.isArray(exercicios) || !exercicios[exIndex]) return prev;
      exercicios[exIndex][campo] = valor;
      return proximo;
    });
  };

  const adicionarExercicioRAG = (diaIndex) => {
    setRagTreinoEditavel(prev => {
      const proximo = JSON.parse(JSON.stringify(prev || {}));
      if (!Array.isArray(proximo?.dias?.[diaIndex]?.exercicios)) return prev;
      const numero = proximo.dias[diaIndex].exercicios.length + 1;
      proximo.dias[diaIndex].exercicios.push({
        id: `${proximo.dias[diaIndex].id || `D${diaIndex + 1}`}-E${numero}`,
        nome: '',
        series: 3,
        repeticoes: '8 a 12',
        descanso_seg: 90,
        carga_orientacao: '',
        observacoes: ''
      });
      return proximo;
    });
  };

  const removerExercicioRAG = (diaIndex, exIndex) => {
    setRagTreinoEditavel(prev => {
      const proximo = JSON.parse(JSON.stringify(prev || {}));
      const exercicios = proximo?.dias?.[diaIndex]?.exercicios;
      if (!Array.isArray(exercicios)) return prev;
      exercicios.splice(exIndex, 1);
      return proximo;
    });
  };

  const adicionarDiaRAG = () => {
    setRagTreinoEditavel(prev => {
      const proximo = JSON.parse(JSON.stringify(prev || {}));
      if (!Array.isArray(proximo.dias)) proximo.dias = [];
      const numero = proximo.dias.length + 1;
      proximo.dias.push({
        id: `DIA-${numero}`,
        titulo: `Treino ${numero}`,
        foco: '',
        duracao_min: 60,
        exercicios: []
      });
      return proximo;
    });
  };

  const removerDiaRAG = (diaIndex) => {
    setRagTreinoEditavel(prev => {
      const proximo = JSON.parse(JSON.stringify(prev || {}));
      if (!Array.isArray(proximo.dias)) return prev;
      proximo.dias.splice(diaIndex, 1);
      return proximo;
    });
  };

  const normalizarTreinoEditadoRAG = (treino) => {
    const numeroOuNulo = (valor) => {
      if (valor === '' || valor == null) return null;
      const n = Number(valor);
      return Number.isFinite(n) ? n : null;
    };

    return {
      ...treino,
      duracao_semanas: numeroOuNulo(treino?.duracao_semanas),
      frequencia_semanal: numeroOuNulo(treino?.frequencia_semanal),
      dias: (Array.isArray(treino?.dias) ? treino.dias : []).map((dia, diaIndex) => ({
        ...dia,
        id: dia.id || `DIA-${diaIndex + 1}`,
        duracao_min: numeroOuNulo(dia.duracao_min),
        exercicios: (Array.isArray(dia.exercicios) ? dia.exercicios : []).map((ex, exIndex) => ({
          ...ex,
          id: ex.id || `${dia.id || `DIA-${diaIndex + 1}`}-E${exIndex + 1}`,
          series: numeroOuNulo(ex.series),
          descanso_seg: numeroOuNulo(ex.descanso_seg)
        }))
      }))
    };
  };

  const salvarEdicaoTreinoRAG = async () => {
    if (!ragPlanoId || !ragTreinoEditavel) return;

    const dias = Array.isArray(ragTreinoEditavel.dias) ? ragTreinoEditavel.dias : [];
    if (dias.length === 0) {
      setRagStatus('O treino precisa ter pelo menos um dia antes de ser salvo.');
      return;
    }

    const exercicioSemNome = dias.some(dia => (dia.exercicios || []).some(ex => !String(ex.nome || '').trim()));
    if (exercicioSemNome) {
      setRagStatus('Preencha o nome de todos os exercícios antes de salvar.');
      return;
    }

    setRagSalvandoEdicao(true);
    setRagStatus('Salvando alterações do rascunho...');

    try {
      const treinoNormalizado = normalizarTreinoEditadoRAG(ragTreinoEditavel);
      const { error } = await supabase.from('planos_treino').update({
        treino_json: treinoNormalizado,
        objetivo: treinoNormalizado.objetivo || null,
        observacoes_profissional: ragInstrucoes || null,
        updated_at: new Date().toISOString()
      }).eq('id', ragPlanoId).eq('status', 'rascunho');

      if (error) throw error;

      setRagTreino(treinoNormalizado);
      setRagTreinoEditavel(null);
      setRagEditando(false);
      setRagStatus('Alterações salvas no rascunho. Revise e publique quando estiver pronto.');
    } catch (error) {
      console.error('Erro ao salvar edição do treino:', error);
      setRagStatus(error?.message || 'Não foi possível salvar as alterações do treino.');
    } finally {
      setRagSalvandoEdicao(false);
    }
  };

  const handlePublicarTreinoRAG = async () => {
    if (!ragPlanoId || !ragAlunoId) return;
    if (ragEditando) {
      setRagStatus('Salve ou cancele a edição antes de publicar.');
      return;
    }
    setRagStatus('Publicando treino...');
    const { data: publicados, error: loadError } = await supabase.from('planos_treino').select('*').eq('user_id', ragAlunoId).eq('status', 'publicado');
    if (loadError) {
      setRagStatus('Não foi possível verificar o plano atual do aluno.');
      return;
    }
    for (const planoPublicado of (publicados || [])) {
      if (planoPublicado.id !== ragPlanoId) {
        const { error: archiveError } = await supabase.from('planos_treino').update({ status: 'arquivado', updated_at: new Date().toISOString() }).eq('id', planoPublicado.id);
        if (archiveError) {
          setRagStatus('Não foi possível arquivar o plano anterior.');
          return;
        }
      }
    }
    const { error } = await supabase.from('planos_treino').update({
      status: 'publicado',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', ragPlanoId);

    if (error) {
      setRagStatus('Não foi possível publicar.');
      return;
    }

    setRagStatus('Treino publicado. O plano anterior foi arquivado automaticamente.');
    setRagTreino(null);
    setRagPlanoId(null);
    setRagEditando(false);
    setRagTreinoEditavel(null);

    // Atualiza o contexto do aluno para refletir imediatamente o novo plano publicado.
    try {
      const atualizado = await montarDossie(ragAlunoId);
      setRagResumoAluno(atualizado);
      if (alunoSelecionado === ragAlunoId) setDossieAluno(atualizado);
    } catch (refreshError) {
      console.error('Treino publicado, mas não foi possível atualizar o dossiê:', refreshError);
    }
  };

  const alunoObj = alunos.find(a => a.id === alunoSelecionado);
  const agora = Date.now();
  const treino7dUsuarios = new Set(execucoesAcademia.filter(e => agora - new Date(e.concluido_em || e.iniciado_em || e.created_at || 0).getTime() <= 7 * 86400000).map(e => e.user_id));
  const treino14dUsuarios = new Set(execucoesAcademia.filter(e => agora - new Date(e.concluido_em || e.iniciado_em || e.created_at || 0).getTime() <= 14 * 86400000).map(e => e.user_id));
  const exec30d = execucoesAcademia.filter(e => agora - new Date(e.concluido_em || e.iniciado_em || e.created_at || 0).getTime() <= 30 * 86400000);
  const alunosSem7d = alunos.filter(a => !treino7dUsuarios.has(a.id)).length;
  const alunosSem14d = alunos.filter(a => !treino14dUsuarios.has(a.id)).length;

  const semanas = Array.from({ length: 6 }).map((_, idx) => {
    const fim = new Date();
    fim.setHours(23, 59, 59, 999);
    fim.setDate(fim.getDate() - (5 - idx) * 7);
    const inicio = new Date(fim);
    inicio.setDate(inicio.getDate() - 6);
    inicio.setHours(0, 0, 0, 0);
    const total = execucoesAcademia.filter(e => {
      const d = new Date(e.concluido_em || e.iniciado_em || e.created_at || 0);
      return d >= inicio && d <= fim;
    }).length;
    return { label: `${inicio.getDate()}/${inicio.getMonth() + 1}`, total };
  });
  const maxSemana = Math.max(1, ...semanas.map(s => s.total));

  const execucoesFiltradas = (dossieAluno?.execucoes || []).filter(e => {
    if (e.status !== 'concluido') return false;
    if (historicoFiltroDias === 0) return true;
    const d = new Date(e.concluido_em || e.iniciado_em || e.created_at || 0).getTime();
    return agora - d <= historicoFiltroDias * 86400000;
  });

  const renderSeletorAluno = () => (
    <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
      <label className="text-xs text-[#A0B3A6] mb-2 block">Selecione o aluno</label>
      <select className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg focus:border-[#D4AF37] outline-none" value={alunoSelecionado} onChange={(e) => setAlunoSelecionado(e.target.value)}>
        <option value="">Selecione um aluno...</option>
        {alunos.map(a => <option key={a.id} value={a.id}>{a.nome || a.email}</option>)}
      </select>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col text-white z-10 w-full h-full relative overflow-hidden bg-[#051109]">
      <GlobalStyles />
      <div className="px-6 py-4 pt-[calc(1.5rem+env(safe-area-inset-top))] border-b border-[#1A4026] flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-[#D4AF37] playfair italic">{hasAdminAccess(profile) ? 'Área Administrativa' : 'Área do Professor'}</h2>
          <p className="text-[10px] text-[#A0B3A6]">Acompanhamento real dos alunos e preparação para o próximo treino</p>
        </div>
        <button onClick={onExitAdmin} className="w-10 h-10 rounded-full bg-[#1A3020] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] active:scale-95"><LogOut size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar pb-24">
        {adminTab === 'evolucao' && (
          <div className="space-y-5">
            <h3 className="text-xl font-medium border-l-2 border-[#D4AF37] pl-3">Visão 360º do aluno</h3>
            {renderSeletorAluno()}

            {loadingDossie && <div className="text-center text-[#A0B3A6] text-sm py-8">Carregando histórico real do aluno...</div>}

            {alunoObj && dossieAluno && !loadingDossie && (
              <>
                <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start gap-3 border-b border-[#1A4026] pb-3">
                    <div>
                      <h4 className="text-lg font-bold text-white">{alunoObj.nome || 'Aluno'}</h4>
                      <p className="text-[10px] text-[#A0B3A6]">{alunoObj.email}</p>
                    </div>
                    <span className="text-[9px] border border-[#D4AF37]/40 text-[#D4AF37] px-2 py-1 rounded-full">{dossieAluno.onboarding?.modalidade || 'Modalidade não informada'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-[#A0B3A6] block text-[9px] uppercase">Objetivo</span>{dossieAluno.onboarding?.objetivo || 'Não informado'}</div>
                    <div><span className="text-[#A0B3A6] block text-[9px] uppercase">Idade</span>{calcularIdade(alunoObj.data_nascimento)} anos</div>
                    <div><span className="text-[#A0B3A6] block text-[9px] uppercase">Nível</span>{dossieAluno.onboarding?.nivel_atividade || 'Não informado'}</div>
                    <div><span className="text-[#A0B3A6] block text-[9px] uppercase">Estrutura</span>{dossieAluno.onboarding?.estrutura || 'Não informada'}</div>
                    <div><span className="text-[#A0B3A6] block text-[9px] uppercase">Peso atual</span>{dossieAluno.metricas.pesoAtual != null ? `${formatarNumero(dossieAluno.metricas.pesoAtual, 1)} kg` : (alunoObj.peso_atual ? `${alunoObj.peso_atual} kg` : 'Não informado')}</div>
                    <div><span className="text-[#A0B3A6] block text-[9px] uppercase">Altura</span>{alunoObj.altura ? `${alunoObj.altura} m` : 'Não informada'}</div>
                  </div>
                  {Array.isArray(dossieAluno.onboarding?.disponibilidade) && dossieAluno.onboarding.disponibilidade.length > 0 && <p className="text-[10px] text-[#A0B3A6] pt-2 border-t border-[#1A4026]">Disponibilidade: <span className="text-white">{dossieAluno.onboarding.disponibilidade.join(', ')}</span></p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StaffMetricCard titulo="Treinos • 30 dias" valor={dossieAluno.metricas.treinos30d} detalhe={`${formatarNumero(dossieAluno.metricas.frequenciaSemanal30d, 1)} por semana`} />
                  <StaffMetricCard titulo="Último treino" valor={dossieAluno.metricas.diasSemTreino == null ? '—' : dossieAluno.metricas.diasSemTreino === 0 ? 'Hoje' : `${dossieAluno.metricas.diasSemTreino}d`} detalhe={dossieAluno.metricas.ultimaData ? formatarDataExecucao(String(dossieAluno.metricas.ultimaData).slice(0,10)) : 'Sem registro'} />
                  <StaffMetricCard titulo="Esforço médio" valor={dossieAluno.metricas.esforcoMedio30d == null ? '—' : `${formatarNumero(dossieAluno.metricas.esforcoMedio30d, 1)}/10`} detalhe="Percepção do aluno nos últimos 30 dias" />
                  <StaffMetricCard titulo="Conclusão média" valor={dossieAluno.metricas.conclusaoMedia30d == null ? '—' : `${formatarNumero(dossieAluno.metricas.conclusaoMedia30d, 0)}%`} detalhe={`${dossieAluno.metricas.seriesConcluidas30d} séries concluídas`} />
                </div>

                {dossieAluno.alertas.length > 0 && (
                  <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
                    <h4 className="text-[#D4AF37] font-medium mb-3">Pontos de atenção</h4>
                    <div className="space-y-2">
                      {dossieAluno.alertas.map((a, i) => (
                        <div key={i} className={`text-xs p-3 rounded-xl border ${a.nivel === 'alto' ? 'bg-red-950/30 border-red-500/40 text-red-300' : a.nivel === 'medio' ? 'bg-yellow-950/20 border-yellow-500/30 text-yellow-200' : 'bg-[#1A3020] border-[#1A4026] text-[#A0B3A6]'}`}>{a.texto}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div><h4 className="text-[#D4AF37] font-medium">Treino atual</h4><p className="text-[10px] text-[#A0B3A6]">Plano que está liberado para o aluno</p></div>
                    {dossieAluno.planoAtual && <span className="text-[9px] text-green-400 border border-green-500/30 px-2 py-1 rounded-full">PUBLICADO</span>}
                  </div>
                  {dossieAluno.planoAtual ? (
                    <div className="bg-[#051109] border border-[#1A4026] rounded-xl p-3">
                      <p className="font-bold text-sm">{dossieAluno.planoAtual.treino_json?.nome_plano || 'Treino personalizado'}</p>
                      <p className="text-[10px] text-[#A0B3A6] mt-1">{dossieAluno.planoAtual.objetivo || dossieAluno.planoAtual.treino_json?.objetivo || 'Objetivo não informado'}</p>
                      <p className="text-[9px] text-[#A0B3A6] mt-2">Publicado em {formatarDataHora(dossieAluno.planoAtual.published_at || dossieAluno.planoAtual.created_at)}</p>
                    </div>
                  ) : <p className="text-xs text-[#A0B3A6]">Nenhum treino publicado para este aluno.</p>}
                </div>

                <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
                  <h4 className="text-[#D4AF37] font-medium mb-3">Evolução física</h4>
                  {dossieAluno.progresso.length ? (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <StaffMetricCard titulo="Variação de peso" valor={dossieAluno.metricas.pesoDelta == null ? '—' : `${dossieAluno.metricas.pesoDelta > 0 ? '+' : ''}${formatarNumero(dossieAluno.metricas.pesoDelta, 1)} kg`} detalhe="Do primeiro ao último registro" />
                        <StaffMetricCard titulo="Variação de cintura" valor={dossieAluno.metricas.cinturaDelta == null ? '—' : `${dossieAluno.metricas.cinturaDelta > 0 ? '+' : ''}${formatarNumero(dossieAluno.metricas.cinturaDelta, 1)} cm`} detalhe="Do primeiro ao último registro" />
                      </div>
                      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                        {dossieAluno.progresso.map((p, i) => <div key={i} className="min-w-[105px] bg-[#051109] border border-[#1A4026] rounded-xl p-3"><p className="text-[9px] text-[#A0B3A6]">{p.mes}</p><p className="text-sm font-bold mt-1">{p.peso != null ? `${p.peso} kg` : '—'}</p><p className="text-[9px] text-[#A0B3A6] mt-1">Cintura: {p.cintura != null ? `${p.cintura} cm` : '—'}</p></div>)}
                      </div>
                    </>
                  ) : <p className="text-xs text-[#A0B3A6]">Nenhuma medida física registrada ainda.</p>}
                </div>

                <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-3"><div><h4 className="text-[#D4AF37] font-medium">Evolução de cargas</h4><p className="text-[10px] text-[#A0B3A6]">Última execução comparada à anterior</p></div><Dumbbell size={20} className="text-[#D4AF37]" /></div>
                  {dossieAluno.evolucaoExercicios.length ? (
                    <div className="space-y-2">
                      {dossieAluno.evolucaoExercicios.slice(0, 8).map((ex, i) => (
                        <div key={i} className="bg-[#051109] border border-[#1A4026] rounded-xl p-3 flex justify-between gap-3 items-center">
                          <div className="min-w-0"><p className="text-xs font-medium truncate">{ex.nome}</p><p className="text-[9px] text-[#A0B3A6]">{ex.atual?.series || 0} séries • {ex.atual?.repsTotal || 0} reps</p></div>
                          <div className="text-right shrink-0"><p className="text-sm font-bold text-[#D4AF37]">{ex.atual?.cargaMax != null ? `${formatarNumero(ex.atual.cargaMax, 1)} kg` : 'Sem carga'}</p>{ex.deltaCarga != null && <p className={`text-[9px] ${ex.deltaCarga > 0 ? 'text-green-400' : ex.deltaCarga < 0 ? 'text-yellow-300' : 'text-[#A0B3A6]'}`}>{ex.deltaCarga > 0 ? '+' : ''}{formatarNumero(ex.deltaCarga, 1)} kg vs. anterior</p>}</div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-[#A0B3A6]">Ainda não há séries concluídas suficientes para comparar cargas.</p>}
                </div>

                <div className="bg-[#1A3020] border border-[#D4AF37]/30 p-4 rounded-2xl">
                  <h4 className="text-sm font-medium text-[#D4AF37] mb-2">Mensagem para o aluno</h4>
                  <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} placeholder="Ex.: ótimo progresso esta semana. Vamos manter a frequência..." className="w-full bg-[#051109] border border-[#1A4026] text-white p-3 rounded-xl text-xs outline-none resize-none mb-2 custom-scrollbar" rows="3" />
                  <button onClick={handleEnviarMensagem} className="w-full bg-[#D4AF37] text-[#051109] font-bold py-2 rounded-xl text-xs active:scale-95">Enviar mensagem</button>
                  {mensagemStatus && <p className="text-[#D4AF37] text-[10px] text-center mt-2">{mensagemStatus}</p>}
                </div>
              </>
            )}
          </div>
        )}

        {adminTab === 'historico' && (
          <div className="space-y-5">
            <h3 className="text-xl font-medium border-l-2 border-[#D4AF37] pl-3">Histórico real de treinos</h3>
            {renderSeletorAluno()}
            {loadingDossie && <div className="text-center text-[#A0B3A6] text-sm py-8">Carregando sessões...</div>}
            {alunoObj && dossieAluno && !loadingDossie && (
              <>
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                  {[{d:30,l:'30 dias'},{d:60,l:'60 dias'},{d:90,l:'90 dias'},{d:0,l:'Tudo'}].map(f => <button key={f.d} onClick={() => setHistoricoFiltroDias(f.d)} className={`px-3 py-2 rounded-full text-[10px] whitespace-nowrap border ${historicoFiltroDias === f.d ? 'bg-[#D4AF37] text-[#051109] border-[#D4AF37] font-bold' : 'bg-[#0A1A10] text-[#A0B3A6] border-[#1A4026]'}`}>{f.l}</button>)}
                </div>

                {execucoesFiltradas.length === 0 ? <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-6 text-center text-[#A0B3A6] text-sm">Nenhum treino concluído nesse período.</div> : (
                  <div className="space-y-3">
                    {execucoesFiltradas.map(exec => {
                      const aberta = historicoExpandidoId === exec.id;
                      const exs = dossieAluno.exerciciosPorExecucao[exec.id] || [];
                      return (
                        <div key={exec.id} className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl overflow-hidden">
                          <button onClick={() => setHistoricoExpandidoId(aberta ? null : exec.id)} className="w-full p-4 text-left flex justify-between gap-3 items-center">
                            <div><p className="text-sm font-bold">{String(exec.sessao_key || 'Treino').replaceAll('-', ' ')}</p><p className="text-[10px] text-[#A0B3A6] mt-1">{formatarDataHora(exec.concluido_em || exec.iniciado_em || exec.created_at)}</p></div>
                            <div className="text-right"><p className="text-xs text-[#D4AF37] font-bold">{exec.percentual_conclusao != null ? `${Math.round(Number(exec.percentual_conclusao))}%` : 'Concluído'}</p><p className="text-[9px] text-[#A0B3A6]">{exec.duracao_minutos ? `${exec.duracao_minutos} min` : ''}{exec.percepcao_esforco ? ` • esforço ${exec.percepcao_esforco}/10` : ''}</p></div>
                          </button>
                          {aberta && (
                            <div className="px-4 pb-4 border-t border-[#1A4026] pt-3 space-y-3">
                              {exec.observacoes_aluno && <div className="bg-[#1A3020] border border-[#1A4026] rounded-xl p-3 text-xs"><span className="text-[#D4AF37] font-medium">Observação do aluno: </span>{exec.observacoes_aluno}</div>}
                              {exs.map(ex => {
                                const sets = dossieAluno.seriesPorExercicio[ex.id] || [];
                                return <div key={ex.id} className="bg-[#051109] border border-[#1A4026] rounded-xl p-3"><div className="flex justify-between items-center mb-2"><p className="text-xs font-bold text-[#D4AF37]">{ex.nome_exercicio}</p><p className="text-[9px] text-[#A0B3A6]">Planejado: {ex.series_planejadas} × {ex.repeticoes_planejadas || '—'}</p></div><div className="space-y-1">{sets.map(s => <div key={s.id} className="grid grid-cols-4 gap-1 text-[10px] bg-[#0A1A10] rounded-lg px-2 py-1.5"><span>S{s.numero_serie}</span><span>{s.carga_kg != null ? `${s.carga_kg} kg` : '—'}</span><span>{s.repeticoes != null ? `${s.repeticoes} reps` : s.duracao_segundos ? `${s.duracao_segundos}s` : '—'}</span><span className={s.concluida ? 'text-green-400 text-right' : 'text-[#A0B3A6] text-right'}>{s.concluida ? '✓' : '—'}</span></div>)}</div></div>;
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {adminTab === 'financeiro' && (
          <div className="space-y-6">
            <h3 className="text-xl font-medium border-l-2 border-[#D4AF37] pl-3">Gestão Financeira</h3>
            <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-6 text-center">
              <DollarSign className="text-[#D4AF37] mx-auto mb-3" size={28} />
              <h4 className="font-bold text-white">Financeiro ainda não integrado</h4>
              <p className="text-xs text-[#A0B3A6] mt-2 leading-relaxed">Para evitar números fictícios, o aplicativo não exibe receita ou inadimplência até a integração com a fonte financeira real da academia.</p>
            </div>
          </div>
        )}

        {adminTab === 'acompanhamento' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4 border-l-2 border-[#D4AF37] pl-3">
              <h3 className="text-xl font-medium">Acompanhamento e Gestão</h3>
              {gestaoView !== 'menu' && <button onClick={() => setGestaoView('menu')} className="text-[#D4AF37] text-xs flex items-center gap-1 bg-[#1A3020] px-3 py-1 rounded-full"><ChevronLeft size={14}/> Voltar</button>}
            </div>

            {gestaoView === 'menu' && (
              <div className="space-y-3">
                <button onClick={() => setGestaoView('desempenho')} className="w-full bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex justify-between items-center active:scale-95 transition-transform"><div className="text-left"><h4 className="font-medium">Desempenho dos Alunos</h4><p className="text-xs text-[#A0B3A6]">Ranking baseado em treinos realmente concluídos</p></div><Activity className="text-[#D4AF37]" size={20} /></button>
                <button onClick={() => { setAdminTab('evolucao'); setAlunoSelecionado(''); }} className="w-full bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex justify-between items-center active:scale-95 transition-transform"><div className="text-left"><h4 className="font-medium">Visão 360º do aluno</h4><p className="text-xs text-[#A0B3A6]">Frequência, cargas, medidas e pontos de atenção</p></div><User className="text-[#D4AF37]" size={20} /></button>
                <button onClick={() => setGestaoView('relatorios')} className="w-full bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex justify-between items-center active:scale-95 transition-transform"><div className="text-left"><h4 className="font-medium">Indicadores da Academia</h4><p className="text-xs text-[#A0B3A6]">Dados reais de frequência e atividade</p></div><TrendingUp className="text-[#D4AF37]" size={20} /></button>
                <button onClick={() => { setGestaoView('treinos_rag'); setRagTreino(null); setRagPlanoId(null); }} className="w-full bg-[#1A3020] border border-[#D4AF37]/50 rounded-xl p-4 flex justify-between items-center active:scale-95 transition-transform mt-6 shadow-[0_0_15px_rgba(212,175,55,0.1)]"><div className="text-left"><h4 className="font-medium text-[#D4AF37]">Treinos com IA (RAG)</h4><p className="text-xs text-[#A0B3A6]">Histórico real acompanha a geração do próximo treino</p></div><Target className="text-[#D4AF37]" size={20} /></button>
              </div>
            )}

            {gestaoView === 'treinos_rag' && (
              <div className="space-y-4">
                <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-4">
                  <div className="border-b border-[#1A4026] pb-3"><h4 className="text-[#D4AF37] font-medium flex items-center gap-2"><Target size={16}/> Gerar treino individual com IA</h4><p className="text-[#A0B3A6] text-[10px] mt-1">O próximo RAG receberá também frequência, esforço, últimas sessões, cargas e repetições registradas.</p></div>
                  <div>
                    <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Aluno</label>
                    <select value={ragAlunoId} onChange={e => { setRagAlunoId(e.target.value); setRagTreino(null); setRagPlanoId(null); setRagEditando(false); setRagTreinoEditavel(null); setRagStatus(''); }} className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none">
                      <option value="">{alunos.length ? 'Selecione...' : 'Nenhum aluno carregado'}</option>
                      {alunos.map(a => <option key={a.id} value={a.id}>{a.nome || a.email || `Aluno ${String(a.id).slice(0, 8)}`}</option>)}
                    </select>
                    <button type="button" onClick={carregarBaseAdmin} className="mt-2 text-[10px] text-[#D4AF37] underline underline-offset-2">Atualizar lista de alunos</button>
                  </div>

                  {ragResumoLoading && <p className="text-xs text-[#A0B3A6] text-center">Preparando histórico do aluno...</p>}
                  {ragResumoAluno && !ragResumoLoading && (
                    <div className="bg-[#051109] border border-[#D4AF37]/30 rounded-xl p-3">
                      <p className="text-[10px] text-[#D4AF37] uppercase tracking-wider mb-2">Contexto disponível para a IA</p>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div><span className="text-[#A0B3A6] block">Modalidade</span>{ragResumoAluno.onboarding?.modalidade || '—'}</div>
                        <div><span className="text-[#A0B3A6] block">Objetivo</span>{ragResumoAluno.onboarding?.objetivo || '—'}</div>
                        <div><span className="text-[#A0B3A6] block">Treinos 30d</span>{ragResumoAluno.metricas.treinos30d}</div>
                        <div><span className="text-[#A0B3A6] block">Esforço médio</span>{ragResumoAluno.metricas.esforcoMedio30d == null ? '—' : `${formatarNumero(ragResumoAluno.metricas.esforcoMedio30d,1)}/10`}</div>
                        <div><span className="text-[#A0B3A6] block">Conclusão média</span>{ragResumoAluno.metricas.conclusaoMedia30d == null ? '—' : `${formatarNumero(ragResumoAluno.metricas.conclusaoMedia30d,0)}%`}</div>
                        <div><span className="text-[#A0B3A6] block">Último treino</span>{ragResumoAluno.metricas.diasSemTreino == null ? '—' : `${ragResumoAluno.metricas.diasSemTreino} dia(s)`}</div>
                      </div>
                      <button onClick={() => { setAlunoSelecionado(ragAlunoId); setAdminTab('historico'); setGestaoView('menu'); }} className="w-full mt-3 border border-[#1A4026] text-[#D4AF37] py-2 rounded-lg text-[10px]">Abrir histórico completo deste aluno</button>
                    </div>
                  )}

                  <div><label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Orientações do professor (opcional)</label><textarea value={ragInstrucoes} onChange={e => setRagInstrucoes(e.target.value)} rows="4" placeholder="Ex.: evitar impacto no joelho; priorizar posterior; manter 4 treinos por semana..." className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none resize-none text-sm" /></div>
                  {ragRascunhoLoading && <p className="text-[#A0B3A6] text-xs text-center">Carregando rascunho salvo...</p>}

                  {ragResumoAluno?.planoAtual && !ragTreino && !ragRascunhoLoading && (
                    <div className="bg-[#051109] border border-green-500/30 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-green-400">Treino atual publicado</p>
                          <p className="text-sm font-bold text-white mt-1">{ragResumoAluno.planoAtual?.treino_json?.nome_plano || 'Treino Personalizado'}</p>
                          <p className="text-[10px] text-[#A0B3A6] mt-1">Você pode gerar um novo rascunho sem retirar o treino atual do aluno. O atual só será arquivado quando o novo for aprovado e publicado.</p>
                        </div>
                        <CheckCircle size={18} className="text-green-400 shrink-0 mt-1" />
                      </div>
                    </div>
                  )}

                  <button onClick={handleGerarTreinoRAG} disabled={ragGerando || ragRascunhoLoading || !ragAlunoId || ragEditando} className="w-full bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] font-bold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition-transform">
                    {ragGerando ? 'Gerando com IA...' : ragTreino ? 'Gerar outro rascunho com RAG' : ragResumoAluno?.planoAtual ? 'Gerar novo treino com RAG' : 'Gerar treino com RAG'}
                  </button>
                  {ragStatus && <p className="text-[#D4AF37] text-xs text-center">{ragStatus}</p>}
                </div>

                {ragTreino && (
                  <div className="bg-[#0A1A10] border border-[#D4AF37]/40 rounded-2xl p-4 space-y-4">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <p className="text-[10px] text-[#D4AF37] uppercase tracking-wider">Rascunho da IA</p>
                        <h4 className="font-bold text-lg">{ragTreino.nome_plano || 'Treino Personalizado'}</h4>
                        <p className="text-[#A0B3A6] text-xs">{ragTreino.objetivo || ''}</p>
                      </div>
                      <span className="text-[9px] border border-yellow-500/40 text-yellow-400 px-2 py-1 rounded-full">AGUARDANDO REVISÃO</span>
                    </div>

                    {!ragEditando ? (
                      <>
                        {(ragTreino.dias || []).map((dia, i) => (
                          <div key={dia.id || i} className="bg-[#051109] border border-[#1A4026] rounded-xl p-3">
                            <h5 className="text-sm font-bold text-[#D4AF37]">{dia.titulo || `Treino ${i+1}`}</h5>
                            <p className="text-[10px] text-[#A0B3A6] mb-2">{dia.foco || ''}</p>
                            <div className="space-y-1">
                              {(dia.exercicios || []).map((ex, j) => (
                                <p key={ex.id || j} className="text-xs text-gray-200">{j+1}. {ex.nome} — {ex.series || '-'} × {ex.repeticoes || '-'}{ex.descanso_seg ? ` • ${ex.descanso_seg}s` : ''}</p>
                              ))}
                            </div>
                          </div>
                        ))}

                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={iniciarEdicaoTreinoRAG} className="w-full bg-[#051109] border border-[#1A4026] text-white font-medium py-3 rounded-xl active:scale-95 flex items-center justify-center gap-2"><Edit2 size={15}/> Editar treino</button>
                          <button onClick={handleGerarTreinoRAG} disabled={ragGerando} className="w-full bg-[#051109] border border-[#1A4026] text-[#D4AF37] font-medium py-3 rounded-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"><RotateCcw size={15}/> Gerar novamente</button>
                        </div>

                        <div className="bg-[#1A3020] border border-[#1A4026] rounded-xl p-3 text-[10px] text-[#A0B3A6]">Antes de publicar, confira o histórico acima, exercícios, volume, frequência, restrições e observações do aluno. Se necessário, edite o rascunho diretamente.</div>
                        <button onClick={handlePublicarTreinoRAG} disabled={!ragPlanoId} className="w-full bg-[#1A3020] border border-[#D4AF37] text-[#D4AF37] font-bold py-3 rounded-xl disabled:opacity-50 active:scale-95">Aprovar e publicar para o aluno</button>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-[#051109] border border-[#D4AF37]/30 rounded-xl p-3 space-y-3">
                          <p className="text-[10px] text-[#D4AF37] uppercase tracking-wider">Editar informações gerais</p>
                          <div>
                            <label className="text-[9px] text-[#A0B3A6] uppercase">Nome do plano</label>
                            <input value={ragTreinoEditavel?.nome_plano || ''} onChange={e => atualizarCampoPlanoRAG('nome_plano', e.target.value)} className="w-full mt-1 bg-[#0A1A10] border border-[#1A4026] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]" />
                          </div>
                          <div>
                            <label className="text-[9px] text-[#A0B3A6] uppercase">Objetivo</label>
                            <textarea value={ragTreinoEditavel?.objetivo || ''} onChange={e => atualizarCampoPlanoRAG('objetivo', e.target.value)} rows="2" className="w-full mt-1 bg-[#0A1A10] border border-[#1A4026] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37] resize-none" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><label className="text-[9px] text-[#A0B3A6] uppercase">Semanas</label><input type="number" min="1" value={ragTreinoEditavel?.duracao_semanas ?? ''} onChange={e => atualizarCampoPlanoRAG('duracao_semanas', e.target.value)} className="w-full mt-1 bg-[#0A1A10] border border-[#1A4026] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]" /></div>
                            <div><label className="text-[9px] text-[#A0B3A6] uppercase">Frequência/semana</label><input type="number" min="1" value={ragTreinoEditavel?.frequencia_semanal ?? ''} onChange={e => atualizarCampoPlanoRAG('frequencia_semanal', e.target.value)} className="w-full mt-1 bg-[#0A1A10] border border-[#1A4026] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]" /></div>
                          </div>
                        </div>

                        {(ragTreinoEditavel?.dias || []).map((dia, diaIndex) => (
                          <div key={dia.id || diaIndex} className="bg-[#051109] border border-[#1A4026] rounded-xl p-3 space-y-3">
                            <div className="flex justify-between items-center gap-2">
                              <p className="text-xs font-bold text-[#D4AF37]">Dia {diaIndex + 1}</p>
                              <button type="button" onClick={() => removerDiaRAG(diaIndex)} className="text-red-300 text-[10px] flex items-center gap-1"><X size={13}/> Remover dia</button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div><label className="text-[9px] text-[#A0B3A6] uppercase">Título</label><input value={dia.titulo || ''} onChange={e => atualizarCampoDiaRAG(diaIndex, 'titulo', e.target.value)} className="w-full mt-1 bg-[#0A1A10] border border-[#1A4026] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]" /></div>
                              <div><label className="text-[9px] text-[#A0B3A6] uppercase">Foco</label><input value={dia.foco || ''} onChange={e => atualizarCampoDiaRAG(diaIndex, 'foco', e.target.value)} className="w-full mt-1 bg-[#0A1A10] border border-[#1A4026] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]" /></div>
                            </div>
                            <div><label className="text-[9px] text-[#A0B3A6] uppercase">Duração (min)</label><input type="number" min="1" value={dia.duracao_min ?? ''} onChange={e => atualizarCampoDiaRAG(diaIndex, 'duracao_min', e.target.value)} className="w-full mt-1 bg-[#0A1A10] border border-[#1A4026] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]" /></div>

                            <div className="space-y-3">
                              {(dia.exercicios || []).map((ex, exIndex) => (
                                <div key={ex.id || exIndex} className="bg-[#0A1A10] border border-[#1A4026] rounded-xl p-3 space-y-2">
                                  <div className="flex justify-between items-center gap-2">
                                    <p className="text-[10px] font-bold text-white">Exercício {exIndex + 1}</p>
                                    <button type="button" onClick={() => removerExercicioRAG(diaIndex, exIndex)} className="text-red-300 text-[10px] flex items-center gap-1"><X size={12}/> Remover</button>
                                  </div>
                                  <div><label className="text-[9px] text-[#A0B3A6] uppercase">Exercício</label><input value={ex.nome || ''} onChange={e => atualizarCampoExercicioRAG(diaIndex, exIndex, 'nome', e.target.value)} className="w-full mt-1 bg-[#051109] border border-[#1A4026] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]" /></div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div><label className="text-[9px] text-[#A0B3A6] uppercase">Séries</label><input type="number" min="1" value={ex.series ?? ''} onChange={e => atualizarCampoExercicioRAG(diaIndex, exIndex, 'series', e.target.value)} className="w-full mt-1 bg-[#051109] border border-[#1A4026] rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-[#D4AF37]" /></div>
                                    <div><label className="text-[9px] text-[#A0B3A6] uppercase">Repetições</label><input value={ex.repeticoes || ''} onChange={e => atualizarCampoExercicioRAG(diaIndex, exIndex, 'repeticoes', e.target.value)} className="w-full mt-1 bg-[#051109] border border-[#1A4026] rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-[#D4AF37]" /></div>
                                    <div><label className="text-[9px] text-[#A0B3A6] uppercase">Descanso (s)</label><input type="number" min="0" value={ex.descanso_seg ?? ''} onChange={e => atualizarCampoExercicioRAG(diaIndex, exIndex, 'descanso_seg', e.target.value)} className="w-full mt-1 bg-[#051109] border border-[#1A4026] rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-[#D4AF37]" /></div>
                                  </div>
                                  <div><label className="text-[9px] text-[#A0B3A6] uppercase">Orientação de carga</label><input value={ex.carga_orientacao || ''} onChange={e => atualizarCampoExercicioRAG(diaIndex, exIndex, 'carga_orientacao', e.target.value)} className="w-full mt-1 bg-[#051109] border border-[#1A4026] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]" /></div>
                                  <div><label className="text-[9px] text-[#A0B3A6] uppercase">Observações</label><textarea value={ex.observacoes || ''} onChange={e => atualizarCampoExercicioRAG(diaIndex, exIndex, 'observacoes', e.target.value)} rows="2" className="w-full mt-1 bg-[#051109] border border-[#1A4026] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37] resize-none" /></div>
                                </div>
                              ))}
                              <button type="button" onClick={() => adicionarExercicioRAG(diaIndex)} className="w-full border border-dashed border-[#D4AF37]/50 text-[#D4AF37] py-2 rounded-lg text-xs flex items-center justify-center gap-1"><Plus size={14}/> Adicionar exercício</button>
                            </div>
                          </div>
                        ))}

                        <button type="button" onClick={adicionarDiaRAG} className="w-full border border-dashed border-[#D4AF37]/50 text-[#D4AF37] py-3 rounded-xl text-xs flex items-center justify-center gap-1"><Plus size={15}/> Adicionar dia de treino</button>

                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={cancelarEdicaoTreinoRAG} disabled={ragSalvandoEdicao} className="w-full border border-[#1A4026] text-[#A0B3A6] font-medium py-3 rounded-xl disabled:opacity-50">Cancelar</button>
                          <button onClick={salvarEdicaoTreinoRAG} disabled={ragSalvandoEdicao} className="w-full bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"><Save size={15}/>{ragSalvandoEdicao ? 'Salvando...' : 'Salvar alterações'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {gestaoView === 'desempenho' && (
              <div className="space-y-4">
                <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4"><h4 className="text-[#D4AF37] font-medium mb-3">Ranking de Treinos Realizados</h4><div className="space-y-3">{ranking.slice(0,10).map((a, i) => <div key={a.id} className="flex justify-between items-center border-b border-[#1A4026] pb-2 last:border-0 last:pb-0"><div className="flex items-center gap-3"><span className={`font-bold ${i===0 ? 'text-[#D4AF37]' : 'text-[#A0B3A6]'}`}>{i+1}º</span><div><p className="text-sm text-white font-medium">{a.nome || 'Aluno Sem Nome'}</p><p className="text-[10px] text-[#A0B3A6]">{a.treinosCount || 0} treinos concluídos</p></div></div><Award size={18} className={i===0 ? 'text-[#D4AF37]' : 'text-transparent'} /></div>)}</div></div>
              </div>
            )}

            {gestaoView === 'relatorios' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StaffMetricCard titulo="Alunos cadastrados" valor={alunos.length} detalhe="Perfis de aluno no aplicativo" />
                  <StaffMetricCard titulo="Treinaram em 7 dias" valor={treino7dUsuarios.size} detalhe={`${alunosSem7d} sem treino nos últimos 7 dias`} />
                  <StaffMetricCard titulo="Sem treino há 14d" valor={alunosSem14d} detalhe="Prioridade para acompanhamento" />
                  <StaffMetricCard titulo="Sessões • 30 dias" valor={exec30d.length} detalhe="Treinos realmente concluídos" />
                </div>
                <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4"><h4 className="text-[#D4AF37] font-medium mb-1">Treinos concluídos por semana</h4><p className="text-[10px] text-[#A0B3A6] mb-4">Últimas 6 semanas • dados reais</p><div className="h-40 flex items-end justify-around gap-2 pt-4 border-b border-[#1A4026]">{semanas.map((sem, i) => <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1"><span className="text-[9px] text-[#A0B3A6]">{sem.total}</span><div className="w-full max-w-8 bg-[#D4AF37] rounded-t-sm min-h-[3px]" style={{ height: `${Math.max(3, (sem.total / maxSemana) * 100)}%` }}></div></div>)}</div><div className="flex justify-around text-[#A0B3A6] text-[9px] mt-2">{semanas.map((sem,i) => <span key={i}>{sem.label}</span>)}</div></div>
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="absolute bottom-0 left-0 right-0 bg-[#0A2514]/95 backdrop-blur-md border-t border-[#1A4026] px-4 py-2 z-50 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex justify-between items-center max-w-md mx-auto h-14">
          {[
            { id: 'evolucao', label: 'Aluno 360', icon: TrendingUp },
            { id: 'historico', label: 'Histórico', icon: Calendar },
            ...(hasAdminAccess(profile) ? [{ id: 'financeiro', label: 'Financeiro', icon: DollarSign }] : []),
            { id: 'acompanhamento', label: 'Gestão', icon: FileText },
          ].map(tab => <NavItem key={tab.id} icon={tab.icon} label={tab.label} isActive={adminTab === tab.id} onClick={() => { setAdminTab(tab.id); setGestaoView('menu'); }} />)}
        </div>
      </nav>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-10 sm:w-12 h-full relative transition-colors ${isActive ? 'text-[#D4AF37]' : 'text-[#8A9C90] hover:text-[#A0B3A6]'}`}>
    {isActive && <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#D4AF37] rounded-b-md shadow-[0_2px_8px_rgba(212,175,55,0.5)]" />}
    <Icon size={20} strokeWidth={isActive ? 2 : 1.5} className="mb-1" /><span className="text-[8px] sm:text-[9px] font-medium tracking-wide">{label}</span>
  </button>
);

const NavBar = () => {
  const { activeTab, setActiveTab } = useApp();
  const navItems = [
    { id: 'inicio', icon: Home, label: 'Início' },
    { id: 'diario', icon: Calendar, label: 'Diário' },
    { id: 'feed', icon: MessageCircle, label: 'Feed' },
    { id: 'treino', icon: Dumbbell, label: 'Meu Treino' },
    { id: 'progresso', icon: Activity, label: 'Evolução' },
    { id: 'corrida', icon: RunnerIcon, label: 'Corrida' },
    { id: 'perfil', icon: User, label: 'Perfil' }
  ];
  return (
    <>
      <GlobalStyles />
      <nav className="absolute bottom-0 left-0 right-0 bg-[#0A2514]/95 backdrop-blur-md border-t border-[#1A4026] px-1 sm:px-4 py-2 z-50 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex justify-between items-center max-w-md mx-auto h-14 min-w-[320px]">
          {navItems.map(item => <NavItem key={item.id} icon={item.icon} label={item.label} isActive={activeTab === item.id} onClick={() => setActiveTab(item.id)} />)}
        </div>
      </nav>
    </>
  );
};


// --- O SEU COMPONENTE APP ORIGINAL ---
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('inicio');
  const [loading, setLoading] = useState(true);
  const [adminView, setAdminView] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  
  const [waterGoal, setWaterGoal] = useState(2000);
  const [waterConsumed, setWaterConsumed] = useState(0);
  const [waterInterval, setWaterInterval] = useState(60);
  const [drinkSize, setDrinkSize] = useState(250);
  const [conquistaRegistrada, setConquistaRegistrada] = useState(false);
  
  const [proteinGoal, setProteinGoal] = useState(150);
  const [proteinConsumed, setProteinConsumed] = useState(0);
  const [proteinPortion, setProteinPortion] = useState(30);
  const [proteinConquista, setProteinConquista] = useState(false);
  
  const [diarioData, setDiarioData] = useState({
    nutricao: 50,
    horasSono: '',
    mentalidade: 50
  });

  useEffect(() => {
    document.documentElement.lang = 'pt-BR';
    document.documentElement.setAttribute('translate', 'no');
    let metaGoogle = document.querySelector('meta[name="google"]');
    if (!metaGoogle) {
      metaGoogle = document.createElement('meta');
      metaGoogle.name = 'google';
      document.head.appendChild(metaGoogle);
    }
    metaGoogle.content = 'notranslate';

    const appName = "Corpo em movimento";
    document.title = appName;

    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#E2C17D"/><stop offset="50%" stop-color="#B88A44"/><stop offset="100%" stop-color="#805C1B"/></linearGradient></defs><rect width="512" height="512" fill="#1C3022"/><circle cx="256" cy="256" r="170" fill="none" stroke="url(#g)" stroke-width="10"/><circle cx="265" cy="140" r="24" fill="url(#g)"/><path d="M150,110 Q200,160 270,180 Q250,230 270,300 Q290,380 230,480 Q200,380 240,280 Q260,220 220,180 Q180,140 150,110 Z" fill="url(#g)"/><path d="M275,230 Q320,180 380,100 Q330,160 285,250 Z" fill="url(#g)"/></svg>`;
    const encodedIcon = "data:image/svg+xml;base64," + btoa(svgIcon);

    let linkIcon = document.querySelector("link[rel~='icon']");
    if (!linkIcon) {
      linkIcon = document.createElement('link');
      linkIcon.rel = 'icon';
      document.head.appendChild(linkIcon);
    }
    linkIcon.href = encodedIcon;

    let linkApple = document.querySelector("link[rel='apple-touch-icon']");
    if (!linkApple) {
      linkApple = document.createElement('link');
      linkApple.rel = 'apple-touch-icon';
      document.head.appendChild(linkApple);
    }
    linkApple.href = encodedIcon;

    const manifestContent = {
      name: appName,
      short_name: appName,
      start_url: ".",
      display: "standalone",
      background_color: "#051109",
      theme_color: "#1C3022",
      icons: [{ src: encodedIcon, sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" }]
    };
    const manifestBlob = new Blob([JSON.stringify(manifestContent)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);
    let linkManifest = document.querySelector("link[rel='manifest']");
    if (!linkManifest) {
      linkManifest = document.createElement('link');
      linkManifest.rel = 'manifest';
      document.head.appendChild(linkManifest);
    }
    linkManifest.href = manifestUrl;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id, session.user.email, session.user.user_metadata);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) await loadProfile(session.user.id, session.user.email, session.user.user_metadata);
      else { setProfile(null); setAdminView(false); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId, userEmail, userMetadata = {}) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      const isMissingTable = error?.code === 'PGRST205' || error?.message?.includes('not find the table') || error?.code === '404';

      if (error && error.code !== 'PGRST116' && !isMissingTable) throw error;

      let effectiveProfile;

      if (!data || isMissingTable) {
        const nome = userMetadata?.nome || userEmail?.split('@')[0] || 'Usuário';
        const phone = userMetadata?.phone || null;
        const cpf = userMetadata?.cpf || null;
        const data_nascimento = userMetadata?.data_nascimento || null;
        const cidade_estado = userMetadata?.cidade_estado || null;
        const is_admin = userEmail === 'corpoemmovimento.adm@gmail.com';
        const role = is_admin ? 'admin' : 'aluno';

        const localProfile = { id: userId, email: userEmail || '', nome, phone, cpf, data_nascimento, cidade_estado, is_admin, role };

        if (!isMissingTable) {
          const { data: np, error: insertError } = await supabase.from('profiles').insert([localProfile]).select().single();
          effectiveProfile = (!insertError && np) ? np : localProfile;
        } else {
          effectiveProfile = localProfile;
        }
      } else {
        if (userEmail === 'corpoemmovimento.adm@gmail.com') data.is_admin = true;
        if (!data.role) data.role = data.is_admin ? 'admin' : 'aluno';
        effectiveProfile = data;
      }

      setProfile(effectiveProfile);

      const role = getUserRole(effectiveProfile);
      const isStudent = role === 'aluno';
      const isStaff = ['admin', 'professor'].includes(role);

      // Admin e professor entram direto na área administrativa e NUNCA fazem o onboarding do aluno.
      setAdminView(isStaff);
      setShowTransition(false);

      // O questionário de 12 etapas é exclusivo do aluno e aparece somente enquanto
      // ainda não existir uma resposta de onboarding salva no banco para esse usuário.
      if (!isStudent) {
        setNeedsOnboarding(false);
      } else {
        const { data: onbRows, error: onbError } = await supabase
          .from('onboarding_respostas')
          .select('id')
          .eq('user_id', userId);

        if (onbError) {
          console.error('Erro ao verificar onboarding do aluno:', onbError);
          setNeedsOnboarding(false);
        } else {
          const hasOnboarding = Array.isArray(onbRows) && onbRows.length > 0;
          setNeedsOnboarding(!hasOnboarding);
        }
      }

      const { count, error: notifError } = await supabase.from('notificacoes').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('lida', false);
      if (!notifError) setNotifCount(count || 0); else setNotifCount(0);

    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      const fallbackIsAdmin = userEmail === 'corpoemmovimento.adm@gmail.com';
      const fallbackProfile = { id: userId, email: userEmail || '', nome: userMetadata?.nome || userEmail?.split('@')[0] || 'Usuário', phone: userMetadata?.phone || null, is_admin: fallbackIsAdmin, role: fallbackIsAdmin ? 'admin' : 'aluno' };
      setProfile(fallbackProfile);

      if (fallbackIsAdmin) {
        setNeedsOnboarding(false);
        setAdminView(true);
      } else {
        setAdminView(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFinishOnboarding = async (data) => {
    // Proteção extra: somente perfis de aluno podem gravar este questionário.
    if (!profile || getUserRole(profile) !== 'aluno') {
      setNeedsOnboarding(false);
      return;
    }

    const { error: onboardingError } = await supabase.from('onboarding_respostas').insert([{
      user_id: profile.id,
      genero: data.genero,
      objetivo: data.objetivo,
      meta_peso: data.meta ? Number(data.meta) : null,
      nivel_atividade: data.nivel,
      desafios: data.desafios,
      estrutura: data.estrutura,
      disponibilidade: data.dias,
      modalidade: data.modalidade || null,
      termos_aceitos: data.termos
    }]);

    if (onboardingError) {
      console.error('Erro ao salvar onboarding:', onboardingError);
      alert('Não foi possível salvar suas respostas. Tente novamente.');
      return;
    }

    const { error: profileError } = await supabase.from('profiles').update({
      nome: data.nome,
      altura: data.altura ? Number(data.altura) : null,
      peso_atual: data.peso ? Number(data.peso) : null
    }).eq('id', profile.id);

    if (profileError) {
      console.error('Erro ao atualizar dados físicos do aluno:', profileError);
    }

    setProfile({ ...profile, nome: data.nome, altura: data.altura, peso_atual: data.peso });
    setNeedsOnboarding(false);
    setShowTransition(true);

    setTimeout(() => {
      setShowTransition(false);
    }, 3500);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null); setAdminView(false); setActiveTab('inicio');
  };

  const registrarConquista = async (mensagem) => {
    if (!profile?.id) return;
    try {
      const { data } = await supabase.from('notificacoes').select('id').eq('user_id', profile.id).eq('mensagem', mensagem);
      if (!data || data.length === 0) {
        await supabase.from('notificacoes').insert([{ user_id: profile.id, mensagem, lida: false }]);
        const { count } = await supabase.from('notificacoes').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('lida', false);
        setNotifCount(count || 0);
      }
    } catch (err) { console.error('Erro ao registrar conquista:', err); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#051109] flex items-center justify-center">
        <GlobalStyles />
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-[#D4AF37] playfair italic text-xl">Corpo em Movimento</h1>
        </div>
      </div>
    );
  }

  const ctx = {
    session, profile, setProfile,
    activeTab, setActiveTab,
    handleLogout,
    reloadProfile: () => session && loadProfile(session.user.id, session.user.email, session.user.user_metadata),
    notifCount, setNotifCount,
    setAdminView,
    registrarConquista,
    waterGoal, setWaterGoal,
    waterConsumed, setWaterConsumed,
    waterInterval, setWaterInterval,
    drinkSize, setDrinkSize,
    conquistaRegistrada, setConquistaRegistrada,
    proteinGoal, setProteinGoal,
    proteinConsumed, setProteinConsumed,
    proteinPortion, setProteinPortion,
    proteinConquista, setProteinConquista,
    diarioData, setDiarioData
  };

  return (
    <AppContext.Provider value={ctx}>
      <div className="min-h-screen bg-[#051109] flex items-center justify-center sm:p-4">
        <div className="w-full h-screen sm:h-[852px] sm:max-w-[393px] flex flex-col relative overflow-hidden sm:rounded-[3rem] sm:border-[8px] sm:border-black shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-[#051109] text-white">
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop")' }} />
          <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#143B21] to-transparent opacity-50 pointer-events-none z-0" />

          {!session ? (
            <Login />
          ) : getUserRole(profile) === 'aluno' && needsOnboarding ? (
            <Onboarding profile={profile} onComplete={handleFinishOnboarding} />
          ) : showTransition ? (
            <OnboardingTransition nome={profile?.nome} onDone={() => setShowTransition(false)} />
          ) : hasStaffAccess(profile) && adminView ? (
            <AdminPanel onExitAdmin={() => setAdminView(false)} />
          ) : (
            <>
              <header className="flex justify-between items-center px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))] relative z-10 flex-shrink-0">
                <button className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#D4AF37] transition-transform active:scale-95" onClick={() => setActiveTab('perfil')}>
                  {profile?.foto_url ? <img src={profile.foto_url} alt="Perfil" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37]"><User size={20} strokeWidth={1.5} /></div>}
                </button>
                <h1 className="text-sm sm:text-base leading-tight bg-gradient-to-r from-[#CFB375] to-[#AC915B] bg-clip-text text-transparent playfair italic font-bold whitespace-nowrap px-2">
                  Corpo em Movimento
                </h1>
                <div className="flex items-center gap-2">
                  {hasStaffAccess(profile) && <button onClick={() => setAdminView(true)} title="Área Administrativa" className="w-10 h-10 rounded-full bg-[#1A3020] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] active:scale-95 transition-transform"><ShieldCheck size={18} /></button>}
                  <button onClick={() => setActiveTab('notificacoes')} className="w-10 h-10 rounded-full bg-[#051109] flex items-center justify-center text-[#D4AF37] relative transition-transform active:scale-95">
                    <Bell size={22} strokeWidth={2} />
                    {notifCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#051109]" />}
                  </button>
                </div>
              </header>

              <main className="flex-1 px-6 relative z-10 flex flex-col overflow-hidden">
                {activeTab === 'inicio' && <Inicio />}
                {activeTab === 'diario' && <Diario />}
                {activeTab === 'feed' && <Feed />}
                {activeTab === 'treino' && <MeuTreino />}
                {activeTab === 'progresso' && <Progresso />}
                {activeTab === 'corrida' && <Corrida />}
                {activeTab === 'perfil' && <Perfil />}
                {activeTab === 'notificacoes' && <Notificacoes />}
              </main>

              <NavBar />
            </>
          )}
        </div>
      </div>
    </AppContext.Provider>
  );
}
