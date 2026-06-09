import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from './supabaseClient';
import Login from './screens/Login';
import NavBar from './components/NavBar';
import Inicio from './screens/Inicio';
import Modalidades from './screens/Modalidades';
import Planos from './screens/Planos';
import Progresso from './screens/Progresso';
import Agua from './screens/Agua';
import Perfil from './screens/Perfil';
import AdminPanel from './screens/admin/AdminPanel';
import { Bell, User, ShieldCheck } from 'lucide-react';

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('inicio');
  const [selectedModalidade, setSelectedModalidade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminView, setAdminView] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id, session.user.email);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        setLoading(true); // mantém spinner → evita flash de tela errada
        await loadProfile(session.user.id, session.user.email);
      } else { setProfile(null); setAdminView(false); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId, userEmail) => {
    try {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', userId).single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        const nome = userEmail?.split('@')[0] || 'Usuário';
        const { data: np } = await supabase
          .from('profiles')
          .insert([{ id: userId, email: userEmail || '', nome }])
          .select().single();
        setProfile(np);
      } else {
        setProfile(data);
        if (data.is_admin) setAdminView(true);
      }

      const { count } = await supabase
        .from('notificacoes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('lida', false);
      setNotifCount(count || 0);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null); setAdminView(false); setActiveTab('inicio');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#051109] flex items-center justify-center">
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
    reloadProfile: () => session && loadProfile(session.user.id, session.user.email),
    notifCount, setNotifCount,
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
                  <button className="w-10 h-10 rounded-full bg-[#051109] flex items-center justify-center text-[#D4AF37] relative">
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
              </main>

              <NavBar />
            </>
          )}
        </div>
      </div>
    </AppContext.Provider>
  );
}

import React, { useState, useEffect } from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { useApp } from '../App';
import { supabase } from '../supabaseClient';

export default function Agua() {
  const { session } = useApp();
  const [waterGoal, setWaterGoal] = useState(2000);
  const [waterConsumed, setWaterConsumed] = useState(0);
  const [waterInterval, setWaterInterval] = useState(60);
  const [drinkSize, setDrinkSize] = useState(250);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!session) return;
    loadToday();
  }, [session]);

  const loadToday = async () => {
    const { data } = await supabase
      .from('consumo_agua')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('data_registro', today)
      .single();
    if (data) {
      setWaterGoal(data.meta_ml);
      setWaterConsumed(data.consumido_ml);
    }
  };

  const saveWater = async (consumed, goal) => {
    if (!session || saving) return;
    setSaving(true);
    await supabase.from('consumo_agua').upsert(
      { user_id: session.user.id, data_registro: today, meta_ml: goal, consumido_ml: consumed },
      { onConflict: 'user_id,data_registro' }
    );
    setSaving(false);
  };

  const add = () => {
    const next = waterConsumed + drinkSize;
    setWaterConsumed(next);
    saveWater(next, waterGoal);
  };

  const remove = () => {
    const next = Math.max(0, waterConsumed - drinkSize);
    setWaterConsumed(next);
    saveWater(next, waterGoal);
  };

  const esvaziar = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    setConfirmReset(false);
    setWaterConsumed(0);
    saveWater(0, waterGoal);
  };

  const updateGoal = (val) => {
    setWaterGoal(val);
    saveWater(waterConsumed, val);
  };

  const fill = Math.min((waterConsumed / waterGoal) * 100, 100);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-4 space-y-5">
      <div className="border-l-2 border-[#D4AF37] pl-3 py-1 mt-2">
        <p className="text-[#D4AF37] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">Hidratação</p>
        <h3 className="text-white text-lg font-medium">Meta de Água</h3>
        <p className="text-[#A0B3A6] text-xs">Acompanhe seu consumo diário de água.</p>
      </div>

      {/* Copo */}
      <div className="flex flex-col items-center py-2">
        <div
          className="relative w-32 h-48 border-[6px] border-[#1A3020] rounded-b-3xl rounded-t-lg bg-[#051109] overflow-hidden shadow-[0_0_30px_rgba(26,64,38,0.3)] cursor-pointer transition-transform active:scale-95"
          onClick={add}
        >
          <div className="absolute top-1/4 left-0 w-2 h-0.5 bg-[#1A3020] z-10" />
          <div className="absolute top-2/4 left-0 w-2 h-0.5 bg-[#1A3020] z-10" />
          <div className="absolute top-3/4 left-0 w-2 h-0.5 bg-[#1A3020] z-10" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-700 ease-in-out opacity-90"
            style={{ height: `${fill}%` }}
          >
            <div className="absolute top-0 left-0 right-0 h-2 bg-cyan-300/60 rounded-t-full" />
          </div>
        </div>
        <div className="mt-5 flex flex-col items-center">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-[#D4AF37]">{waterConsumed}</span>
            <span className="text-[#A0B3A6] text-lg">/ {waterGoal} ml</span>
          </div>
          <p className={`text-xs font-semibold uppercase tracking-widest mt-1 ${fill >= 100 ? 'text-green-400' : 'text-[#D4AF37]'}`}>
            {fill >= 100 ? '🎉 Meta Atingida!' : `${Math.round(fill)}% da meta`}
          </p>
        </div>
      </div>

      {/* Botões + / - */}
      <div className="flex gap-3">
        <button
          onClick={remove}
          className="w-14 h-14 bg-[#0A1A10] border border-[#1A4026] rounded-2xl flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <Minus size={22} />
        </button>
        <button
          onClick={add}
          className="flex-1 bg-[#1A3020] border border-[#D4AF37]/30 text-[#D4AF37] rounded-2xl flex items-center justify-center gap-2 font-semibold active:scale-95 transition-transform"
        >
          <Plus size={22} /> Beber {drinkSize} ml
        </button>
      </div>

      {/* ✅ NOVO — Esvaziar Copo */}
      <button
        onClick={esvaziar}
        className={`w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-300 active:scale-95
          ${confirmReset
            ? 'bg-red-700 border border-red-500 text-white animate-pulse'
            : 'bg-[#0A1A10] border border-red-900/50 text-red-400'
          }`}
      >
        <RotateCcw size={18} />
        {confirmReset ? 'Toque novamente para confirmar' : 'Esvaziar o Copo'}
      </button>

      {/* Configurações */}
      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 space-y-4">
        <h4 className="text-[#D4AF37] text-sm font-semibold">Configurações</h4>
        {[
          { label: 'Meta Diária (ml)', value: waterGoal, onChange: v => updateGoal(Number(v)) },
          { label: 'Intervalo de lembrete (min)', value: waterInterval, onChange: v => setWaterInterval(Number(v)) },
          { label: 'Tamanho do copo (ml)', value: drinkSize, onChange: v => setDrinkSize(Number(v)) },
        ].map(({ label, value, onChange }) => (
          <div key={label} className="flex justify-between items-center">
            <label className="text-xs text-[#A0B3A6]">{label}</label>
            <input
              type="number"
              value={value}
              onChange={e => onChange(e.target.value)}
              className="bg-[#051109] border border-[#1A4026] text-white px-3 py-1.5 rounded-lg w-24 text-right text-sm focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Flame, Target, Dumbbell, Clock, Zap, CheckCircle, Circle, Droplets } from 'lucide-react';
import { useApp } from '../App';
import { supabase } from '../supabaseClient';

const NEWS = [
  {
    id: 1,
    titulo: 'Estudo comprova: 30 min de musculação reduz risco cardíaco em 40%',
    resumo: 'Pesquisa do British Journal of Sports Medicine mostra que o treino de força supera o cardio na proteção cardiovascular a longo prazo.',
    imagem: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=700&q=80',
    categoria: 'Saúde', tempo: '3 min',
  },
  {
    id: 2,
    titulo: 'O Que Comer Antes e Depois do Treino para Maximizar Resultados',
    resumo: 'Nutricionistas esportivos revelam as melhores estratégias de alimentação para potencializar a performance e a recuperação muscular.',
    imagem: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=700&q=80',
    categoria: 'Nutrição', tempo: '5 min',
  },
  {
    id: 3,
    titulo: 'Boxe Feminino bate recorde de adesão no Brasil em 2025',
    resumo: 'Modalidade cresceu 60% entre mulheres. Condiciona o corpo todo, alivia estresse e desenvolve autoconfiança de forma incomparável.',
    imagem: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=700&q=80',
    categoria: 'Modalidades', tempo: '4 min',
  },
  {
    id: 4,
    titulo: 'Hidratação e Performance: A Ciência por Trás dos 2 Litros',
    resumo: 'Especialistas desbancam o mito e explicam o consumo ideal baseado em peso corporal, clima e intensidade do exercício.',
    imagem: 'https://images.unsplash.com/photo-1559181567-c3190ca9d70?w=700&q=80',
    categoria: 'Saúde', tempo: '3 min',
  },
  {
    id: 5,
    titulo: 'Jiu-Jitsu: Técnica, Disciplina e Superação na Arte Suave',
    resumo: 'A modalidade que ensina muito mais do que golpes — desenvolve paciência, resiliência e inteligência sob pressão.',
    imagem: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=700&q=80',
    categoria: 'Modalidades', tempo: '4 min',
  },
  {
    id: 6,
    titulo: 'Recuperação Muscular: Como o Descanso Multiplica seus Ganhos',
    resumo: 'O descanso é onde o músculo realmente cresce. Saiba como otimizar seu sono, alimentação e active recovery.',
    imagem: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=700&q=80',
    categoria: 'Treino', tempo: '4 min',
  },
  {
    id: 7,
    titulo: 'Musculação Feminina: Desmontando os Mitos de Uma Vez Por Todas',
    resumo: 'Mulheres que treinam com pesos não ficam "masculinas" — ficam mais fortes, mais definidas e com mais energia no dia a dia.',
    imagem: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=700&q=80',
    categoria: 'Treino', tempo: '5 min',
  },
  {
    id: 8,
    titulo: 'Ciclismo Indoor: O Cardio de Alta Intensidade que Poupa as Articulações',
    resumo: 'Spinning queima até 600 calorias em 45 minutos com baixo impacto. Entenda por que a modalidade conquista cada vez mais adeptos.',
    imagem: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?w=700&q=80',
    categoria: 'Modalidades', tempo: '3 min',
  },
];

const DESAFIOS = [
  { emoji: '🏃', titulo: 'Desafio Cardio',       descricao: 'Faça 20 minutos de cardio contínuo hoje',              xp: 50 },
  { emoji: '💪', titulo: 'Desafio Força',        descricao: '3 séries de 15 agachamentos sem descanso',             xp: 60 },
  { emoji: '💧', titulo: 'Desafio Hidratação',   descricao: 'Beba pelo menos 2,5 litros de água hoje',              xp: 40 },
  { emoji: '🧘', titulo: 'Desafio Flexibilidade',descricao: '10 minutos de alongamento ao acordar',                 xp: 30 },
  { emoji: '⚡', titulo: 'Desafio Resistência',  descricao: 'Prancha: 3 séries de 1 minuto com 30s de descanso',    xp: 55 },
  { emoji: '🥊', titulo: 'Desafio Técnica',      descricao: 'Pratique 100 socos no ar com boa postura',             xp: 45 },
  { emoji: '🔥', titulo: 'Desafio Total',        descricao: 'Complete seu treino + 10 min extra de cardio',         xp: 75 },
];

const FRASES = [
  { frase: 'O único mau treino é aquele que não foi feito.',                           autor: '' },
  { frase: 'Seu corpo pode fazer quase tudo. É a sua mente que você precisa convencer.', autor: '' },
  { frase: 'Cuide do seu corpo — é o único lugar que você tem para viver.',            autor: 'Jim Rohn' },
  { frase: 'Consistência supera intensidade. Todo. Único. Dia.',                       autor: '' },
  { frase: 'Dor é temporária. Desistir dura para sempre.',                             autor: 'Lance Armstrong' },
  { frase: 'O esforço de hoje é a conquista de amanhã.',                               autor: '' },
  { frase: 'Seja mais forte do que suas desculpas.',                                   autor: '' },
  { frase: 'Não conte os dias. Faça os dias contarem.',                                autor: 'Muhammad Ali' },
  { frase: 'Cada rep te aproxima de quem você quer ser.',                              autor: '' },
  { frase: 'A disciplina é a ponte entre metas e realizações.',                        autor: 'Jim Rohn' },
];

const DICAS = [
  'Aqueça por pelo menos 5 minutos antes de qualquer treino intenso para prevenir lesões.',
  'Respire de forma controlada: expire no esforço, inspire na fase de recuperação.',
  'Priorize proteína na refeição pós-treino — a janela anabólica dura até 2 horas.',
  'Durma 7–9 horas por noite. É onde 70% da recuperação muscular acontece.',
  'Progrida gradualmente. Aumente carga ou volume no máximo 10% por semana.',
  'Beba água antes, durante e após o treino. A desidratação reduz a performance em 20%.',
  'Varie os treinos a cada 4–6 semanas para evitar adaptação e platôs.',
];

const categoryColor = {
  'Treino':      'bg-blue-900/60 text-blue-300',
  'Nutrição':    'bg-green-900/60 text-green-300',
  'Modalidades': 'bg-purple-900/60 text-purple-300',
  'Saúde':       'bg-teal-900/60 text-teal-300',
};

export default function Inicio() {
  const { profile, session, setActiveTab } = useApp();
  const [current, setCurrent] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalTreinos, setTotalTreinos] = useState(0);
  const [desafioConcluido, setDesafioConcluido] = useState(false);
  const timerRef = useRef(null);

  const firstName  = profile?.nome?.split(' ')[0] || 'Atleta';
  const todayStr   = new Date().toISOString().split('T')[0];
  const dayOfWeek  = new Date().getDay();
  const dayOfMonth = new Date().getDate();

  const desafio = DESAFIOS[dayOfWeek % DESAFIOS.length];
  const frase   = FRASES[dayOfMonth % FRASES.length];
  const dica    = DICAS[dayOfMonth % DICAS.length];

  useEffect(() => {
    const key = `desafio-${todayStr}`;
    setDesafioConcluido(localStorage.getItem(key) === '1');
  }, [todayStr]);

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % NEWS.length), 4500);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!session) return;
    loadStats();
  }, [session]);

  const loadStats = async () => {
    const userId = session.user.id;
    const { count } = await supabase
      .from('treinos_realizados').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    setTotalTreinos(count || 0);

    const { data: treinos } = await supabase
      .from('treinos_realizados')
      .select('data_treino').eq('user_id', userId).order('data_treino', { ascending: false }).limit(30);

    if (treinos && treinos.length > 0) {
      let s = 0, d = new Date();
      d.setHours(0, 0, 0, 0);
      for (const t of treinos) {
        const td = new Date(t.data_treino + 'T00:00:00');
        const diff = Math.round((d - td) / 86400000);
        if (diff <= 1) { s++; d = td; } else break;
      }
      setStreak(s);
    }
  };

  const goTo = (idx) => {
    clearInterval(timerRef.current);
    setCurrent(idx);
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % NEWS.length), 4500);
  };

  const concluirDesafio = () => {
    const key = `desafio-${todayStr}`;
    if (desafioConcluido) { localStorage.removeItem(key); setDesafioConcluido(false); }
    else { localStorage.setItem(key, '1'); setDesafioConcluido(true); }
  };

  const news = NEWS[current];

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-4 space-y-5">

      {/* Saudação */}
      <div className="pt-2">
        <h2 className="text-[#D4AF37] text-xl font-semibold">Olá, {firstName}! 💪</h2>
        <p className="text-[#A0B3A6] text-sm mt-0.5">Pronto para superar seus limites hoje?</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-3 flex flex-col items-center text-center">
          <Flame size={24} className="text-[#D4AF37] mb-1" />
          <span className="text-xl font-bold">{streak}</span>
          <span className="text-[#A0B3A6] text-[9px] uppercase tracking-wider leading-tight">Dias<br/>Seguidos</span>
        </div>
        <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-3 flex flex-col items-center text-center">
          <Dumbbell size={24} className="text-[#D4AF37] mb-1" />
          <span className="text-xl font-bold">{totalTreinos}</span>
          <span className="text-[#A0B3A6] text-[9px] uppercase tracking-wider leading-tight">Treinos<br/>Realizados</span>
        </div>
        <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-3 flex flex-col items-center text-center">
          <Target size={24} className="text-[#D4AF37] mb-1" />
          <span className="text-xl font-bold">{profile?.objetivo ? '✓' : '—'}</span>
          <span className="text-[#A0B3A6] text-[9px] uppercase tracking-wider leading-tight">Meta<br/>Definida</span>
        </div>
      </div>

      {/* Carrossel de Notícias */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-sm font-semibold">Mundo Fit — Notícias</h3>
          <span className="text-[#A0B3A6] text-[10px]">{current + 1}/{NEWS.length}</span>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-[#0A1A10] border border-[#1A4026]">
          <div className="relative h-48 overflow-hidden">
            {NEWS.map((item, idx) => (
              <div
                key={item.id}
                className="absolute inset-0 transition-opacity duration-700"
                style={{ opacity: idx === current ? 1 : 0, zIndex: idx === current ? 1 : 0 }}
              >
                <img src={item.imagem} alt={item.titulo} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#051109] via-[#051109]/50 to-transparent" />
              </div>
            ))}
            <div className="absolute bottom-3 left-3 right-3 z-10">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${categoryColor[news.categoria] || 'bg-[#1A3020] text-[#D4AF37]'}`}>
                  {news.categoria}
                </span>
                <span className="text-[#A0B3A6] text-[9px] flex items-center gap-1">
                  <Clock size={10} /> {news.tempo} de leitura
                </span>
              </div>
              <h4 className="text-white text-sm font-semibold leading-tight">{news.titulo}</h4>
            </div>
          </div>

          <div className="px-3 pt-2 pb-1">
            <p className="text-[#A0B3A6] text-xs leading-relaxed line-clamp-2">{news.resumo}</p>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 py-3">
            {NEWS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`rounded-full transition-all duration-300 ${
                  idx === current ? 'w-6 h-1.5 bg-[#D4AF37]' : 'w-1.5 h-1.5 bg-[#1A4026]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Desafio do Dia */}
      <div className={`rounded-2xl p-4 border transition-all duration-300 ${
        desafioConcluido
          ? 'bg-[#0A2010] border-green-700/50'
          : 'bg-gradient-to-br from-[#1A3020] to-[#0A1A10] border-[#D4AF37]/20'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
              desafioConcluido ? 'bg-green-900/40' : 'bg-[#D4AF37]/10 border border-[#D4AF37]/20'
            }`}>
              {desafioConcluido ? '✅' : desafio.emoji}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[#D4AF37] text-xs font-bold uppercase tracking-wider">Desafio do Dia</p>
                <span className="text-[9px] bg-[#D4AF37]/10 text-[#D4AF37] px-1.5 py-0.5 rounded-full">+{desafio.xp} XP</span>
              </div>
              <p className="text-white text-sm font-semibold">{desafio.titulo}</p>
              <p className="text-[#A0B3A6] text-xs mt-0.5 leading-snug">{desafio.descricao}</p>
            </div>
          </div>
          <button onClick={concluirDesafio} className="flex-shrink-0 active:scale-95 transition-transform">
            {desafioConcluido
              ? <CheckCircle size={26} className="text-green-400" />
              : <Circle size={26} className="text-[#1A4026]" />
            }
          </button>
        </div>
        {desafioConcluido && (
          <p className="text-green-400 text-xs text-center mt-3 font-semibold">
            🎉 Desafio concluído hoje! Continue assim!
          </p>
        )}
      </div>

      {/* Frase do Dia */}
      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
        <p className="text-[#D4AF37] text-[10px] font-semibold uppercase tracking-widest mb-2">✦ Frase do Dia</p>
        <p className="text-white text-sm italic leading-relaxed">"{frase.frase}"</p>
        {frase.autor && <p className="text-[#A0B3A6] text-xs mt-2 text-right">— {frase.autor}</p>}
      </div>

      {/* Dica de Treino */}
      <div className="bg-gradient-to-r from-[#1A3020] to-[#0A1A10] border border-[#D4AF37]/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Zap size={14} className="text-[#D4AF37]" />
        </div>
        <div>
          <p className="text-[#D4AF37] text-xs font-semibold mb-0.5">Dica de Treino</p>
          <p className="text-[#A0B3A6] text-xs leading-relaxed">{dica}</p>
        </div>
      </div>

      {/* Acesso Rápido */}
      <div>
        <p className="text-[#A0B3A6] text-[10px] uppercase tracking-widest mb-3">Acesso Rápido</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setActiveTab('modalidades')}
            className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-3 flex items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center">
              <Dumbbell size={16} className="text-purple-300" />
            </div>
            <span className="text-white text-xs font-medium">Modalidades</span>
          </button>
          <button
            onClick={() => setActiveTab('agua')}
            className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-3 flex items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-900/40 border border-cyan-700/30 flex items-center justify-center">
              <Droplets size={16} className="text-cyan-300" />
            </div>
            <span className="text-white text-xs font-medium">Registrar Água</span>
          </button>
        </div>
      </div>

    </div>
  );
}
