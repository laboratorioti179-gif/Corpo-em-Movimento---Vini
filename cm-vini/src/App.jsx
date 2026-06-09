import React, { useState } from 'react';
import { 
  Home, 
  Dumbbell, 
  ClipboardList, 
  Activity, 
  User, 
  Menu, 
  Bell, 
  ChevronRight 
} from 'lucide-react';

const modalidadesData = [
  {
    id: 1,
    titulo: 'Boxe',
    categoria: 'Combate',
    dietas: 3,
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
    dietas: 3,
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
    dietas: 3,
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
    dietas: 3,
    icon: Activity
  },
  {
    id: 4,
    titulo: 'Natação',
    categoria: 'Piscina / Mar',
    dietas: 3,
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
    dietas: 3,
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
    dietas: 3,
    icon: Dumbbell
  }
];

const App = () => {
  const [activeTab, setActiveTab] = useState('modalidades');

  const colors = {
    bgDark: '#051109',
    bgCard: '#0A1A10',
    accent: '#D4AF37',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0B3A6',
    borderLight: '#1A4026'
  };

  return (
    <div className="min-h-screen bg-[#051109] flex items-center justify-center sm:p-4">
      {/* Container simulando a tela do celular */}
      <div 
        className="w-full h-screen sm:h-[852px] sm:max-w-[393px] flex flex-col font-sans relative overflow-hidden selection:bg-[#D4AF37] selection:text-[#0A2514] sm:rounded-[3rem] sm:border-[8px] sm:border-black shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        style={{ backgroundColor: colors.bgDark, color: colors.textPrimary }}
      >
        {/* Background Gradient overlay (subtle) */}
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#143B21] to-transparent opacity-50 pointer-events-none" />

        {/* Header */}
        <header className="flex justify-between items-center p-6 pt-12 relative z-10">
          <button 
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#D4AF37] -ml-2 transition-transform active:scale-95"
            onClick={() => setActiveTab('perfil')}
          >
            <div className="w-full h-full bg-[#1A3020] flex items-center justify-center text-[#D4AF37]">
              <User size={20} strokeWidth={1.5} />
            </div>
          </button>
        
          <div className="flex flex-col items-center">
            {/* Mock Logo */}
            <svg viewBox="0 0 100 100" fill="none" className="w-16 h-16 text-[#D4AF37] mb-1">
              <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" />
              <path d="M50 20 C 35 40, 30 60, 45 80" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <path d="M50 20 C 65 40, 70 60, 55 80" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <circle cx="50" cy="15" r="4" fill="currentColor" />
              <path d="M30 40 Q 50 20, 70 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M35 80 Q 50 65, 65 80" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h1 className="text-lg font-bold tracking-[0.1em] text-[#D4AF37] font-serif">CORPO</h1>
            <p className="text-[8px] tracking-[0.2em] text-[#D4AF37] uppercase">em movimento</p>
          </div>

          <button className="p-2 -mr-2 text-[#D4AF37] relative">
            <Bell size={24} strokeWidth={2} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#D4AF37] rounded-full border-2 border-[#0A2514]"></span>
          </button>
        </header>

        {}
        <main className="flex-1 px-6 pb-6 relative z-10 flex flex-col h-full overflow-hidden">
          
          {/* Section Header */}
          <div className="mb-6 border-l-2 border-[#D4AF37] pl-3 py-1">
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

          {/* Scrollable List Container */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar pb-24">
            {modalidadesData.map((item) => (
              <button 
                key={item.id}
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

                {/* Diet Badge */}
                <div className="flex flex-col items-center justify-center bg-[#051109] border border-[#1A4026] rounded-xl py-2 px-3 min-w-[50px]">
                  <span className="text-[#D4AF37] text-lg font-bold leading-none mb-0.5">{item.dietas}</span>
                  <span className="text-[#D4AF37] text-[8px] font-medium tracking-widest uppercase">Dietas</span>
                </div>

                {/* Chevron */}
                <div className="text-[#D4AF37] ml-2 opacity-80">
                  <ChevronRight size={18} strokeWidth={2} />
                </div>
              </button>
            ))}
          </div>
        </main>

        {}
        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 bg-[#0A2514]/95 backdrop-blur-md border-t border-[#1A4026] px-6 py-2 z-50">
          <div className="flex justify-between items-center max-w-md mx-auto h-14">
            <NavItem 
              icon={Home} 
              label="Início" 
              isActive={activeTab === 'inicio'} 
              onClick={() => setActiveTab('inicio')} 
            />
            <NavItem 
              icon={Dumbbell} 
              label="Modalidades" 
              isActive={activeTab === 'modalidades'} 
              onClick={() => setActiveTab('modalidades')} 
            />
            <NavItem 
              icon={ClipboardList} 
              label="Planos" 
              isActive={activeTab === 'planos'} 
              onClick={() => setActiveTab('planos')} 
            />
            <NavItem 
              icon={Activity} 
              label="Progresso" 
              isActive={activeTab === 'progresso'} 
              onClick={() => setActiveTab('progresso')} 
            />
            <NavItem 
              icon={User} 
              label="Perfil" 
              isActive={activeTab === 'perfil'} 
              onClick={() => setActiveTab('perfil')} 
            />
          </div>
        </nav>

        {}
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
