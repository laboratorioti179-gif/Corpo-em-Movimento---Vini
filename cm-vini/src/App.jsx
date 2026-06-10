import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  Home, Dumbbell, ClipboardList, Activity, User, Menu, Bell, ChevronRight,
  Target, Flame, Award, Settings, LogOut, ChevronLeft, Droplets, Plus, Minus, ShieldCheck,
  Edit2, Save, TrendingUp, DollarSign, Calendar, FileText, ImageIcon, Camera, RotateCcw
} from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE REAL (VIA FETCH NATIVO) ---
// Utilizamos uma implementação nativa em Fetch para contornar o bloqueio de dependências 
// externas do ambiente de preview, mantendo a exata mesma API e comunicando
// diretamente com o seu banco de dados no Supabase!
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
    update: (rows) => new SupabaseQuery(table).update(rows)
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

const modalidadesData = [
  { id: 1, titulo: 'Boxe', categoria: 'Combate', fases: 10, dietas: 2, icon: ({ size, strokeWidth }) => <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 7, titulo: 'Jiu-Jitsu', categoria: 'Luta Agarrada', fases: 10, dietas: 2, icon: ({ size, strokeWidth }) => <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 2, titulo: 'Pickleball', categoria: 'Esportes de Raquete', fases: 10, dietas: 2, icon: ({ size, strokeWidth }) => <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none"><circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 2v20" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 3, titulo: 'Corrida', categoria: 'Longa / Curta', fases: 10, dietas: 2, icon: Activity },
  { id: 4, titulo: 'Natação', categoria: 'Piscina / Mar', fases: 10, dietas: 2, icon: ({ size, strokeWidth }) => <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none"><path d="M2 12c2.667 0 5.333-2 8-2s5.333 2 8 2 5.333-2 8-2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 16c2.667 0 5.333-2 8-2s5.333 2 8 2 5.333-2 8-2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 5, titulo: 'Ciclismo', categoria: 'Longa / Curta', fases: 10, dietas: 2, icon: ({ size, strokeWidth }) => <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none"><circle cx="5" cy="18" r="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="19" cy="18" r="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 18l4-8h6l4 8M15 10l-3-6H8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 6, titulo: 'Body Builders', categoria: 'HOMEM - Mens / Classic\nMULHER - Figure / Wellness', fases: 10, dietas: 2, icon: Dumbbell }
];

const planosData = [
  { id: 1, titulo: 'Cutting Intenso', objetivo: 'Perda de Gordura', calorias: '1800 kcal' },
  { id: 2, titulo: 'Bulking Limpo', objetivo: 'Ganho de Massa', calorias: '3200 kcal' },
  { id: 3, titulo: 'Manutenção', objetivo: 'Condicionamento', calorias: '2400 kcal' }
];

// --- COMPONENTES INJETADOS GLOBALMENTE (SCREENS) ---
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
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              nome,
              phone,
              cpf,
              data_nascimento: dataNascimento,
              cidade_estado: cidadeEstado
            }
          }
        });
        if (error) throw error;
        setMessage('Conta criada com sucesso! Você já pode entrar.');
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
        setPhone('');
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
      <div className="flex flex-col items-center mb-12">
        <h1 className="text-4xl text-center leading-tight bg-gradient-to-r from-[#CFB375] to-[#AC915B] bg-clip-text text-transparent drop-shadow-md mb-2 playfair italic font-bold">
          Corpo em<br/>Movimento
        </h1>
        <p className="text-[#A0B3A6] text-sm tracking-widest uppercase mt-2">
          {isForgotPassword ? 'Recuperar Senha' : isSignUp ? 'Criar Conta' : 'Login'}
        </p>
      </div>
      <form className="w-full space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar pr-2" onSubmit={handleAuth}>
        {message && (
          <div className="bg-[#1A3020] border border-[#D4AF37]/50 text-[#D4AF37] p-3 rounded-xl text-center text-sm">
            {message}
          </div>
        )}
        
        {isSignUp && (
          <div>
            <label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">Nome Completo</label>
            <input 
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João da Silva"
              required
              className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" 
            />
          </div>
        )}

        <div>
          <label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">E-mail</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ex: seuemail@exemplo.com"
            required
            className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" 
          />
        </div>

        {isSignUp && (
          <>
            <div>
              <label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">Telefone</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: (11) 99999-9999"
                required
                className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" 
              />
            </div>
            <div>
              <label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">CPF</label>
              <input 
                type="text" 
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="Ex: 000.000.000-00"
                required
                className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" 
              />
            </div>
            <div>
              <label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">Data de Nascimento</label>
              <input 
                type="date" 
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                required
                className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" 
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">Cidade e Estado</label>
              <input 
                type="text" 
                value={cidadeEstado}
                onChange={(e) => setCidadeEstado(e.target.value)}
                placeholder="Ex: São Paulo, SP"
                required
                className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" 
              />
            </div>
          </>
        )}

        {!isForgotPassword && (
          <div>
            <label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              required
              className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" 
            />
          </div>
        )}

        {isSignUp && (
          <div>
            <label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">Confirmação de Senha</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme sua senha"
              required
              className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors" 
            />
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] font-bold text-lg py-3 rounded-xl mt-6 active:scale-95 transition-transform disabled:opacity-50 shrink-0"
        >
          {loading ? 'Aguarde...' : isForgotPassword ? 'Enviar Link' : isSignUp ? 'Criar Conta' : 'Entrar'}
        </button>
        
        <div className="flex flex-col items-center gap-3 mt-4 text-sm text-[#A0B3A6] shrink-0 pb-4">
          {!isForgotPassword && (
            <button 
              type="button" 
              onClick={() => setIsForgotPassword(true)}
              className="hover:text-[#D4AF37] transition-colors"
            >
              Esqueceu a senha?
            </button>
          )}
          <button 
            type="button" 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setIsForgotPassword(false);
              setMessage('');
            }}
            className="hover:text-[#D4AF37] transition-colors"
          >
            {isSignUp || isForgotPassword ? 'Já tenho uma conta. Fazer login' : 'Não tem conta? Criar uma'}
          </button>
        </div>
      </form>
    </div>
  );
};

const Inicio = () => {
  const { profile, setActiveTab, setSelectedModalidade, registrarConquista } = useApp();
  const scrollRef = React.useRef(null);
  const [estatisticas, setEstatisticas] = useState({ sequencia: 0, treinosMes: 0, metaMes: 20 });

  const dicasFit = [
    { id: 1, titulo: "Nova descoberta sobre hipertrofia e descanso", img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&auto=format&fit=crop&q=60" },
    { id: 2, titulo: "Alimentação pré-treino: O que realmente funciona?", img: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500&auto=format&fit=crop&q=60" },
    { id: 3, titulo: "Os benefícios ocultos da hidratação constante", img: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=500&auto=format&fit=crop&q=60" }
  ];

  useEffect(() => {
    const fetchTreinos = async () => {
      if (!profile?.id) return;
      const { data, error } = await supabase.from('treinos_realizados').select('*').eq('user_id', profile.id);
      
      if (!error && data) {
        const hoje = new Date();
        const mesAtual = data.filter(d => {
          const dData = new Date(d.created_at);
          return dData.getMonth() === hoje.getMonth() && dData.getFullYear() === hoje.getFullYear();
        });

        // Cálculo real de sequência (dias consecutivos de treino)
        const datasUnicas = [...new Set(data.map(d => {
          const dt = new Date(d.created_at);
          return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
        }))].sort((a, b) => b - a);

        let seqReal = 0;
        let dataReferencia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
        
        if (datasUnicas.length > 0) {
          if (datasUnicas[0] === dataReferencia) {
            seqReal = 1;
            dataReferencia -= 86400000; // 1 dia em milissegundos
            for (let i = 1; i < datasUnicas.length; i++) {
              if (datasUnicas[i] === dataReferencia) { seqReal++; dataReferencia -= 86400000; } else break;
            }
          } else if (datasUnicas[0] === dataReferencia - 86400000) { // Ontem
            seqReal = 1;
            dataReferencia -= 86400000 * 2;
            for (let i = 1; i < datasUnicas.length; i++) {
              if (datasUnicas[i] === dataReferencia) { seqReal++; dataReferencia -= 86400000; } else break;
            }
          }
        }

        setEstatisticas({
          sequencia: seqReal,
          treinosMes: mesAtual.length,
          metaMes: 20
        });

        if (seqReal === 1 && data.length === 1) registrarConquista("🎉 Conquista: Primeiro treino realizado!");
        if (seqReal === 5) registrarConquista("🔥 Conquista: 5 dias seguidos!");
        if (seqReal === 15) registrarConquista("🔥 Conquista: 15 dias seguidos!");
        if (seqReal === 25) registrarConquista("🔥 Conquista: 25 dias seguidos!");
        if (mesAtual.length >= 20) registrarConquista("🏆 Conquista: Meta mensal concluída!");
      }
    };
    fetchTreinos();
  }, [profile, registrarConquista]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        if (scrollLeft >= scrollWidth - clientWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: 216, behavior: 'smooth' });
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-24 text-white">
      <div className="mb-4 pt-4">
        <h2 className="text-[#D4AF37] text-xl font-serif mb-2">Bem-vindo de volta!</h2>
        <p className="text-[#A0B3A6] text-sm">Pronto para superar seus limites hoje?</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
          <Flame size={28} className="text-[#D4AF37] mb-1" />
          <span className="text-xl font-bold">{estatisticas.sequencia}</span>
          <span className="text-[#A0B3A6] text-[10px] uppercase tracking-wider">Sequência (Dias)</span>
        </div>
        <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
          <Target size={28} className="text-[#D4AF37] mb-1" />
          <span className="text-xl font-bold">{Math.min(Math.round((estatisticas.treinosMes / estatisticas.metaMes) * 100), 100)}%</span>
          <span className="text-[#A0B3A6] text-[10px] uppercase tracking-wider">Meta do Mês</span>
        </div>
        <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
          <ClipboardList size={28} className="text-[#D4AF37] mb-1" />
          <span className="text-xl font-bold">{estatisticas.treinosMes}/{estatisticas.metaMes}</span>
          <span className="text-[#A0B3A6] text-[10px] uppercase tracking-wider">Treinos Realizados</span>
        </div>
        <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
          <Activity size={28} className="text-[#D4AF37] mb-1" />
          <span className="text-xl font-bold">{profile?.peso_atual ? `${profile.peso_atual} kg` : 'N/A'}</span>
          <span className="text-[#A0B3A6] text-[10px] uppercase tracking-wider">Peso Atual</span>
        </div>
      </div>

      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
        <h3 className="text-[#D4AF37] text-sm font-semibold mb-3">Próximo Treino</h3>
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37]">
            <Dumbbell size={24} />
          </div>
          <div>
            <h4 className="font-medium">Modalidade Recomendada</h4>
            <p className="text-[#A0B3A6] text-xs">Acesse para iniciar a fase</p>
          </div>
        </div>
        <button onClick={() => {
            setActiveTab('modalidades');
        }} className="w-full bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] font-bold py-2.5 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
            Ver Treinos <ChevronRight size={18} />
        </button>
      </div>

      {/* Seção Mundo Fit (Dicas) */}
      <div className="mt-8">
        <h3 className="text-[#D4AF37] text-sm font-semibold mb-3 border-l-2 border-[#D4AF37] pl-2">Mundo Fit - Dicas</h3>
        <div ref={scrollRef} className="flex overflow-x-auto gap-4 custom-scrollbar pb-4 -mr-2 pr-2 snap-x snap-mandatory scroll-smooth">
          {dicasFit.map(dica => (
            <div key={dica.id} className="min-w-[200px] w-[200px] bg-[#0A1A10] border border-[#1A4026] rounded-2xl overflow-hidden flex-shrink-0 snap-start">
              <div className="h-28 w-full relative">
                <img src={dica.img} alt={dica.titulo} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1A10] to-transparent"></div>
              </div>
              <div className="p-3">
                <h4 className="text-sm font-medium text-white line-clamp-2 leading-snug">{dica.titulo}</h4>
                <p className="text-[#D4AF37] text-[10px] mt-2">Ver dica completa</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Planos = () => (
  <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar pb-24 text-center flex flex-col items-center justify-center h-full pt-20">
    <ClipboardList size={64} className="text-[#1A4026] mb-4" />
    <h2 className="text-[#D4AF37] text-xl font-serif mb-2">Planos Alimentares</h2>
    <p className="text-[#A0B3A6] text-sm max-w-[250px]">
      Nenhum plano disponível no momento. Em breve novidades.
    </p>
  </div>
);

const Progresso = () => {
  const { profile } = useApp();
  const [progressoUser, setProgressoUser] = useState({ mes: '', peso: '', braco: '', cintura: '', coxa: '' });
  const [historico, setHistorico] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');

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

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-24 text-white">
      <div className="mb-6 border-l-2 border-[#D4AF37] pl-3 py-1 mt-4">
        <h2 className="text-[#D4AF37] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">Evolução</h2>
        <h3 className="text-white text-lg font-medium mb-1">Seu Progresso Pessoal</h3>
      </div>
      
      {/* Gráfico Visual Dinâmico */}
      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
         <div className="flex justify-between items-center mb-4">
           <h4 className="font-medium text-[#D4AF37]">Histórico de Peso (kg)</h4>
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

      {/* Registro de Medidas pelo Aluno */}
      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-[#D4AF37] flex items-center gap-2"><Edit2 size={16}/> Atualizar Medidas</h4>
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

const Agua = () => {
  const { registrarConquista } = useApp();
  const [waterGoal, setWaterGoal] = useState(2000);
  const [waterConsumed, setWaterConsumed] = useState(0);
  const [waterInterval, setWaterInterval] = useState(60);
  const [drinkSize, setDrinkSize] = useState(250);
  const [conquistaRegistrada, setConquistaRegistrada] = useState(false);
  
  const fillPercentage = Math.min((waterConsumed / waterGoal) * 100, 100);

  useEffect(() => {
    if (fillPercentage >= 100 && !conquistaRegistrada) {
      registrarConquista("💧 Conquista: Meta de água diária concluída!");
      setConquistaRegistrada(true);
    } else if (fillPercentage < 100) {
      setConquistaRegistrada(false); // Reinicia a conquista se a meta for aumentada ou a água zerada
    }
  }, [fillPercentage, conquistaRegistrada, registrarConquista]);

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-24 text-white">
      <div className="mb-6 border-l-2 border-[#D4AF37] pl-3 py-1 mt-4">
        <h2 className="text-[#D4AF37] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">Hidratação</h2>
        <h3 className="text-white text-lg font-medium mb-1">Meta de Água</h3>
        <p className="text-[#A0B3A6] text-xs">Acompanhe e configure seu consumo diário.</p>
      </div>
      <div className="flex flex-col items-center justify-center py-2">
        <div className="relative w-32 h-48 border-[6px] border-[#1A3020] rounded-b-3xl rounded-t-lg bg-[#051109] overflow-hidden shadow-[0_0_30px_rgba(26,64,38,0.3)] cursor-pointer transition-transform active:scale-95" onClick={() => setWaterConsumed(prev => prev + drinkSize)}>
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
      <div className="flex gap-4">
        <button onClick={() => setWaterConsumed(0)} className="w-14 h-14 bg-[#0A1A10] border border-red-900/30 rounded-2xl flex items-center justify-center text-red-500 active:scale-95 transition-transform" title="Reiniciar Copo"><RotateCcw size={24} /></button>
        <button onClick={() => setWaterConsumed(prev => Math.max(0, prev - drinkSize))} className="w-14 h-14 bg-[#0A1A10] border border-[#1A4026] rounded-2xl flex items-center justify-center text-white active:scale-95 transition-transform"><Minus size={24} /></button>
        <button onClick={() => setWaterConsumed(prev => prev + drinkSize)} className="flex-1 bg-[#1A3020] border border-[#D4AF37]/30 text-[#D4AF37] rounded-2xl flex items-center justify-center gap-2 font-medium active:scale-95 transition-transform"><Plus size={24} /> Tomar {drinkSize}ml</button>
      </div>
      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 mt-2 space-y-4">
        <h4 className="text-[#D4AF37] text-sm font-semibold mb-3">Configurações</h4>
        <div className="flex justify-between items-center"><label className="text-xs text-[#A0B3A6]">Meta Diária (ml)</label><input type="number" value={waterGoal} onChange={e => setWaterGoal(Number(e.target.value))} className="bg-[#051109] border border-[#1A4026] text-white px-3 py-1.5 rounded-lg w-24 text-right text-sm focus:outline-none focus:border-[#D4AF37]" /></div>
        <div className="flex justify-between items-center"><label className="text-xs text-[#A0B3A6]">Intervalo (min)</label><input type="number" value={waterInterval} onChange={e => setWaterInterval(Number(e.target.value))} className="bg-[#051109] border border-[#1A4026] text-white px-3 py-1.5 rounded-lg w-24 text-right text-sm focus:outline-none focus:border-[#D4AF37]" /></div>
        <div className="flex justify-between items-center"><label className="text-xs text-[#A0B3A6]">Tamanho do Copo (ml)</label><input type="number" value={drinkSize} onChange={e => setDrinkSize(Number(e.target.value))} className="bg-[#051109] border border-[#1A4026] text-white px-3 py-1.5 rounded-lg w-24 text-right text-sm focus:outline-none focus:border-[#D4AF37]" /></div>
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
        <span className="mt-2 bg-[#D4AF37]/20 text-[#D4AF37] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">{profile?.is_admin ? 'Administrador' : 'Aluno PRO'}</span>
      </div>

      {/* Informações Completas do Aluno */}
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
        {profile?.is_admin && (
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

const Modalidades = () => {
  const { selectedModalidade, setSelectedModalidade, profile } = useApp();
  const [editFase, setEditFase] = useState(null);
  const [treinosLocais, setTreinosLocais] = useState({});

  if (selectedModalidade) {
    return (
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-24 text-white">
        <button onClick={() => setSelectedModalidade(null)} className="flex items-center text-[#D4AF37] mb-4 mt-4 hover:opacity-80 transition-opacity"><ChevronLeft size={20} /><span>Voltar para Modalidades</span></button>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37]">
            {selectedModalidade.icon ? <selectedModalidade.icon size={32} strokeWidth={1.5} /> : <Dumbbell size={32} strokeWidth={1.5} />}
          </div>
          <div><h2 className="text-2xl font-bold text-white">{selectedModalidade.titulo}</h2><p className="text-[#A0B3A6] text-sm">{selectedModalidade.categoria}</p></div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-[#D4AF37] text-lg font-medium border-b border-[#1A4026] pb-2 flex justify-between">
            Fases do Treinamento
            {profile?.is_admin && <span className="text-[10px] bg-[#D4AF37] text-black px-2 py-1 rounded-full uppercase tracking-wider font-bold">Modo Edição Admin</span>}
          </h3>
          {[...Array(selectedModalidade.fases)].map((_, i) => (
            <div key={`fase-${i}`} className="bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">Fase {i + 1}</span>
                {profile?.is_admin && editFase !== i && (
                  <button onClick={() => setEditFase(i)} className="text-[#D4AF37] text-xs flex items-center gap-1 hover:underline"><Edit2 size={12}/> Editar Treino</button>
                )}
                {profile?.is_admin && editFase === i && (
                  <button onClick={() => setEditFase(null)} className="text-green-500 text-xs flex items-center gap-1 hover:underline"><Save size={12}/> Salvar</button>
                )}
              </div>
              
              {editFase === i ? (
                <textarea 
                  className="w-full bg-[#051109] border border-[#D4AF37] text-white p-3 rounded-lg mt-2 text-sm min-h-[80px] outline-none"
                  placeholder="Descreva o treino desta fase para os alunos..."
                  value={treinosLocais[`${selectedModalidade.id}-${i}`] || ''}
                  onChange={(e) => setTreinosLocais({...treinosLocais, [`${selectedModalidade.id}-${i}`]: e.target.value})}
                  autoFocus
                />
              ) : (
                <p className="text-sm text-[#A0B3A6] mt-1 whitespace-pre-line">
                  {treinosLocais[`${selectedModalidade.id}-${i}`] || 'Treino padrão da fase. O administrador ainda não personalizou a rotina.'}
                </p>
              )}
              
              {!profile?.is_admin && (
                <button 
                  onClick={async () => {
                    await supabase.from('treinos_realizados').insert([{ user_id: profile.id, modalidade_nome: `${selectedModalidade.titulo} - Fase ${i+1}` }]);
                    alert("Treino concluído com sucesso!");
                  }}
                  className="mt-2 bg-[#1A3020] border border-[#D4AF37]/30 text-[#D4AF37] py-1.5 rounded-lg text-xs font-medium active:scale-95 transition-transform"
                >
                  Marcar como Concluído
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-4 mt-8">
          <h3 className="text-[#D4AF37] text-lg font-medium border-b border-[#1A4026] pb-2">Dietas Recomendadas</h3>
          {[...Array(selectedModalidade.dietas)].map((_, i) => {
            const pdfUrl = `${supabaseUrl}/storage/v1/object/public/dietas/modalidade-${selectedModalidade.id}-dieta-${i}.pdf`;
            return (
              <div key={`dieta-${i}`} className="bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <ClipboardList className="text-[#D4AF37]" size={20} />
                  <span className="font-medium">Dieta Opção {i + 1}</span>
                </div>
                {profile?.is_admin ? (
                  <label className="text-xs text-[#D4AF37] border border-[#D4AF37] px-3 py-2 rounded-lg cursor-pointer text-center active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <input type="file" accept="application/pdf" className="hidden" onChange={async (e) => {
                      const file = e.target.files[0];
                      if(!file) return;
                      const fileName = `modalidade-${selectedModalidade.id}-dieta-${i}.pdf`;
                      const { error } = await supabase.storage.from('dietas').upload(fileName, file, { upsert: true });
                      if(error) alert('Erro ao fazer upload: ' + error.message);
                      else alert('PDF salvo com sucesso!');
                    }} />
                    Carregar PDF da Dieta
                  </label>
                ) : (
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="bg-[#1A3020] text-[#D4AF37] text-xs font-bold px-3 py-2 rounded-lg text-center active:scale-95 transition-transform">
                    Abrir Dieta (PDF)
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar pb-24">
      <div className="mb-6 border-l-2 border-[#D4AF37] pl-3 py-1 mt-4">
        <h2 className="text-[#D4AF37] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">Modalidades</h2>
        <h3 className="text-white text-lg font-medium mb-1">Escolha sua modalidade</h3>
        <p className="text-[#A0B3A6] text-xs max-w-[280px]">Selecione sua modalidade para acessar os treinos e planos alimentares.</p>
      </div>
      {modalidadesData.map((item) => (
        <button key={item.id} onClick={() => setSelectedModalidade(item)} className="w-full bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98] hover:border-[#2A5036]">
          <div className="w-14 h-14 rounded-full bg-[#1A3020] flex items-center justify-center flex-shrink-0 text-[#D4AF37]"><item.icon size={26} strokeWidth={1.5} /></div>
          <div className="flex-1 text-left"><h4 className="text-white text-base font-medium mb-0.5">{item.titulo}</h4><p className="text-[#D4AF37] text-[10px] mb-0.5">Categoria:</p><p className="text-[#A0B3A6] text-[10px] whitespace-pre-line">{item.categoria}</p></div>
          <div className="flex flex-col items-end gap-1 text-right"><span className="text-[#D4AF37] text-[10px] font-medium bg-[#1A3020] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">{item.fases} Fases</span><span className="text-[#D4AF37] text-[10px] font-medium bg-[#1A3020] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">{item.dietas} Dietas</span></div>
          <div className="text-[#D4AF37] ml-2 opacity-80"><ChevronRight size={18} strokeWidth={2} /></div>
        </button>
      ))}
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
    if (!error) {
      loadNotificacoes();
    }
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

// --- ÁREA ADMINISTRATIVA ---
const AdminPanel = ({ onExitAdmin }) => {
  const [adminTab, setAdminTab] = useState('evolucao');
  const [gestaoView, setGestaoView] = useState('menu');
  
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [progressoAluno, setProgressoAluno] = useState([]);
  const [showDesempenho, setShowDesempenho] = useState(false);
  const [ranking, setRanking] = useState([]);
  
  const [novaModalidade, setNovaModalidade] = useState({ titulo: '', categoria: '', fases: 10, dietas: 2 });

  useEffect(() => {
    const fetchAlunos = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('is_admin', false);
      if (data) {
        setAlunos(data);
        const { data: treinos } = await supabase.from('treinos_realizados').select('*');
        if (treinos) {
          const r = data.map(a => ({
            ...a,
            treinosCount: treinos.filter(t => t.user_id === a.id).length
          })).sort((a, b) => b.treinosCount - a.treinosCount);
          setRanking(r);
        } else {
          setRanking(data.map(a => ({...a, treinosCount: 0})));
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
    const { error } = await supabase.from('notificacoes').insert([{
      user_id: alunoSelecionado,
      mensagem: mensagem,
      lida: false
    }]);
    
    if (!error) {
      setStatusMsg('Mensagem enviada!');
      setMensagem('');
    } else {
      setStatusMsg('Erro ao enviar.');
    }
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleCriarModalidade = async () => {
    if (!novaModalidade.titulo || !novaModalidade.categoria) {
        setStatusMsg('Preencha título e categoria.');
        setTimeout(() => setStatusMsg(''), 3000);
        return;
    }
    setStatusMsg('Criando...');
    const { error } = await supabase.from('modalidades_custom').insert([novaModalidade]);
    if (!error) {
        setStatusMsg('Criado com sucesso!');
        setNovaModalidade({ titulo: '', categoria: '', fases: 10, dietas: 2 });
    } else {
        setStatusMsg('Erro ao criar modalidade.');
    }
    setTimeout(() => setStatusMsg(''), 3000);
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
        <h2 className="text-2xl font-bold text-[#D4AF37] playfair italic">Área Administrativa</h2>
        <button onClick={onExitAdmin} className="w-10 h-10 rounded-full bg-[#1A3020] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] active:scale-95">
          <LogOut size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar pb-24">
        {/* TAB: EVOLUÇÃO DE ALUNO */}
        {adminTab === 'evolucao' && (
          <div className="space-y-6">
            <h3 className="text-xl font-medium mb-4 border-l-2 border-[#D4AF37] pl-3">Evolução de Aluno</h3>
            
            <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
              <label className="text-xs text-[#A0B3A6] mb-2 block">Selecione o Aluno</label>
              <select
                className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg focus:border-[#D4AF37] outline-none"
                value={alunoSelecionado}
                onChange={(e) => setAlunoSelecionado(e.target.value)}
              >
                <option value="">Selecione um aluno...</option>
                {alunos.map(a => (
                  <option key={a.id} value={a.id}>{a.nome || a.email}</option>
                ))}
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
                      <textarea 
                        value={mensagem}
                        onChange={e => setMensagem(e.target.value)}
                        placeholder="Digite a mensagem..."
                        className="w-full bg-[#051109] border border-[#1A4026] text-white p-2 rounded-lg text-xs outline-none resize-none mb-2 custom-scrollbar"
                        rows="2"
                      />
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

        {/* TAB: HISTÓRICO */}
        {adminTab === 'historico' && (
          <div className="space-y-6">
            <h3 className="text-xl font-medium mb-4 border-l-2 border-[#D4AF37] pl-3">Histórico de Alunos</h3>
            <div className="space-y-3">
              <div className="bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex justify-between items-center">
                <div><h4 className="font-medium">Histórico de Treinos</h4><p className="text-xs text-[#A0B3A6]">Consultar treinos realizados</p></div>
                <ChevronRight className="text-[#D4AF37]" size={20} />
              </div>
              <div className="bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex justify-between items-center">
                <div><h4 className="font-medium">Histórico Alimentar/Dieta</h4><p className="text-xs text-[#A0B3A6]">Revisão de planos da nutrição</p></div>
                <ChevronRight className="text-[#D4AF37]" size={20} />
              </div>
              <div className="bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex justify-between items-center">
                <div><h4 className="font-medium">Consulta de Registros Anteriores</h4><p className="text-xs text-[#A0B3A6]">Avaliação geral</p></div>
                <ChevronRight className="text-[#D4AF37]" size={20} />
              </div>
            </div>
          </div>
        )}

        {/* TAB: GESTÃO FINANCEIRA */}
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

        {/* TAB: ACOMPANHAMENTO (GESTÃO DE TREINOS E ALUNOS) */}
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
                <button onClick={() => setGestaoView('criar_treinos')} className="w-full bg-[#1A3020] border border-[#D4AF37]/50 rounded-xl p-4 flex justify-between items-center active:scale-95 transition-transform mt-6 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                  <div className="text-left"><h4 className="font-medium text-[#D4AF37]">Criar Modalidades e Treinos</h4><p className="text-xs text-[#A0B3A6]">Adicionar novas opções no App</p></div><Dumbbell className="text-[#D4AF37]" size={20} />
                </button>
              </div>
            )}

            {gestaoView === 'criar_treinos' && (
              <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-4">
                <div className="flex justify-between items-center border-b border-[#1A4026] pb-2">
                  <h4 className="text-[#D4AF37] font-medium flex items-center gap-2">Nova Modalidade <Plus size={14}/></h4>
                  {statusMsg && <span className="text-[#D4AF37] text-xs font-medium">{statusMsg}</span>}
                </div>
                <div>
                  <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Título da Modalidade</label>
                  <input type="text" value={novaModalidade.titulo} onChange={e => setNovaModalidade({...novaModalidade, titulo: e.target.value})} placeholder="Ex: Crossfit" className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Categoria / Descrição</label>
                  <input type="text" value={novaModalidade.categoria} onChange={e => setNovaModalidade({...novaModalidade, categoria: e.target.value})} placeholder="Ex: Alta Intensidade" className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Nº de Fases</label>
                    <input type="number" value={novaModalidade.fases} onChange={e => setNovaModalidade({...novaModalidade, fases: parseInt(e.target.value)})} className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#A0B3A6] uppercase tracking-wider">Nº de Dietas</label>
                    <input type="number" value={novaModalidade.dietas} onChange={e => setNovaModalidade({...novaModalidade, dietas: parseInt(e.target.value)})} className="w-full bg-[#051109] border border-[#1A4026] text-white px-3 py-2 rounded-lg mt-1 focus:border-[#D4AF37] outline-none" />
                  </div>
                </div>
                <button onClick={handleCriarModalidade} className="w-full bg-[#D4AF37] text-[#051109] font-bold py-3 rounded-xl mt-4 active:scale-95 transition-transform flex justify-center items-center gap-2">Salvar Modalidade <Save size={18}/></button>
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

      {/* Menu Inferior (Padrão do App) */}
      <nav className="absolute bottom-0 left-0 right-0 bg-[#0A2514]/95 backdrop-blur-md border-t border-[#1A4026] px-4 py-2 z-50 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex justify-between items-center max-w-md mx-auto h-14">
          {[
            { id: 'evolucao', label: 'Evolução', icon: TrendingUp },
            { id: 'historico', label: 'Histórico', icon: Calendar },
            { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
            { id: 'acompanhamento', label: 'Gestão', icon: FileText },
          ].map(tab => (
            <NavItem 
              key={tab.id} 
              icon={tab.icon} 
              label={tab.label} 
              isActive={adminTab === tab.id} 
              onClick={() => { setAdminTab(tab.id); setGestaoView('menu'); }} 
            />
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
  const { activeTab, setActiveTab, setSelectedModalidade } = useApp();
  const navItems = [
    { id: 'inicio', icon: Home, label: 'Início' },
    { id: 'modalidades', icon: Dumbbell, label: 'Treinos' },
    { id: 'planos', icon: ClipboardList, label: 'Planos' },
    { id: 'progresso', icon: Activity, label: 'Evolução' },
    { id: 'agua', icon: Droplets, label: 'Água' },
    { id: 'perfil', icon: User, label: 'Perfil' }
  ];
  return (
    <>
      <GlobalStyles />
      <nav className="absolute bottom-0 left-0 right-0 bg-[#0A2514]/95 backdrop-blur-md border-t border-[#1A4026] px-4 py-2 z-50 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex justify-between items-center max-w-md mx-auto h-14">
          {navItems.map(item => <NavItem key={item.id} icon={item.icon} label={item.label} isActive={activeTab === item.id} onClick={() => { setActiveTab(item.id); setSelectedModalidade(null); }} />)}
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
  const [selectedModalidade, setSelectedModalidade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminView, setAdminView] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    // Define o idioma e bloqueia a tradução automática do navegador
    document.documentElement.lang = 'pt-BR';
    document.documentElement.setAttribute('translate', 'no');
    let metaGoogle = document.querySelector('meta[name="google"]');
    if (!metaGoogle) {
      metaGoogle = document.createElement('meta');
      metaGoogle.name = 'google';
      document.head.appendChild(metaGoogle);
    }
    metaGoogle.content = 'notranslate';

    // Injetar Ícone e Configurações de PWA (Web/App)
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
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', userId).single();

      // Verifica se a tabela não existe (PGRST205) ou erro similar
      const isMissingTable = error?.code === 'PGRST205' || error?.message?.includes('not find the table') || error?.code === '404';

      if (error && error.code !== 'PGRST116' && !isMissingTable) throw error;

      if (!data || isMissingTable) {
        const nome = userMetadata?.nome || userEmail?.split('@')[0] || 'Usuário';
        const phone = userMetadata?.phone || null;
        const cpf = userMetadata?.cpf || null;
        const data_nascimento = userMetadata?.data_nascimento || null;
        const cidade_estado = userMetadata?.cidade_estado || null;
        
        // Define 'corpoemmovimento.adm@gmail.com' como admin para testar facilmente
        const is_admin = userEmail === 'corpoemmovimento.adm@gmail.com';

        const localProfile = { 
            id: userId, 
            email: userEmail || '', 
            nome,
            phone,
            cpf,
            data_nascimento,
            cidade_estado,
            is_admin
        };

        if (!isMissingTable) {
          // Tabela existe mas usuário não, tenta inserir
          const { data: np, error: insertError } = await supabase
            .from('profiles')
            .insert([localProfile])
            .select().single();
            
          if (!insertError && np) {
            setProfile(np);
            if (np.is_admin) setAdminView(true);
          } else {
            setProfile(localProfile);
            if (localProfile.is_admin) setAdminView(true);
          }
        } else {
          // Tabela não existe, usa os dados do metadata em memória para não travar o app
          setProfile(localProfile);
          if (localProfile.is_admin) setAdminView(true);
        }
      } else {
        if (userEmail === 'corpoemmovimento.adm@gmail.com') {
          data.is_admin = true;
        }
        setProfile(data);
        if (data && data.is_admin) setAdminView(true);
      }

      const { count, error: notifError } = await supabase
        .from('notificacoes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('lida', false);
        
      if (!notifError) {
        setNotifCount(count || 0);
      } else {
        setNotifCount(0); // Ignora se a tabela não existir
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      // Fallback final para não bloquear o acesso
      const fallbackProfile = {
        id: userId, 
        email: userEmail || '', 
        nome: userMetadata?.nome || userEmail?.split('@')[0] || 'Usuário',
        phone: userMetadata?.phone || null,
        is_admin: userEmail === 'corpoemmovimento.adm@gmail.com'
      };
      setProfile(fallbackProfile);
      if (fallbackProfile.is_admin) setAdminView(true);
    } finally {
      setLoading(false);
    }
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
    selectedModalidade, setSelectedModalidade,
    handleLogout,
    reloadProfile: () => session && loadProfile(session.user.id, session.user.email, session.user.user_metadata),
    notifCount, setNotifCount,
    setAdminView,
    registrarConquista,
  };

  return (
    <AppContext.Provider value={ctx}>
      <div className="min-h-screen bg-[#051109] flex items-center justify-center sm:p-4">
        <div className="w-full h-screen sm:h-[852px] sm:max-w-[393px] flex flex-col relative overflow-hidden sm:rounded-[3rem] sm:border-[8px] sm:border-black shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-[#051109] text-white">

          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-cover bg-center"
               style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop")' }} />
          <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#143B21] to-transparent opacity-50 pointer-events-none z-0" />

          {!session ? (
            <Login />
          ) : profile?.is_admin && adminView ? (
            <AdminPanel onExitAdmin={() => setAdminView(false)} />
          ) : (
            <>
              <header className="flex justify-between items-center px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))] relative z-10 flex-shrink-0">
                <button
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#D4AF37] transition-transform active:scale-95"
                  onClick={() => { setActiveTab('perfil'); setSelectedModalidade(null); }}
                >
                  {profile?.foto_url ? (
                    <img src={profile.foto_url} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37]">
                      <User size={20} strokeWidth={1.5} />
                    </div>
                  )}
                </button>

                <h1 className="text-xl text-center leading-tight bg-gradient-to-r from-[#CFB375] to-[#AC915B] bg-clip-text text-transparent playfair italic font-bold">
                  Corpo em<br />Movimento
                </h1>

                <div className="flex items-center gap-2">
                  {profile?.is_admin && (
                    <button
                      onClick={() => setAdminView(true)}
                      title="Área Administrativa"
                      className="w-10 h-10 rounded-full bg-[#1A3020] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] active:scale-95 transition-transform"
                    >
                      <ShieldCheck size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => setActiveTab('notificacoes')}
                    className="w-10 h-10 rounded-full bg-[#051109] flex items-center justify-center text-[#D4AF37] relative transition-transform active:scale-95"
                  >
                    <Bell size={22} strokeWidth={2} />
                    {notifCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#051109]" />
                    )}
                  </button>
                </div>
              </header>

              <main className="flex-1 px-6 relative z-10 flex flex-col overflow-hidden">
                {activeTab === 'inicio' && <Inicio />}
                {activeTab === 'modalidades' && <Modalidades />}
                {activeTab === 'planos' && <Planos />}
                {activeTab === 'progresso' && <Progresso />}
                {activeTab === 'agua' && <Agua />}
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
