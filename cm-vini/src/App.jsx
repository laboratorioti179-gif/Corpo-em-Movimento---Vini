import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageCircle, TrendingUp, UserRound, Send, ArrowLeft, Check, Plus, LoaderCircle } from 'lucide-react';

// A chave anon/publishable é pública. Nunca coloque service_role ou OPENAI_API_KEY aqui.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://jaujldyuelyhsqyxyerc.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphdWpsZHl1ZWx5aHNxeXh5ZXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTU5NDEsImV4cCI6MjA4NzUzMTk0MX0.YluXKJHl0rfJAiwyoN8tFfJIDfeHB_CwV-oFdaLwkvw';
const supabase = createClient(URL, KEY, { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
const LOGO = '/logo_cm_semfundo.png';
const suggestions = ['Quero criar uma rotina', 'Estou sem motivação', 'Como melhorar meus hábitos?'];
const DAILY = [{key:'movimento',label:'Movimentei meu corpo'},{key:'sono',label:'Cuidei do meu descanso'},{key:'rotina',label:'Mantive minha rotina'}];

export default function App() {
  const [session,setSession] = useState(null);
  const [boot,setBoot] = useState(true);
  const [bootError,setBootError] = useState('');
  const [tab,setTab] = useState('chat');
  const [messages,setMessages] = useState([]);
  const [draft,setDraft] = useState('');
  const [sending,setSending] = useState(false);
  const [chatError,setChatError] = useState('');
  const [logs,setLogs] = useState([]);
  const [logError,setLogError] = useState('');
  const bottom = useRef(null);
  const today = new Date().toLocaleDateString('en-CA');

  useEffect(()=>{
    let alive=true;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event, next)=>{if(alive) setSession(next);});
    (async()=>{
      try {
        const {data,error}=await supabase.auth.getSession();
        if(error) throw error;
        if(data.session){if(alive)setSession(data.session);}
        else {
          // Sem tela de login, mas COM identidade distinta por instalação.
          // Habilitar Sign in anonymously no painel Supabase > Authentication > Providers.
          const {data:anon,error:anonError}=await supabase.auth.signInAnonymously();
          if(anonError)throw anonError;
          if(alive)setSession(anon.session);
        }
      }catch(err){if(alive)setBootError('Não foi possível iniciar seu acesso seguro: '+(err.message||'erro desconhecido'));}
      finally{if(alive)setBoot(false);}
    })();
    return()=>{alive=false;subscription.unsubscribe();};
  },[]);

  const userId=session?.user?.id;
  useEffect(()=>{
    if(!userId)return;
    let active=true;
    (async()=>{
      const [{data:hist,error:herr},{data:records,error:lerr}]=await Promise.all([
        supabase.from('cm_chat_messages').select('id,role,content,created_at').eq('user_id',userId).order('created_at',{ascending:true}).limit(200),
        supabase.from('cm_habit_logs').select('id,habit,day').eq('user_id',userId).order('day',{ascending:false}).limit(300)
      ]);
      if(!active)return;
      if(herr)setChatError('Erro ao buscar histórico: '+herr.message);else setMessages(hist||[]);
      if(lerr)setLogError('Erro ao buscar evolução: '+lerr.message);else setLogs(records||[]);
    })();
    return()=>{active=false;};
  },[userId]);
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth'});},[messages,sending,tab]);

  async function send(value=draft){
    const message=value.trim();
    if(!message||sending||!session)return;
    setDraft('');setChatError('');setSending(true);
    const tempId='pending-'+Date.now();
    setMessages(v=>[...v,{id:tempId,role:'user',content:message,created_at:new Date().toISOString()}]);
    try {
      const {data:{session:latest},error:sErr}=await supabase.auth.getSession();
      if(sErr||!latest)throw new Error('Sessão indisponível. Atualize a página.');
      const res=await fetch(`${URL}/functions/v1/chat-corpo-movimento`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${latest.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({message})});
      const body=await res.json().catch(()=>({}));
      if(!res.ok||!body.reply)throw new Error(body.error||'O chat não conseguiu responder.');
      const {data,error}=await supabase.from('cm_chat_messages').select('id,role,content,created_at').eq('user_id',userId).order('created_at',{ascending:true}).limit(200);
      if(error)throw error;
      setMessages(data||[]);
    }catch(err){setMessages(v=>v.filter(m=>m.id!==tempId));setDraft(message);setChatError(err.message||'Erro ao enviar mensagem.');}
    finally{setSending(false);}
  }

  async function toggleHabit(habit){
    if(!userId)return;
    setLogError('');
    const found=logs.find(x=>x.day===today&&x.habit===habit);
    if(found){
      const {error}=await supabase.from('cm_habit_logs').delete().eq('id',found.id).eq('user_id',userId);
      if(error)setLogError(error.message);else setLogs(v=>v.filter(x=>x.id!==found.id));
    }else{
      const {data,error}=await supabase.from('cm_habit_logs').insert({user_id:userId,habit,day:today}).select('id,habit,day').single();
      if(error)setLogError(error.message);else setLogs(v=>[data,...v]);
    }
  }
  const doneToday=DAILY.filter(h=>logs.some(r=>r.day===today&&r.habit===h.key)).length;
  const last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return {day:d.toLocaleDateString('en-CA'),label:d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')};});
  const attended=last7.filter(d=>logs.some(l=>l.day===d.day)).length;

  return <div className="min-h-[100dvh] bg-[#031D15] text-[#F8F4E9] flex justify-center" style={{fontFamily:'Inter,system-ui,sans-serif'}}>
    <div className="w-full max-w-[520px] h-[100dvh] flex flex-col bg-[#06271C] border-x border-[#214632]">
      <header className="flex items-center px-5 py-3 gap-3 border-b border-[#244634] bg-[#06271C] min-h-[76px] shrink-0">
        <img src={LOGO} alt="Corpo Em Movimento" className="w-12 h-12 object-contain"/>
        <div className="flex-1 min-w-0"><h1 className="font-semibold tracking-wide text-base">Corpo Em Movimento</h1><p className="text-[#ADC4B2] text-xs">{tab==='chat'?'Seu acompanhamento inteligente':tab==='evolucao'?'Sua jornada, um dia de cada vez':'Seu espaço'}</p></div>
        <button className={`w-10 h-10 grid place-items-center rounded-full border ${tab==='perfil'?'text-[#E8C579] border-[#D6B36B]':'border-[#28503B] text-[#B5C9B8]'}`} aria-label="Abrir perfil" onClick={()=>setTab(tab==='perfil'?'chat':'perfil')}><UserRound size={21}/></button>
      </header>
      {boot ? <div className="flex-1 grid place-items-center"><LoaderCircle className="animate-spin text-[#E8C579]"/></div> : bootError ? <div className="flex-1 p-8 text-center"><p className="text-amber-200">{bootError}</p><p className="text-sm text-[#ADC4B2] mt-4">Ative autenticação anônima no Supabase e recarregue.</p></div> : <>
        {tab==='chat'&&<main className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {messages.length===0&&<div className="pt-10 text-center"><div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#133C2C] border border-[#A98C51]/50 flex items-center justify-center"><img src={LOGO} alt="" className="w-20 h-20 object-contain"/></div><h2 className="text-2xl font-semibold">Sua jornada começa aqui.</h2><p className="text-[#B8CBBE] text-sm leading-relaxed mt-3 max-w-xs mx-auto">Converse sobre hábitos, movimento e constância. Como você está hoje?</p><p className="text-xs text-[#91AA9A] mt-3">Você está conversando com uma IA, não com o treinador humano.</p><div className="mt-8 flex flex-wrap gap-2 justify-center">{suggestions.map(s=><button key={s} onClick={()=>send(s)} className="text-sm px-3 py-2 border border-[#957E4A] text-[#F0D79F] rounded-full bg-[#103629]">{s}</button>)}</div></div>}
            {messages.map(m=><div key={m.id} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}><p className={`whitespace-pre-wrap break-words max-w-[87%] p-3.5 text-sm leading-relaxed rounded-2xl ${m.role==='user'?'bg-[#CBA864] text-[#0A281A] rounded-br-sm':'bg-[#164232] text-[#F8F4E9] border border-[#315641] rounded-bl-sm'}`}>{m.content}</p></div>)}
            {sending&&<p className="text-[#B2C8B5] text-sm animate-pulse">Preparando resposta...</p>}
            <div ref={bottom}/>
          </div>
          {chatError&&<p role="alert" className="mx-4 mb-2 p-3 rounded-xl bg-red-950/40 text-red-200 text-xs">{chatError}</p>}
          <form onSubmit={e=>{e.preventDefault();send();}} className="shrink-0 px-4 py-3 border-t border-[#244634] bg-[#052219]"><div className="flex items-end bg-[#123A2B] border border-[#335943] rounded-2xl p-2 gap-2"><textarea aria-label="Sua mensagem" rows={1} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Escreva sua mensagem..." maxLength={3000} className="flex-1 min-w-0 bg-transparent py-2 px-2 outline-none resize-none text-sm max-h-28 placeholder:text-[#A7BAAB]"/><button disabled={!draft.trim()||sending} className="bg-[#D8B46B] text-[#0A271A] rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-40" aria-label="Enviar"><Send size={18}/></button></div><p className="text-[10px] text-[#8FA99A] text-center mt-2">A IA não substitui orientações médicas ou acompanhamento profissional.</p></form>
        </main>}
        {tab==='evolucao'&&<main className="flex-1 overflow-y-auto px-5 py-7 space-y-5"><div><h2 className="text-2xl font-semibold">Minha evolução</h2><p className="text-[#AFC5B5] mt-1 text-sm">Pequenas conquistas constroem mudanças reais.</p></div><section className="rounded-3xl bg-[#103629] border border-[#31543F] p-5"><div className="flex justify-between items-start"><div><h3 className="font-medium">Hábitos de hoje</h3><p className="text-[#A9C0AE] text-xs mt-1">Marque o que você conseguiu fazer.</p></div><span className="text-[#E8C579] text-2xl font-semibold">{doneToday}/{DAILY.length}</span></div><div className="mt-5 space-y-3">{DAILY.map(h=>{const done=logs.some(l=>l.day===today&&l.habit===h.key);return <button key={h.key} onClick={()=>toggleHabit(h.key)} className={`w-full text-left flex gap-3 items-center rounded-xl border p-3.5 ${done?'border-[#B99B60] bg-[#214732]':'border-[#31533F] bg-[#0A2C20]'}`}><span className={`w-6 h-6 rounded-full border grid place-items-center ${done?'bg-[#E7C477] text-[#123221] border-[#E7C477]':'border-[#849D88]'}`}>{done?<Check size={16}/>:<Plus size={14}/>}</span><span className="text-sm">{h.label}</span></button>})}</div></section><section className="rounded-3xl bg-[#103629] border border-[#31543F] p-5"><div className="flex items-center justify-between"><h3 className="font-medium">Últimos 7 dias</h3><span className="text-[#E8C579] font-semibold">{attended}/7</span></div><p className="text-xs text-[#ACC2AF] mt-1">Dias com ao menos um hábito registrado</p><div className="flex justify-between mt-6 gap-2">{last7.map(d=>{const done=logs.some(l=>l.day===d.day);return <div className="flex-1 text-center" key={d.day}><div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${done?'bg-[#E8C579] text-[#0C291D]':'border border-[#52715C] text-[#ADC3B1]'}`}>{done?<Check size={17}/>:''}</div><p className="capitalize text-[11px] text-[#B3C5B7] mt-2">{d.label}</p></div>})}</div></section><p className="text-[#9DB4A2] text-xs leading-relaxed">Sua evolução registra os hábitos marcados por você. Isso não representa um diagnóstico nem uma avaliação física.</p>{logError&&<p className="text-red-200 text-sm" role="alert">{logError}</p>}</main>}
        {tab==='perfil'&&<main className="flex-1 px-6 py-8"><button onClick={()=>setTab('chat')} className="flex items-center gap-2 text-[#E8C579] text-sm"><ArrowLeft size={16}/> Voltar ao chat</button><div className="mt-10 flex flex-col items-center"><img src={LOGO} alt="Corpo Em Movimento" className="w-28 h-28 object-contain"/><h2 className="text-xl font-semibold mt-4">Corpo Em Movimento</h2><p className="text-center text-sm text-[#B3C7B8] mt-2">Acompanhamento inteligente de hábitos.</p></div><div className="mt-10 bg-[#113729] rounded-2xl p-5 border border-[#2C513C]"><p className="font-medium">Seu histórico privado</p><p className="text-[#B1C5B6] text-sm mt-2">Sem cadastro obrigatório. Nesta versão, seus registros ficam associados à identidade anônima deste navegador. Se você limpar os dados do site ou trocar de aparelho, poderá perder o acesso ao histórico.</p></div></main>}
        <nav className="shrink-0 border-t border-[#2C503D] flex bg-[#052219] pb-[env(safe-area-inset-bottom)]" aria-label="Menu principal">{[{id:'chat',label:'Chat',Icon:MessageCircle},{id:'evolucao',label:'Evolução',Icon:TrendingUp}].map(({id,label,Icon})=><button key={id} onClick={()=>setTab(id)} className={`flex-1 flex flex-col justify-center items-center h-16 gap-1 text-xs ${tab===id?'text-[#E8C579]':'text-[#99B2A0]'}`}><Icon size={22}/>{label}</button>)}</nav>
      </>}
    </div>
  </div>;
}
