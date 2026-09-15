import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  Home, Dumbbell, Activity, User, Bell, ChevronRight,
  Target, Award, Settings, LogOut, ChevronLeft, Droplets, Plus, Minus, ShieldCheck,
  Edit2, Save, TrendingUp, DollarSign, Calendar, FileText, ImageIcon, Camera, RotateCcw,
  MessageCircle, Send, Heart, MoreVertical, X, CheckCircle
} from 'lucide-react';

const logoCorpoMovimento = '/logo_cm_semfundo.png';

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
const gerarTreinoComRAG = async ({ aluno, onboarding, progresso, instrucoesProfissional }) => {
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

const RunnerIcon = ({ size = 24, strokeWidth = 2, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
    <path d="M7 13l4-1 2.5-3.5 3.5 1.5 2.5-1" />
    <path d="M13.5 13.5L16 18l4 1.5" />
    <path d="M16 18l-3 5" />
    <path d="M5 18l4-2.5" />
  </svg>
);

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

const Onboarding = ({ profile, onClose, onComplete }) => {
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
        <button onClick={onClose} className="text-[#A0B3A6] hover:text-white p-1"><X size={24} /></button>
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
               <label className="flex items-start gap-3 cursor-pointer group">
                 <div className={`w-6 h-6 rounded flex items-center justify-center border mt-0.5 flex-shrink-0 transition-colors ${formData.termos ? 'bg-[#D4AF37] border-[#D4AF37]' : 'bg-[#051109] border-[#1A4026] group-hover:border-[#D4AF37]'}`}>
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
    const { data: profilesData } = await supabase.from('profiles').select('*');
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


const MeuTreino = () => {
  const { profile } = useApp();
  const [plano, setPlano] = useState(null);
  const [loadingPlano, setLoadingPlano] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  const carregarPlano = async () => {
    if (!profile?.id) return;
    setLoadingPlano(true);
    setStatusMsg('');
    const { data, error } = await supabase.from('planos_treino').select('*').eq('user_id', profile.id).eq('status', 'publicado');
    if (error) {
      setStatusMsg('Ainda não foi possível carregar seu treino.');
      setPlano(null);
    } else {
      const lista = Array.isArray(data) ? data : (data ? [data] : []);
      lista.sort((a, b) => new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0));
      setPlano(lista[0] || null);
    }
    setLoadingPlano(false);
  };

  useEffect(() => { carregarPlano(); }, [profile?.id]);

  const treino = plano?.treino_json || null;
  const dias = Array.isArray(treino?.dias) ? treino.dias : [];

  const concluirSessao = async (dia) => {
    if (!plano?.id || !profile?.id) return;
    const sessaoKey = String(dia.id || dia.titulo || 'treino');
    const { data: existentes } = await supabase.from('execucoes_treino').select('*').eq('plano_treino_id', plano.id).eq('user_id', profile.id).eq('sessao_key', sessaoKey).eq('status', 'concluido');
    const hoje = new Date().toISOString().slice(0, 10);
    const jaConcluidoHoje = (existentes || []).some(item => String(item.concluido_em || item.created_at || '').slice(0, 10) === hoje);
    if (jaConcluidoHoje) {
      setStatusMsg('Este treino já foi registrado como concluído hoje.');
      setTimeout(() => setStatusMsg(''), 3000);
      return;
    }

    const concluidoEm = new Date().toISOString();
    const { error } = await supabase.from('execucoes_treino').insert([{
      plano_treino_id: plano.id,
      user_id: profile.id,
      sessao_key: sessaoKey,
      status: 'concluido',
      concluido_em: concluidoEm,
      dados_execucao: { titulo: dia.titulo || 'Treino', concluido_em: concluidoEm }
    }]);
    setStatusMsg(error ? 'Não foi possível registrar a conclusão.' : 'Treino concluído e registrado no seu histórico!');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar pb-24 pt-4 text-white">
      <div className="mb-5 border-l-2 border-[#D4AF37] pl-3 py-1">
        <h2 className="text-[#D4AF37] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">Meu Treino</h2>
        <h3 className="text-white text-lg font-medium mb-1">Seu plano atual</h3>
        <p className="text-[#A0B3A6] text-xs">Aqui aparece somente o treino publicado pela equipe da academia.</p>
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
            {dias.map((dia, idx) => (
              <div key={dia.id || idx} className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[#1A4026] flex justify-between items-start gap-3">
                  <div><p className="text-[#D4AF37] text-[10px] uppercase">{dia.foco || `Treino ${idx + 1}`}</p><h4 className="font-bold text-base">{dia.titulo || `Sessão ${idx + 1}`}</h4></div>
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
                  <button onClick={() => concluirSessao(dia)} className="w-full bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] font-bold py-3 rounded-xl active:scale-95 transition-transform">Concluir este treino</button>
                </div>
              </div>
            ))}
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

const Corrida = () => {
  const compartilharCorrida = async () => {
     const canvas = document.createElement('canvas');
     canvas.width = 1080;
     canvas.height = 1920; 
     const ctx = canvas.getContext('2d');

     // Fundo do Story
     const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
     gradient.addColorStop(0, '#0A1A10');
     gradient.addColorStop(1, '#051109');
     ctx.fillStyle = gradient;
     ctx.fillRect(0, 0, 1080, 1920);

     // Desenho das "ruas" de fundo
     ctx.strokeStyle = '#1A3020';
     ctx.lineWidth = 3;
     for (let i = 0; i < 20; i++) {
         ctx.beginPath();
         ctx.moveTo(0, i * 100);
         ctx.lineTo(1080, i * 100 + Math.random() * 200 - 100);
         ctx.stroke();
     }

     // Linha do Percurso percorrido (Dourado/Gold)
     ctx.strokeStyle = '#D4AF37';
     ctx.lineWidth = 18;
     ctx.lineCap = 'round';
     ctx.lineJoin = 'round';
     ctx.beginPath();
     ctx.moveTo(200, 1000);
     ctx.lineTo(350, 800);
     ctx.lineTo(500, 850);
     ctx.lineTo(700, 600);
     ctx.lineTo(850, 750);
     ctx.stroke();

     // Pontos de partida e chegada
     ctx.fillStyle = '#FFFFFF';
     ctx.beginPath(); ctx.arc(200, 1000, 24, 0, Math.PI * 2); ctx.fill();
     ctx.beginPath(); ctx.arc(850, 750, 24, 0, Math.PI * 2); ctx.fill();

     // Branding
     ctx.fillStyle = '#D4AF37';
     ctx.font = 'italic bold 70px "Playfair Display", serif';
     ctx.textAlign = 'center';
     ctx.fillText('Corpo em Movimento', 540, 180);

     // Bloco Escuro para as Estatísticas
     ctx.fillStyle = 'rgba(10, 26, 16, 0.9)';
     ctx.roundRect(90, 1300, 900, 420, 40);
     ctx.fill();
     ctx.strokeStyle = '#1A4026';
     ctx.lineWidth = 4;
     ctx.stroke();

     // Estatísticas e Metricas
     ctx.fillStyle = '#FFFFFF';
     ctx.font = 'bold 110px Arial';
     ctx.fillText('5.20 km', 540, 1460);

     ctx.font = '40px Arial';
     ctx.fillStyle = '#A0B3A6';
     ctx.fillText('Distância', 540, 1530);

     ctx.font = 'bold 70px Arial';
     ctx.fillStyle = '#FFFFFF';
     ctx.fillText('5\'30"', 300, 1640);
     ctx.fillText('28:36', 780, 1640);

     ctx.font = '30px Arial';
     ctx.fillStyle = '#A0B3A6';
     ctx.fillText('Pace / Ritmo Médio', 300, 1690);
     ctx.fillText('Tempo', 780, 1690);

     // Geração e Compartilhamento
     canvas.toBlob(async (blob) => {
       const file = new File([blob], 'corrida.png', { type: 'image/png' });
       if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
         try {
           await navigator.share({
             title: 'Minha Corrida',
             text: 'Acabei de concluir meu percurso pelo Corpo em Movimento! 🏃💨',
             files: [file]
           });
         } catch (error) {
           console.error('Erro ao compartilhar:', error);
         }
       } else {
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = 'corpo-em-movimento-corrida.png';
         a.click();
         URL.revokeObjectURL(url);
         alert("Imagem gerada e baixada! Agora você pode compartilhar no seu Instagram.");
       }
     }, 'image/png');
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-24 text-white">
      <div className="mb-6 border-l-2 border-[#D4AF37] pl-3 py-1 mt-4">
        <h2 className="text-[#D4AF37] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">Corrida</h2>
        <h3 className="text-white text-lg font-medium mb-1">Seu Desempenho</h3>
        <p className="text-[#A0B3A6] text-xs">Acompanhe seus treinos e metas de corrida.</p>
      </div>
      
      {/* Resumo da Última Corrida */}
      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-4">
        <div className="flex justify-between items-center mb-2">
           <h4 className="font-medium text-[#D4AF37] flex items-center gap-2">
             <RunnerIcon size={18} /> Última Corrida
           </h4>
           <span className="text-xs text-[#A0B3A6]">Hoje, 06:30</span>
        </div>

        {/* Desenho de Mapa do Percurso */}
        <div className="w-full h-48 bg-[#051109] rounded-xl border border-[#1A4026] relative overflow-hidden flex items-center justify-center shadow-inner">
           {/* Linhas de fundo simulando ruas/mapa */}
           <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
             <path d="M-10 20 Q 50 50 100 10 T 250 30 T 400 10" stroke="#D4AF37" fill="transparent" strokeWidth="1"/>
             <path d="M-10 70 Q 80 120 150 60 T 300 90 T 450 40" stroke="#D4AF37" fill="transparent" strokeWidth="1"/>
             <path d="M-10 130 Q 60 100 120 170 T 260 140 T 400 160" stroke="#D4AF37" fill="transparent" strokeWidth="1"/>
             <path d="M50 -10 V 200 M 150 -10 V 200 M 250 -10 V 200 M 350 -10 V 200" stroke="#A0B3A6" fill="transparent" strokeWidth="0.5" strokeDasharray="4 4"/>
           </svg>
           {/* Linha do Percurso */}
           <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
             <path d="M 15 85 L 35 60 L 50 65 L 70 30 L 85 45" fill="none" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(212,175,55,1)]"/>
             <circle cx="15" cy="85" r="3" fill="#FFFFFF" />
             <circle cx="85" cy="45" r="3" fill="#FFFFFF" />
           </svg>
        </div>

        {/* Estatísticas (Pace, Distância, Tempo) */}
        <div className="grid grid-cols-3 gap-2 text-center pt-2">
           <div className="bg-[#051109] p-3 rounded-xl border border-[#1A4026]">
             <span className="text-[#A0B3A6] text-[10px] uppercase block mb-1">Distância</span>
             <span className="text-white font-bold text-lg">5.2<span className="text-xs font-normal text-[#A0B3A6]"> km</span></span>
           </div>
           <div className="bg-[#051109] p-3 rounded-xl border border-[#1A4026]">
             <span className="text-[#A0B3A6] text-[10px] uppercase block mb-1">Pace</span>
             <span className="text-white font-bold text-lg">5'30"<span className="text-xs font-normal text-[#A0B3A6]"> /km</span></span>
           </div>
           <div className="bg-[#051109] p-3 rounded-xl border border-[#1A4026]">
             <span className="text-[#A0B3A6] text-[10px] uppercase block mb-1">Tempo</span>
             <span className="text-white font-bold text-lg">28:36</span>
           </div>
        </div>

        {/* Botão de Compartilhar no Instagram (estilo Strava) */}
        <button onClick={compartilharCorrida} className="w-full mt-2 bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888] text-white font-bold text-sm py-3 rounded-xl active:scale-95 transition-transform flex justify-center items-center gap-2 shadow-lg">
          <Camera size={18} /> Compartilhar no Instagram
        </button>
      </div>

      {/* Recordes Pessoais (RP) em KM */}
      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
         <h4 className="font-medium text-[#D4AF37] mb-4">Recordes Pessoais (RP) em KM</h4>
         <div className="space-y-3">
           <div className="flex justify-between items-center bg-[#051109] border border-[#1A4026] p-3 rounded-xl">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/30">
                 <Award size={20} />
               </div>
               <div>
                 <span className="text-white font-bold block text-sm">5 KM</span>
                 <span className="text-[#A0B3A6] text-[10px]">Melhor Tempo</span>
               </div>
             </div>
             <span className="text-[#D4AF37] font-bold">25:14</span>
           </div>
           <div className="flex justify-between items-center bg-[#051109] border border-[#1A4026] p-3 rounded-xl">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/30">
                 <Award size={20} />
               </div>
               <div>
                 <span className="text-white font-bold block text-sm">10 KM</span>
                 <span className="text-[#A0B3A6] text-[10px]">Melhor Tempo</span>
               </div>
             </div>
             <span className="text-[#D4AF37] font-bold">54:30</span>
           </div>
         </div>
      </div>
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

const AdminPanel = ({ onExitAdmin }) => {
  const { profile } = useApp();
  const [adminTab, setAdminTab] = useState('evolucao');
  const [gestaoView, setGestaoView] = useState('menu');
  
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [progressoAluno, setProgressoAluno] = useState([]);
  const [showDesempenho, setShowDesempenho] = useState(false);
  const [ranking, setRanking] = useState([]);
  const [ragAlunoId, setRagAlunoId] = useState('');
  const [ragInstrucoes, setRagInstrucoes] = useState('');
  const [ragGerando, setRagGerando] = useState(false);
  const [ragTreino, setRagTreino] = useState(null);
  const [ragPlanoId, setRagPlanoId] = useState(null);

  useEffect(() => {
    const fetchAlunos = async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) {
        const alunosData = data.filter(p => getUserRole(p) === 'aluno');
        setAlunos(alunosData);
        const { data: execucoes } = await supabase.from('execucoes_treino').select('*').eq('status', 'concluido');
        if (execucoes) {
          const r = alunosData.map(a => ({
            ...a,
            treinosCount: execucoes.filter(t => t.user_id === a.id).length
          })).sort((a, b) => b.treinosCount - a.treinosCount);
          setRanking(r);
        } else {
          setRanking(alunosData.map(a => ({...a, treinosCount: 0})));
        }
      }
    };
    fetchAlunos();
  }, []);

  const handleEnviarMensagem = async () => {
    if (!alunoSelecionado || !mensagem) {
      setStatusMsg('Selecione um aluno e digite a mensagem.');
      setTimeout(() => setStatusMsg(''), 3000);
      return;
    }
    setStatusMsg('Enviando...');
    const { error } = await supabase.from('notificacoes').insert([{ user_id: alunoSelecionado, mensagem: mensagem, lida: false }]);
    if (!error) { setStatusMsg('Mensagem enviada!'); setMensagem(''); } else { setStatusMsg('Erro ao enviar.'); }
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleGerarTreinoRAG = async () => {
    const aluno = alunos.find(a => a.id === ragAlunoId);
    if (!aluno) {
      setStatusMsg('Selecione um aluno para gerar o treino.');
      return;
    }
    setRagGerando(true);
    setStatusMsg('Consultando a base de conhecimento e gerando o treino...');
    setRagTreino(null);
    setRagPlanoId(null);

    try {
      const { data: onboarding } = await supabase.from('onboarding_respostas').select('*').eq('user_id', aluno.id).single();
      const { data: progresso } = await supabase.from('progresso_mensal').select('*').eq('user_id', aluno.id);
      const resultado = await gerarTreinoComRAG({
        aluno,
        onboarding,
        progresso: progresso || [],
        instrucoesProfissional: ragInstrucoes
      });

      const { data: salvo, error: saveError } = await supabase.from('planos_treino').insert([{
        user_id: aluno.id,
        created_by: currentSession?.user?.id || null,
        status: 'rascunho',
        objetivo: resultado.treino?.objetivo || onboarding?.objetivo || null,
        observacoes_profissional: ragInstrucoes || null,
        treino_json: resultado.treino,
        fontes_rag: resultado.fontes || resultado.fontes_rag || [],
        rag_version: resultado.rag_version || 'v1',
        model_name: resultado.model || null
      }]).select().single();

      if (saveError) throw saveError;
      setRagTreino(resultado.treino);
      setRagPlanoId(salvo?.id || null);
      setStatusMsg('Treino gerado como rascunho. Revise antes de publicar.');
    } catch (error) {
      console.error('Erro RAG:', error);
      setStatusMsg(error.message || 'Erro ao gerar o treino.');
    } finally {
      setRagGerando(false);
    }
  };

  const handlePublicarTreinoRAG = async () => {
    if (!ragPlanoId || !ragAlunoId) return;
    setStatusMsg('Publicando treino...');

    const { data: publicados, error: loadError } = await supabase.from('planos_treino').select('*').eq('user_id', ragAlunoId).eq('status', 'publicado');
    if (loadError) {
      setStatusMsg('Não foi possível verificar o plano atual do aluno.');
      return;
    }

    for (const planoPublicado of (publicados || [])) {
      if (planoPublicado.id !== ragPlanoId) {
        const { error: archiveError } = await supabase.from('planos_treino').update({ status: 'arquivado', updated_at: new Date().toISOString() }).eq('id', planoPublicado.id);
        if (archiveError) {
          setStatusMsg('Não foi possível arquivar o plano anterior.');
          return;
        }
      }
    }

    const { error } = await supabase.from('planos_treino').update({
      status: 'publicado',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', ragPlanoId);
    setStatusMsg(error ? 'Não foi possível publicar.' : 'Treino publicado. O plano anterior foi arquivado automaticamente.');
  };

  useEffect(() => {
    if (alunoSelecionado) {
      const fetchProgresso = async () => {
        const { data } = await supabase.from('progresso_mensal').select('*').eq('user_id', alunoSelecionado);
        if (data) setProgressoAluno(data.sort((a, b) => a.mes.localeCompare(b.mes)));
      };
      fetchProgresso();
      setShowDesempenho(false);
    } else {
      setProgressoAluno([]);
      setShowDesempenho(false);
    }
  }, [alunoSelecionado]);

  const alunoObj = alunos.find(a => a.id === alunoSelecionado);

  const calcularIdade = (dataNasc) => {
    if (!dataNasc) return 'N/A';
    const hoje = new Date();
    const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  };

  return (
    <div className="flex-1 flex flex-col text-white z-10 w-full h-full relative overflow-hidden bg-[#051109]">
      <GlobalStyles />
      <div className="px-6 py-4 pt-[calc(1.5rem+env(safe-area-inset-top))] border-b border-[#1A4026] flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold text-[#D4AF37] playfair italic">{hasAdminAccess(profile) ? 'Área Administrativa' : 'Área do Professor'}</h2>
        <button onClick={onExitAdmin} className="w-10 h-10 rounded-full bg-[#1A3020] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] active:scale-95"><LogOut size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar pb-24">
        {adminTab === 'evolucao' && (
          <div className="space-y-6">
            <h3 className="text-xl font-medium mb-4 border-l-2 border-[#D4AF37] pl-3">Evolução de Aluno</h3>
            <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
              <label className="text-xs text-[#A0B3A6] mb-2 block">Selecione o Aluno</label>
              <select className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg focus:border-[#D4AF37] outline-none" value={alunoSelecionado} onChange={(e) => setAlunoSelecionado(e.target.value)}>
                <option value="">Selecione um aluno...</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome || a.email}</option>)}
              </select>
            </div>

            {alunoObj && (
              <>
                <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-3">
                  <h4 className="text-[#D4AF37] font-medium border-b border-[#1A4026] pb-2">Informações do Aluno</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="col-span-2"><span className="text-[#A0B3A6] text-[10px] uppercase block">E-mail</span><span className="break-all">{alunoObj.email}</span></div>
                    <div><span className="text-[#A0B3A6] text-[10px] uppercase block">Telefone</span>{alunoObj.phone || 'Não informado'}</div>
                    <div><span className="text-[#A0B3A6] text-[10px] uppercase block">CPF</span>{alunoObj.cpf || 'Não informado'}</div>
                    <div className="col-span-2"><span className="text-[#A0B3A6] text-[10px] uppercase block">Endereço (Cidade/Estado)</span>{alunoObj.cidade_estado || 'Não informado'}</div>
                    <div><span className="text-[#A0B3A6] text-[10px] uppercase block">Idade</span>{calcularIdade(alunoObj.data_nascimento)} anos</div>
                    <div><span className="text-[#A0B3A6] text-[10px] uppercase block">Modalidade</span>Não definida</div>
                    <div><span className="text-[#A0B3A6] text-[10px] uppercase block">Peso Atual</span>{alunoObj.peso_atual ? `${alunoObj.peso_atual} kg` : (progressoAluno.length > 0 ? `${progressoAluno[progressoAluno.length - 1].peso} kg` : 'Não informado')}</div>
                    <div><span className="text-[#A0B3A6] text-[10px] uppercase block">Altura</span>{alunoObj.altura ? `${alunoObj.altura} m` : 'Não informada'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1A3020] border border-[#D4AF37]/30 p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <Edit2 className="mx-auto text-[#D4AF37] mb-2" size={24} />
                      <span className="text-sm font-medium block text-center mb-2">Enviar Mensagem</span>
                      <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} placeholder="Digite a mensagem..." className="w-full bg-[#051109] border border-[#1A4026] text-white p-2 rounded-lg text-xs outline-none resize-none mb-2 custom-scrollbar" rows="2" />
                    </div>
                    <div>
                      <button onClick={handleEnviarMensagem} className="w-full bg-[#D4AF37] text-[#051109] font-bold py-1.5 rounded-lg text-xs active:scale-95">Enviar</button>
                      {statusMsg && <p className="text-[#D4AF37] text-[10px] text-center mt-1">{statusMsg}</p>}
                    </div>
                  </div>
                  <button onClick={() => setShowDesempenho(!showDesempenho)} className="bg-[#1A3020] border border-[#D4AF37]/30 p-4 rounded-2xl text-center active:scale-95 flex flex-col items-center justify-center">
                    <Target className="mx-auto text-[#D4AF37] mb-2" size={24} />
                    <span className="text-sm font-medium">{showDesempenho ? 'Ocultar Desempenho' : 'Visualizar Desempenho'}</span>
                  </button>
                </div>

                {showDesempenho && (
                  <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
                    <h4 className="text-[#D4AF37] font-medium mb-3">Gráfico de Evolução Física</h4>
                    <div className="h-40 flex items-end gap-2 pt-4 border-b border-[#1A4026] opacity-80">
                      {progressoAluno.length > 0 ? progressoAluno.map((h, i) => (
                        <div key={i} className="flex-1 bg-[#D4AF37] rounded-t-sm" style={{ height: `${Math.min((h.peso / 150) * 100, 100)}%` }}></div>
                      )) : (
                        <div className="w-full text-center text-[#A0B3A6] text-xs pb-4">Nenhum dado registrado para este aluno.</div>
                      )}
                    </div>
                    <div className="flex justify-between text-[#A0B3A6] text-[10px] mt-2 overflow-x-auto gap-4 custom-scrollbar">
                      {progressoAluno.map((h, i) => {
                        const [ano, mes] = h.mes.split('-');
                        return <span key={i} className="whitespace-nowrap">{mes}/{ano}</span>;
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {adminTab === 'historico' && (
          <div className="space-y-6">
            <h3 className="text-xl font-medium mb-4 border-l-2 border-[#D4AF37] pl-3">Histórico de Alunos</h3>
            <div className="space-y-3">
              <div className="bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex justify-between items-center">
                <div><h4 className="font-medium">Histórico de Treinos</h4><p className="text-xs text-[#A0B3A6]">Consultar treinos realizados</p></div><ChevronRight className="text-[#D4AF37]" size={20} />
              </div>
              <div className="bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex justify-between items-center">
                <div><h4 className="font-medium">Histórico Alimentar/Dieta</h4><p className="text-xs text-[#A0B3A6]">Revisão de planos da nutrição</p></div><ChevronRight className="text-[#D4AF37]" size={20} />
              </div>
              <div className="bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex justify-between items-center">
                <div><h4 className="font-medium">Consulta de Registros Anteriores</h4><p className="text-xs text-[#A0B3A6]">Avaliação geral</p></div><ChevronRight className="text-[#D4AF37]" size={20} />
              </div>
            </div>
          </div>
        )}

        {adminTab === 'financeiro' && (
          <div className="space-y-6">
            <h3 className="text-xl font-medium mb-4 border-l-2 border-[#D4AF37] pl-3">Gestão Financeira</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 text-center">
                <p className="text-xs text-[#A0B3A6] uppercase">Receita do Mês</p>
                <p className="text-2xl font-bold text-[#D4AF37] mt-1">R$ 14.5K</p>
              </div>
              <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 text-center">
                <p className="text-xs text-[#A0B3A6] uppercase">Inadimplentes</p>
                <p className="text-2xl font-bold text-red-500 mt-1">3 Alunos</p>
              </div>
            </div>
            <div className="space-y-3">
              <button className="w-full bg-[#1A3020] border border-[#D4AF37]/30 p-4 rounded-xl flex items-center justify-between text-left active:scale-95">
                <div><h4 className="font-medium">Controle Financeiro Interno</h4></div><DollarSign className="text-[#D4AF37]" size={20} />
              </button>
              <button className="w-full bg-[#1A3020] border border-[#D4AF37]/30 p-4 rounded-xl flex items-center justify-between text-left active:scale-95">
                <div><h4 className="font-medium">Visualização de Pagamentos</h4></div><FileText className="text-[#D4AF37]" size={20} />
              </button>
              <button className="w-full bg-[#1A3020] border border-[#D4AF37]/30 p-4 rounded-xl flex items-center justify-between text-left active:scale-95">
                <div><h4 className="font-medium">Controle de Mensalidades</h4></div><Calendar className="text-[#D4AF37]" size={20} />
              </button>
              <button className="w-full bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center justify-between text-left active:scale-95 mt-4">
                <div><h4 className="font-medium">Enviar Lembrete de Pagamento</h4></div><Bell size={20} />
              </button>
            </div>
          </div>
        )}

        {adminTab === 'acompanhamento' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4 border-l-2 border-[#D4AF37] pl-3">
              <h3 className="text-xl font-medium">Acompanhamento e Gestão</h3>
              {gestaoView !== 'menu' && (
                <button onClick={() => setGestaoView('menu')} className="text-[#D4AF37] text-xs flex items-center gap-1 bg-[#1A3020] px-3 py-1 rounded-full"><ChevronLeft size={14}/> Voltar</button>
              )}
            </div>

            {gestaoView === 'menu' && (
              <div className="space-y-3">
                <button onClick={() => setGestaoView('desempenho')} className="w-full bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex justify-between items-center active:scale-95 transition-transform">
                  <div className="text-left"><h4 className="font-medium">Desempenho dos Alunos</h4><p className="text-xs text-[#A0B3A6]">Rankings e métricas</p></div><Activity className="text-[#D4AF37]" size={20} />
                </button>
                <button onClick={() => { setAdminTab('evolucao'); setAlunoSelecionado(''); }} className="w-full bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex justify-between items-center active:scale-95 transition-transform">
                  <div className="text-left"><h4 className="font-medium">Histórico Individual</h4><p className="text-xs text-[#A0B3A6]">Fichas de cada aluno</p></div><User className="text-[#D4AF37]" size={20} />
                </button>
                <button onClick={() => setGestaoView('relatorios')} className="w-full bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex justify-between items-center active:scale-95 transition-transform">
                  <div className="text-left"><h4 className="font-medium">Relatórios e Gráficos de Desenvolvimento</h4><p className="text-xs text-[#A0B3A6]">Evolutivos gerais da academia</p></div><TrendingUp className="text-[#D4AF37]" size={20} />
                </button>
                <button onClick={() => { setGestaoView('treinos_rag'); setRagTreino(null); setRagPlanoId(null); }} className="w-full bg-[#1A3020] border border-[#D4AF37]/50 rounded-xl p-4 flex justify-between items-center active:scale-95 transition-transform mt-6 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                  <div className="text-left"><h4 className="font-medium text-[#D4AF37]">Treinos com IA (RAG)</h4><p className="text-xs text-[#A0B3A6]">Gerar, revisar e publicar o treino individual</p></div><Target className="text-[#D4AF37]" size={20} />
                </button>
              </div>
            )}

            {gestaoView === 'treinos_rag' && (
              <div className="space-y-4">
                <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-4">
                  <div className="border-b border-[#1A4026] pb-3">
                    <h4 className="text-[#D4AF37] font-medium flex items-center gap-2"><Target size={16}/> Gerar treino individual com IA</h4>
                    <p className="text-[#A0B3A6] text-[10px] mt-1">A IA consulta o RAG da academia. O resultado fica em rascunho até a revisão profissional.</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Aluno</label>
                    <select value={ragAlunoId} onChange={e => { setRagAlunoId(e.target.value); setRagTreino(null); setRagPlanoId(null); }} className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none">
                      <option value="">Selecione...</option>
                      {alunos.map(a => <option key={a.id} value={a.id}>{a.nome || a.email}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Orientações do professor (opcional)</label>
                    <textarea value={ragInstrucoes} onChange={e => setRagInstrucoes(e.target.value)} rows="4" placeholder="Ex.: evitar impacto no joelho; priorizar fortalecimento de posterior; 4 treinos por semana..." className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none resize-none text-sm" />
                  </div>
                  <button onClick={handleGerarTreinoRAG} disabled={ragGerando || !ragAlunoId} className="w-full bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] font-bold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition-transform">
                    {ragGerando ? 'Gerando com IA...' : 'Gerar treino com RAG'}
                  </button>
                  {statusMsg && <p className="text-[#D4AF37] text-xs text-center">{statusMsg}</p>}
                </div>

                {ragTreino && (
                  <div className="bg-[#0A1A10] border border-[#D4AF37]/40 rounded-2xl p-4 space-y-4">
                    <div className="flex justify-between items-start gap-3">
                      <div><p className="text-[10px] text-[#D4AF37] uppercase tracking-wider">Rascunho da IA</p><h4 className="font-bold text-lg">{ragTreino.nome_plano || 'Treino Personalizado'}</h4><p className="text-[#A0B3A6] text-xs">{ragTreino.objetivo || ''}</p></div>
                      <span className="text-[9px] border border-yellow-500/40 text-yellow-400 px-2 py-1 rounded-full">AGUARDANDO REVISÃO</span>
                    </div>
                    {(ragTreino.dias || []).map((dia, i) => (
                      <div key={dia.id || i} className="bg-[#051109] border border-[#1A4026] rounded-xl p-3">
                        <h5 className="text-sm font-bold text-[#D4AF37]">{dia.titulo || `Treino ${i+1}`}</h5>
                        <p className="text-[10px] text-[#A0B3A6] mb-2">{dia.foco || ''}</p>
                        <div className="space-y-1">
                          {(dia.exercicios || []).map((ex, j) => <p key={ex.id || j} className="text-xs text-gray-200">{j+1}. {ex.nome} — {ex.series || '-'} × {ex.repeticoes || '-'}</p>)}
                        </div>
                      </div>
                    ))}
                    <div className="bg-[#1A3020] border border-[#1A4026] rounded-xl p-3 text-[10px] text-[#A0B3A6]">Antes de publicar, confira exercícios, volume, frequência, restrições do aluno e coerência com a orientação profissional.</div>
                    <button onClick={handlePublicarTreinoRAG} disabled={!ragPlanoId} className="w-full bg-[#1A3020] border border-[#D4AF37] text-[#D4AF37] font-bold py-3 rounded-xl disabled:opacity-50 active:scale-95">Aprovar e publicar para o aluno</button>
                  </div>
                )}
              </div>
            )}

            {gestaoView === 'desempenho' && (
              <div className="space-y-4">
                <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
                  <h4 className="text-[#D4AF37] font-medium mb-3">Ranking de Treinos Realizados</h4>
                  <div className="space-y-3">
                    {ranking.slice(0,5).map((a, i) => (
                      <div key={a.id} className="flex justify-between items-center border-b border-[#1A4026] pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${i===0 ? 'text-[#D4AF37]' : 'text-[#A0B3A6]'}`}>{i+1}º</span>
                          <div>
                            <p className="text-sm text-white font-medium">{a.nome || 'Aluno Sem Nome'}</p>
                            <p className="text-[10px] text-[#A0B3A6]">{a.treinosCount || 0} treinos registrados</p>
                          </div>
                        </div>
                        <Award size={18} className={i===0 ? 'text-[#D4AF37]' : 'text-transparent'} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {gestaoView === 'relatorios' && (
              <div className="space-y-4">
                <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
                  <h4 className="text-[#D4AF37] font-medium mb-3">Retenção e Crescimento (Média)</h4>
                  <div className="h-40 flex items-end justify-around gap-2 pt-4 border-b border-[#1A4026] opacity-80">
                    {[30, 45, 60, 50, 75, 90, 85].map((h, i) => <div key={i} className="w-6 bg-[#D4AF37] rounded-t-sm" style={{ height: `${h}%` }}></div>)}
                  </div>
                  <div className="flex justify-around text-[#A0B3A6] text-[10px] mt-2">
                    <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span>
                  </div>
                  <p className="text-xs text-[#A0B3A6] text-center mt-4 pt-4 border-t border-[#1A4026]">Análise geral do progresso de perda de peso e ganho de massa de todos os alunos ativos na plataforma.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="absolute bottom-0 left-0 right-0 bg-[#0A2514]/95 backdrop-blur-md border-t border-[#1A4026] px-4 py-2 z-50 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex justify-between items-center max-w-md mx-auto h-14">
          {[
            { id: 'evolucao', label: 'Evolução', icon: TrendingUp },
            { id: 'historico', label: 'Histórico', icon: Calendar },
            ...(hasAdminAccess(profile) ? [{ id: 'financeiro', label: 'Financeiro', icon: DollarSign }] : []),
            { id: 'acompanhamento', label: 'Gestão', icon: FileText },
          ].map(tab => (
            <NavItem key={tab.id} icon={tab.icon} label={tab.label} isActive={adminTab === tab.id} onClick={() => { setAdminTab(tab.id); setGestaoView('menu'); }} />
          ))}
        </div>
      </nav>
    </div>
  )
};

const NavItem = ({ icon: Icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-12 sm:w-14 h-full relative transition-colors ${isActive ? 'text-[#D4AF37]' : 'text-[#8A9C90] hover:text-[#A0B3A6]'}`}>
    {isActive && <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#D4AF37] rounded-b-md shadow-[0_2px_8px_rgba(212,175,55,0.5)]" />}
    <Icon size={20} strokeWidth={isActive ? 2 : 1.5} className="mb-1" /><span className="text-[8px] sm:text-[9px] font-medium tracking-wide">{label}</span>
  </button>
);

const NavBar = () => {
  const { activeTab, setActiveTab } = useApp();
  const navItems = [
    { id: 'inicio', icon: Home, label: 'Início' },
    { id: 'diario', icon: Calendar, label: 'Diário' },
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
          if (!insertError && np) { setProfile(np); } 
          else { setProfile(localProfile); }
        } else {
          setProfile(localProfile);
        }
      } else {
        if (userEmail === 'corpoemmovimento.adm@gmail.com') data.is_admin = true;
        if (!data.role) data.role = data.is_admin ? 'admin' : 'aluno';
        setProfile(data);
      }

      // SEMPRE desativa a view de admin no carregamento do perfil, forçando a visão de aluno primeiro
      setAdminView(false);

      const storedOnboarding = localStorage.getItem(`onboarding_${userId}`);
      if (storedOnboarding) {
        setNeedsOnboarding(false);
      } else {
        const { data: onbData } = await supabase.from('onboarding_respostas').select('id').eq('user_id', userId).single();
        if (onbData) {
          localStorage.setItem(`onboarding_${userId}`, 'true');
          setNeedsOnboarding(false);
        } else {
          setNeedsOnboarding(true);
        }
      }

      const { count, error: notifError } = await supabase.from('notificacoes').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('lida', false);
      if (!notifError) setNotifCount(count || 0); else setNotifCount(0);
      
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      const fallbackIsAdmin = userEmail === 'corpoemmovimento.adm@gmail.com';
      const fallbackProfile = { id: userId, email: userEmail || '', nome: userMetadata?.nome || userEmail?.split('@')[0] || 'Usuário', phone: userMetadata?.phone || null, is_admin: fallbackIsAdmin, role: fallbackIsAdmin ? 'admin' : 'aluno' };
      setProfile(fallbackProfile);
      setAdminView(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishOnboarding = async (data) => {
    setNeedsOnboarding(false);
    setShowTransition(true);
    localStorage.setItem(`onboarding_${profile.id}`, 'true');

    await supabase.from('onboarding_respostas').insert([{
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

    await supabase.from('profiles').update({
      nome: data.nome,
      altura: data.altura ? Number(data.altura) : null,
      peso_atual: data.peso ? Number(data.peso) : null
    }).eq('id', profile.id);

    setProfile({ ...profile, nome: data.nome, altura: data.altura, peso_atual: data.peso });

    setTimeout(() => {
      setShowTransition(false);
    }, 3000);
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
          ) : needsOnboarding ? (
            <Onboarding profile={profile} onClose={() => setNeedsOnboarding(false)} onComplete={handleFinishOnboarding} />
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
