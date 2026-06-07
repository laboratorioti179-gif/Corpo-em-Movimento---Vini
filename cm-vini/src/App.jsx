import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Dumbbell, 
  ClipboardList, 
  Activity, 
  User, 
  Menu, 
  Bell, 
  ChevronRight,
  Target,
  Flame,
  Award,
  Settings,
  LogOut,
  ChevronLeft,
  Droplets,
  Plus,
  Minus
} from 'lucide-react';

const modalidadesData = [
  {
    id: 1,
    titulo: 'Boxe',
    categoria: 'Combate',
    fases: 10,
    dietas: 2,
    icon: ({ size, strokeWidth }) => (
      <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  {
    id: 7,
    titulo: 'Jiu-Jitsu',
    categoria: 'Luta Agarrada',
    fases: 10,
    dietas: 2,
    icon: ({ size, strokeWidth }) => (
      <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  {
    id: 2,
    titulo: 'Tênis de Picobol',
    categoria: 'Esportes de raquete',
    fases: 10,
    dietas: 2,
    icon: ({ size, strokeWidth }) => (
      <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none">
        <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 2v20" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  {
    id: 3,
    titulo: 'Corrida',
    categoria: 'longa / curta',
    fases: 10,
    dietas: 2,
    icon: Activity
  },
  {
    id: 4,
    titulo: 'Natação',
    categoria: 'Piscina / Mar',
    fases: 10,
    dietas: 2,
    icon: ({ size, strokeWidth }) => (
      <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none">
        <path d="M2 12c2.667 0 5.333-2 8-2s5.333 2 8 2 5.333-2 8-2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 16c2.667 0 5.333-2 8-2s5.333 2 8 2 5.333-2 8-2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  {
    id: 5,
    titulo: 'Ciclismo',
    categoria: 'longa / curta',
    fases: 10,
    dietas: 2,
    icon: ({ size, strokeWidth }) => (
      <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth={strokeWidth} fill="none">
        <circle cx="5" cy="18" r="4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="19" cy="18" r="4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 18l4-8h6l4 8M15 10l-3-6H8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  {
    id: 6,
    titulo: 'Body Builders',
    categoria: 'HOMEN - Mens / Classic\nMULHER - Figure / Wellness',
    fases: 10,
    dietas: 2,
    icon: Dumbbell
  }
];

const planosData = [
  { id: 1, titulo: 'Cutting Intenso', objetivo: 'Perda de Gordura', calorias: '1800 kcal' },
  { id: 2, titulo: 'Bulking Limpo', objetivo: 'Ganho de Massa', calorias: '3200 kcal' },
  { id: 3, titulo: 'Manutenção', objetivo: 'Condicionamento', calorias: '2400 kcal' }
];

const App = () => {
  const [activeTab, setActiveTab] = useState('modalidades');
  const [selectedModalidade, setSelectedModalidade] = useState(null);

  // Autenticação e Usuário Teste
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState({
    nome: 'Usuário Teste',
    email: 'teste@corpoemmovimento.com'
  });

  // Estados da Meta de Água
  const [waterGoal, setWaterGoal] = useState(2000);
  const [waterConsumed, setWaterConsumed] = useState(0);
  const [waterInterval, setWaterInterval] = useState(60);
  const [drinkSize, setDrinkSize] = useState(250);

  useEffect(() => {
    // Adiciona meta tags e ícone para PWA (Add to Homescreen) dinamicamente
    const head = document.head;

    // Remove tags antigas se existirem para evitar duplicação em HMR
    document.querySelectorAll('meta[name="apple-mobile-web-app-capable"]').forEach(e => e.remove());
    document.querySelectorAll('meta[name="apple-mobile-web-app-status-bar-style"]').forEach(e => e.remove());
    document.querySelectorAll('meta[name="apple-mobile-web-app-title"]').forEach(e => e.remove());
    document.querySelectorAll('meta[name="mobile-web-app-capable"]').forEach(e => e.remove());
    document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(e => e.remove());
    document.querySelectorAll('link[rel="icon"]').forEach(e => e.remove());

    const metaTags = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'Corpo em Movimento' },
      { name: 'mobile-web-app-capable', content: 'yes' }
    ];

    metaTags.forEach(tagInfo => {
      const meta = document.createElement('meta');
      meta.name = tagInfo.name;
      meta.content = tagInfo.content;
      head.appendChild(meta);
    });

    // Mock de um manifest gerado em base64 para que o navegador reconheça como instalável
    const manifestContent = {
      name: "Corpo em Movimento",
      short_name: "Corpo em Movimento",
      start_url: ".",
      display: "standalone",
      background_color: "#051109",
      theme_color: "#051109",
      icons: [
        {
          src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzA1MTEwOSIvPgogIDxwYXRoIGQ9Ik0zNSwzNSBMNjUsNjUgTTY1LDM1IEwzNSw2NSIgc3Ryb2tlPSIjRDRBRjM3IiBzdHJva2Utd2lkdGg9IjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4=",
          sizes: "192x192",
          type: "image/svg+xml"
        },
        {
          src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzA1MTEwOSIvPgogIDxwYXRoIGQ9Ik0zNSwzNSBMNjUsNjUgTTY1LDM1IEwzNSw2NSIgc3Ryb2tlPSIjRDRBRjM3IiBzdHJva2Utd2lkdGg9IjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4=",
          sizes: "512x512",
          type: "image/svg+xml"
        }
      ]
    };
    
    // Remove manifest antigo
    document.querySelectorAll('link[rel="manifest"]').forEach(e => e.remove());
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = 'data:application/manifest+json;base64,' + btoa(JSON.stringify(manifestContent));
    head.appendChild(manifestLink);

    // Ícones
    const iconBase64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzA1MTEwOSIvPgogIDxwYXRoIGQ9Ik0zNSwzNSBMNjUsNjUgTTY1LDM1IEwzNSw2NSIgc3Ryb2tlPSIjRDRBRjM3IiBzdHJva2Utd2lkdGg9IjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4=";
    
    const appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = iconBase64;
    head.appendChild(appleIcon);

    const standardIcon = document.createElement('link');
    standardIcon.rel = 'icon';
    standardIcon.type = 'image/svg+xml';
    standardIcon.href = iconBase64;
    head.appendChild(standardIcon);

    // Document title
    document.title = "Corpo em Movimento";

  }, []);

  const colors = {
    bgDark: '#051109',
    bgCard: '#0A1A10',
    accent: '#D4AF37',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0B3A6',
    borderLight: '#1A4026'
  };

  const renderLogin = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-white relative z-10 w-full h-full">
      <div className="flex flex-col items-center mb-12">
        <h1 
          className="text-4xl text-center leading-tight bg-gradient-to-r from-[#CFB375] to-[#AC915B] bg-clip-text text-transparent drop-shadow-md mb-2"
          style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700 }}
        >
          Corpo em<br/>Movimento
        </h1>
        <p className="text-[#A0B3A6] text-sm tracking-widest uppercase">Login</p>
      </div>

      <div className="w-full space-y-4">
        <div>
          <label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">E-mail</label>
          <input 
            type="email" 
            defaultValue={user.email}
            className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-[#A0B3A6] ml-1 mb-1 block">Senha</label>
          <input 
            type="password" 
            defaultValue="123456"
            className="w-full bg-[#0A1A10] border border-[#1A4026] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37] transition-colors"
          />
        </div>
        
        <button 
          onClick={() => setIsLoggedIn(true)}
          className="w-full bg-gradient-to-r from-[#CFB375] to-[#AC915B] text-[#051109] font-bold text-lg py-3 rounded-xl mt-6 active:scale-95 transition-transform"
        >
          Entrar
        </button>
      </div>
    </div>
  );

  const renderInicio = () => (
    <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-24 text-white">
      <div className="mb-4 pt-4">
        <h2 className="text-[#D4AF37] text-xl font-serif mb-2">Bem-vindo de volta!</h2>
        <p className="text-[#A0B3A6] text-sm">Pronto para superar seus limites hoje?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
          <Flame size={32} className="text-[#D4AF37] mb-2" />
          <span className="text-2xl font-bold">14</span>
          <span className="text-[#A0B3A6] text-[10px] uppercase tracking-wider">Dias Seguidos</span>
        </div>
        <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
          <Target size={32} className="text-[#D4AF37] mb-2" />
          <span className="text-2xl font-bold">85%</span>
          <span className="text-[#A0B3A6] text-[10px] uppercase tracking-wider">Meta Mensal</span>
        </div>
      </div>

      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
        <h3 className="text-[#D4AF37] text-sm font-semibold mb-3">Próximo Treino</h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37]">
            <Dumbbell size={24} />
          </div>
          <div>
            <h4 className="font-medium">Musculação - Costas</h4>
            <p className="text-[#A0B3A6] text-xs">Hoje, 18:30</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlanos = () => (
    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar pb-24">
      <div className="mb-6 border-l-2 border-[#D4AF37] pl-3 py-1 mt-4">
        <h2 className="text-[#D4AF37] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">
          Planos Alimentares
        </h2>
        <h3 className="text-white text-lg font-medium mb-1">
          Seus Planos Ativos
        </h3>
      </div>
      
      {planosData.map((plano) => (
        <button key={plano.id} className="w-full bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98] hover:border-[#2A5036]">
           <div className="w-12 h-12 rounded-full bg-[#1A3020] flex items-center justify-center flex-shrink-0 text-[#D4AF37]">
             <ClipboardList size={24} />
           </div>
           <div className="flex-1 text-left">
             <h4 className="text-white font-medium">{plano.titulo}</h4>
             <p className="text-[#A0B3A6] text-xs">{plano.objetivo}</p>
           </div>
           <div className="text-right">
              <span className="text-[#D4AF37] font-bold block">{plano.calorias}</span>
           </div>
        </button>
      ))}
    </div>
  );

  const renderProgresso = () => (
    <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-24 text-white">
      <div className="mb-6 border-l-2 border-[#D4AF37] pl-3 py-1 mt-4">
        <h2 className="text-[#D4AF37] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">
          Evolução
        </h2>
        <h3 className="text-white text-lg font-medium mb-1">
          Seu Progresso
        </h3>
      </div>

      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4">
         <div className="flex justify-between items-center mb-4">
           <h4 className="font-medium text-[#D4AF37]">Peso Corporal</h4>
           <span className="text-sm font-bold text-white">75.2 kg</span>
         </div>
         {/* Simple visual representation of a chart */}
         <div className="h-32 flex items-end gap-2 pt-4 border-b border-[#1A4026] opacity-70">
            {[40, 50, 45, 60, 55, 70, 65].map((h, i) => (
              <div key={i} className="flex-1 bg-[#D4AF37] rounded-t-sm" style={{ height: `${h}%` }}></div>
            ))}
         </div>
         <div className="flex justify-between text-[#A0B3A6] text-[10px] mt-2">
           <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span>
         </div>
      </div>

      <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="text-[#D4AF37]" size={24} />
          <div>
            <h4 className="font-medium">Conquistas</h4>
            <p className="text-[#A0B3A6] text-xs">3 novas este mês</p>
          </div>
        </div>
        <ChevronRight className="text-[#D4AF37] opacity-80" size={18} />
      </div>
    </div>
  );

  const renderPerfil = () => (
    <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-24 text-white">
      <div className="flex flex-col items-center mb-8 mt-4">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#D4AF37] mb-4 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
          <div className="w-full h-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37]">
            <User size={48} strokeWidth={1} />
          </div>
        </div>
        <h2 className="text-xl font-bold">{user.nome}</h2>
        <p className="text-[#A0B3A6] text-sm">{user.email}</p>
      </div>

      <div className="space-y-2">
        <button className="w-full bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex items-center justify-between transition-all active:scale-[0.98] hover:border-[#2A5036]">
          <div className="flex items-center gap-3">
            <User className="text-[#D4AF37]" size={20} />
            <span>Dados Pessoais</span>
          </div>
          <ChevronRight className="text-[#D4AF37] opacity-80" size={18} />
        </button>
        <button className="w-full bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex items-center justify-between transition-all active:scale-[0.98] hover:border-[#2A5036]">
          <div className="flex items-center gap-3">
            <Settings className="text-[#D4AF37]" size={20} />
            <span>Configurações</span>
          </div>
          <ChevronRight className="text-[#D4AF37] opacity-80" size={18} />
        </button>
        <button 
          onClick={() => setIsLoggedIn(false)}
          className="w-full mt-4 bg-transparent border border-red-900/50 rounded-xl p-4 flex items-center justify-center gap-2 text-red-500 transition-all active:scale-[0.98] hover:bg-red-900/10"
        >
          <LogOut size={20} />
          <span>Sair da Conta</span>
        </button>
      </div>
    </div>
  );

  const renderAgua = () => {
    const fillPercentage = Math.min((waterConsumed / waterGoal) * 100, 100);

    return (
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-24 text-white">
        <div className="mb-6 border-l-2 border-[#D4AF37] pl-3 py-1 mt-4">
          <h2 className="text-[#D4AF37] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">
            Hidratação
          </h2>
          <h3 className="text-white text-lg font-medium mb-1">
            Meta de Água
          </h3>
          <p className="text-[#A0B3A6] text-xs">Acompanhe e configure seu consumo diário.</p>
        </div>

        {/* Copo Interativo */}
        <div className="flex flex-col items-center justify-center py-2">
          <div 
            className="relative w-32 h-48 border-[6px] border-[#1A3020] rounded-b-3xl rounded-t-lg bg-[#051109] overflow-hidden shadow-[0_0_30px_rgba(26,64,38,0.3)] cursor-pointer transition-transform active:scale-95"
            onClick={() => setWaterConsumed(prev => prev + drinkSize)}
          >
            {/* Medidores no vidro (decorativo) */}
            <div className="absolute top-1/4 left-0 w-2 h-0.5 bg-[#1A3020] z-10"></div>
            <div className="absolute top-2/4 left-0 w-2 h-0.5 bg-[#1A3020] z-10"></div>
            <div className="absolute top-3/4 left-0 w-2 h-0.5 bg-[#1A3020] z-10"></div>

            {/* Água */}
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-[800ms] ease-in-out opacity-90"
              style={{ height: `${fillPercentage}%` }}
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-cyan-300/60 rounded-t-full"></div>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-[#D4AF37]">{waterConsumed}</span>
              <span className="text-[#A0B3A6] text-lg">/ {waterGoal} ml</span>
            </div>
            <p className="text-[#D4AF37] text-xs font-medium uppercase tracking-widest mt-1">
              {fillPercentage >= 100 ? 'Meta Atingida!' : 'Continue Bebendo'}
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-4">
          <button 
            onClick={() => setWaterConsumed(prev => Math.max(0, prev - drinkSize))}
            className="w-14 h-14 bg-[#0A1A10] border border-[#1A4026] rounded-2xl flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <Minus size={24} />
          </button>
          <button 
            onClick={() => setWaterConsumed(prev => prev + drinkSize)}
            className="flex-1 bg-[#1A3020] border border-[#D4AF37]/30 text-[#D4AF37] rounded-2xl flex items-center justify-center gap-2 font-medium active:scale-95 transition-transform"
          >
            <Plus size={24} /> Tomar {drinkSize}ml
          </button>
        </div>

        {/* Configurações da Meta */}
        <div className="bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 mt-2 space-y-4">
          <h4 className="text-[#D4AF37] text-sm font-semibold mb-3">Configurações</h4>
          
          <div className="flex justify-between items-center">
            <label className="text-xs text-[#A0B3A6]">Meta Diária (ml)</label>
            <input 
              type="number" 
              value={waterGoal} 
              onChange={e => setWaterGoal(Number(e.target.value))}
              className="bg-[#051109] border border-[#1A4026] text-white px-3 py-1.5 rounded-lg w-24 text-right text-sm focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          
          <div className="flex justify-between items-center">
            <label className="text-xs text-[#A0B3A6]">Intervalo (min)</label>
            <input 
              type="number" 
              value={waterInterval} 
              onChange={e => setWaterInterval(Number(e.target.value))}
              className="bg-[#051109] border border-[#1A4026] text-white px-3 py-1.5 rounded-lg w-24 text-right text-sm focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          
          <div className="flex justify-between items-center">
            <label className="text-xs text-[#A0B3A6]">Tamanho do Copo (ml)</label>
            <input 
              type="number" 
              value={drinkSize} 
              onChange={e => setDrinkSize(Number(e.target.value))}
              className="bg-[#051109] border border-[#1A4026] text-white px-3 py-1.5 rounded-lg w-24 text-right text-sm focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderModalidadeDetalhes = () => {
    if (!selectedModalidade) return null;

    return (
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-24 text-white">
        <button 
          onClick={() => setSelectedModalidade(null)}
          className="flex items-center text-[#D4AF37] mb-4 mt-4 hover:opacity-80 transition-opacity"
        >
          <ChevronLeft size={20} />
          <span>Voltar para Modalidades</span>
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37]">
            <selectedModalidade.icon size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{selectedModalidade.titulo}</h2>
            <p className="text-[#A0B3A6] text-sm">{selectedModalidade.categoria}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[#D4AF37] text-lg font-medium border-b border-[#1A4026] pb-2">
            Fases do Treinamento
          </h3>
          {[...Array(selectedModalidade.fases)].map((_, i) => (
            <div key={`fase-${i}`} className="bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex items-center justify-between">
              <span className="font-medium">Fase {i + 1}</span>
              <ChevronRight className="text-[#D4AF37] opacity-50" size={18} />
            </div>
          ))}
        </div>

        <div className="space-y-4 mt-8">
          <h3 className="text-[#D4AF37] text-lg font-medium border-b border-[#1A4026] pb-2">
            Dietas Recomendadas
          </h3>
          {[...Array(selectedModalidade.dietas)].map((_, i) => (
            <div key={`dieta-${i}`} className="bg-[#0A1A10] border border-[#1A4026] rounded-xl p-4 flex items-center gap-3">
               <ClipboardList className="text-[#D4AF37]" size={20} />
              <span className="font-medium">Dieta Opção {i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#051109] flex items-center justify-center sm:p-4">
      {/* Container - Ajustado para ocupar a tela toda no mobile e remover a faixa branca */}
      <div 
        className="w-full h-screen sm:h-[852px] sm:max-w-[393px] flex flex-col font-sans relative overflow-hidden selection:bg-[#D4AF37] selection:text-[#0A2514] sm:rounded-[3rem] sm:border-[8px] sm:border-black shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        style={{ backgroundColor: colors.bgDark, color: colors.textPrimary }}
      >
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
          `}
        </style>
        
        {/* Background Image overlay (subtle gym background) */}
        <div 
          className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-cover bg-center" 
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop")' }}
        />
        
        {/* Background Gradient overlay (subtle) */}
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#143B21] to-transparent opacity-50 pointer-events-none z-0" />

        {!isLoggedIn ? (
          renderLogin()
        ) : (
          <>
            {/* Header - Ajustado com padding-top seguro para notch em PWA standalone */}
            <header className="flex justify-between items-center p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] relative z-10">
              <button 
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#D4AF37] -ml-2 transition-transform active:scale-95 bg-[#051109]"
                onClick={() => { setActiveTab('perfil'); setSelectedModalidade(null); }}
              >
                <div className="w-full h-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37]">
                  <User size={20} strokeWidth={1.5} />
                </div>
              </button>
              
              <div className="flex flex-col items-center">
                <h1 
                  className="text-xl text-center leading-tight bg-gradient-to-r from-[#CFB375] to-[#AC915B] bg-clip-text text-transparent drop-shadow-md"
                  style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700 }}
                >
                  Corpo em<br/>Movimento
                </h1>
              </div>

              <button className="p-2 -mr-2 text-[#D4AF37] relative bg-[#051109] rounded-full">
                <Bell size={24} strokeWidth={2} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#D4AF37] rounded-full border-2 border-[#0A2514]"></span>
              </button>
            </header>

            <main className="flex-1 px-6 pb-6 relative z-10 flex flex-col h-full overflow-hidden">
              
              {activeTab === 'inicio' && renderInicio()}
              {activeTab === 'planos' && renderPlanos()}
              {activeTab === 'progresso' && renderProgresso()}
              {activeTab === 'agua' && renderAgua()}
              {activeTab === 'perfil' && renderPerfil()}

              {activeTab === 'modalidades' && !selectedModalidade && (
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar pb-24">
                  <div className="mb-6 border-l-2 border-[#D4AF37] pl-3 py-1 mt-4">
                    <h2 className="text-[#D4AF37] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">
                      Modalidades
                    </h2>
                    <h3 className="text-white text-lg font-medium mb-1">
                      Escolha sua modalidade
                    </h3>
                    <p className="text-[#A0B3A6] text-xs max-w-[280px]">
                      Selecione sua modalidade para acessar planos alimentares personalizados.
                    </p>
                  </div>

                  {modalidadesData.map((item) => (
                    <button 
                      key={item.id}
                      onClick={() => setSelectedModalidade(item)}
                      className="w-full bg-[#0A1A10] border border-[#1A4026] rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98] hover:border-[#2A5036]"
                    >
                      {/* Icon Container */}
                      <div className="w-14 h-14 rounded-full bg-[#1A3020] flex items-center justify-center flex-shrink-0 text-[#D4AF37]">
                        <item.icon size={26} strokeWidth={1.5} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 text-left">
                        <h4 className="text-white text-base font-medium mb-0.5">{item.titulo}</h4>
                        <p className="text-[#D4AF37] text-[10px] mb-0.5">Categoria:</p>
                        <p className="text-[#A0B3A6] text-[10px] whitespace-pre-line">{item.categoria}</p>
                      </div>

                      {/* Fases e Dietas Info */}
                      <div className="flex flex-col items-end gap-1 text-right">
                          <span className="text-[#D4AF37] text-[10px] font-medium bg-[#1A3020] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">{item.fases} Fases</span>
                          <span className="text-[#D4AF37] text-[10px] font-medium bg-[#1A3020] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">{item.dietas} Dietas</span>
                      </div>

                      {/* Chevron */}
                      <div className="text-[#D4AF37] ml-2 opacity-80">
                        <ChevronRight size={18} strokeWidth={2} />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'modalidades' && selectedModalidade && renderModalidadeDetalhes()}

            </main>

            {/* Bottom Navigation */}
            <nav className="absolute bottom-0 left-0 right-0 bg-[#0A2514]/95 backdrop-blur-md border-t border-[#1A4026] px-6 py-2 z-50 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
              <div className="flex justify-between items-center max-w-md mx-auto h-14">
                <NavItem 
                  icon={Home} 
                  label="Início" 
                  isActive={activeTab === 'inicio'} 
                  onClick={() => { setActiveTab('inicio'); setSelectedModalidade(null); }} 
                />
                <NavItem 
                  icon={Dumbbell} 
                  label="Modalidades" 
                  isActive={activeTab === 'modalidades'} 
                  onClick={() => { setActiveTab('modalidades'); setSelectedModalidade(null); }} 
                />
                <NavItem 
                  icon={ClipboardList} 
                  label="Planos" 
                  isActive={activeTab === 'planos'} 
                  onClick={() => { setActiveTab('planos'); setSelectedModalidade(null); }} 
                />
                <NavItem 
                  icon={Activity} 
                  label="Progresso" 
                  isActive={activeTab === 'progresso'} 
                  onClick={() => { setActiveTab('progresso'); setSelectedModalidade(null); }} 
                />
                <NavItem 
                  icon={Droplets} 
                  label="Água" 
                  isActive={activeTab === 'agua'} 
                  onClick={() => { setActiveTab('agua'); setSelectedModalidade(null); }} 
                />
                <NavItem 
                  icon={User} 
                  label="Perfil" 
                  isActive={activeTab === 'perfil'} 
                  onClick={() => { setActiveTab('perfil'); setSelectedModalidade(null); }} 
                />
              </div>
            </nav>
          </>
        )}

        <style dangerouslySetInnerHTML={{__html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #1A4026;
            border-radius: 20px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: #D4AF37;
          }
        `}} />
      </div>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, isActive, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-14 h-full relative transition-colors ${
        isActive ? 'text-[#D4AF37]' : 'text-[#8A9C90] hover:text-[#A0B3A6]'
      }`}
    >
      {/* Active Indicator Top Line */}
      {isActive && (
        <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#D4AF37] rounded-b-md shadow-[0_2px_8px_rgba(212,175,55,0.5)]" />
      )}
      
      <Icon size={20} strokeWidth={isActive ? 2 : 1.5} className="mb-1" />
      <span className="text-[9px] font-medium tracking-wide">{label}</span>
    </button>
  );
};

export default App;
