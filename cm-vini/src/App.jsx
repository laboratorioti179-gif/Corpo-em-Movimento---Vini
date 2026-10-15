import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageCircle, TrendingUp, UserRound, Send, ArrowLeft, Check, Plus, LoaderCircle, Dumbbell, RefreshCw, Utensils, Camera, RotateCcw, CalendarDays, LogOut, ShieldCheck, Users, Search, Activity, BarChart3, Eye, X } from 'lucide-react';

// A chave anon/publishable é pública. Nunca coloque service_role ou OPENAI_API_KEY aqui.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://jaujldyuelyhsqyxyerc.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphdWpsZHl1ZWx5aHNxeXh5ZXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTU5NDEsImV4cCI6MjA4NzUzMTk0MX0.YluXKJHl0rfJAiwyoN8tFfJIDfeHB_CwV-oFdaLwkvw';
const supabase = createClient(URL, KEY, { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
const LOGO = '/logo_cm_semfundo.png';
const suggestions = ['Quero criar uma rotina', 'Estou sem motivação', 'Como melhorar meus hábitos?'];
const DAILY = [{key:'movimento',label:'Movimentei meu corpo'},{key:'sono',label:'Cuidei do meu descanso'},{key:'rotina',label:'Mantive minha rotina'}];
const daysOfWeek=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const weekMonday=(value=new Date())=>{const d=new Date(value);d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const localDate=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const weekdayIndex=(s)=>{const n=String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return ['domingo','segunda','terca','quarta','quinta','sexta','sabado'].findIndex(x=>n.includes(x));};


export default function App() {
  const [session,setSession] = useState(null);
  const [adminStatus,setAdminStatus] = useState('loading');
  const [boot,setBoot] = useState(true);
  const [bootError,setBootError] = useState('');
  const [passwordRecovery,setPasswordRecovery] = useState(false);
  const [onboarding,setOnboarding] = useState(null);
  const [onboardingLoading,setOnboardingLoading] = useState(false);
  const [onboardingError,setOnboardingError] = useState('');
  const [editingOnboarding,setEditingOnboarding] = useState(false);
  const [tab,setTab] = useState('chat');
  const [messages,setMessages] = useState([]);
  const [draft,setDraft] = useState('');
  const [sending,setSending] = useState(false);
  const [chatError,setChatError] = useState('');
  const [logs,setLogs] = useState([]);
  const [logError,setLogError] = useState('');
  const [training,setTraining] = useState(null);
  const [trainingExercises,setTrainingExercises] = useState({});
  const [trainingLoading,setTrainingLoading] = useState(false);
  const [trainingError,setTrainingError] = useState('');
  const [trainingGenerating,setTrainingGenerating] = useState(false);
  const [trainingGenerationError,setTrainingGenerationError] = useState('');
  const [onboardingThanks,setOnboardingThanks] = useState(false);
  const [profile,setProfile] = useState(null);
  const [photoUrl,setPhotoUrl] = useState('');
  const [diet,setDiet] = useState(null);
  const [dietLoading,setDietLoading] = useState(false);
  const [dietGenerating,setDietGenerating] = useState(false);
  const [dietError,setDietError] = useState('');
  const [checkins,setCheckins] = useState([]);
  const [checkinBusy,setCheckinBusy] = useState(false);
  const [checkinError,setCheckinError] = useState('');
  const [resetConfirm,setResetConfirm] = useState(false);
  const bottom = useRef(null);
  const today = new Date().toLocaleDateString('en-CA');

  useEffect(()=>{
    let alive=true;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{
      if(!alive)return;
      setSession(next);
      if(event==='PASSWORD_RECOVERY')setPasswordRecovery(true);
      if(event==='SIGNED_OUT'){
        setMessages([]);setLogs([]);setTraining(null);setTrainingExercises({});setTab('chat');setOnboarding(null);setEditingOnboarding(false);setOnboardingThanks(false);setTrainingGenerationError('');setProfile(null);setPhotoUrl('');setDiet(null);setCheckins([]);setAdminStatus('loading');
      }
    });
    (async()=>{
      try{
        const {data,error}=await supabase.auth.getSession();
        if(error)throw error;
        if(alive)setSession(data.session);
      }catch(err){if(alive)setBootError('Erro ao verificar sua sessão: '+(err.message||'erro desconhecido'));}
      finally{if(alive)setBoot(false);}
    })();
    return()=>{alive=false;subscription.unsubscribe();};
  },[]);

  const userId=session?.user?.id;
  useEffect(()=>{
    if(!userId){setAdminStatus('loading');return;}
    let active=true;
    setAdminStatus('loading');
    (async()=>{
      const {data,error}=await supabase.rpc('cm_is_admin');
      if(active)setAdminStatus(error?'error':data===true?'admin':'student');
    })();
    return ()=>{active=false;};
  },[userId]);
  useEffect(()=>{
    if(!userId){setOnboarding(null);setOnboardingLoading(false);return;}
    let active=true;
    setOnboarding(null);setOnboardingLoading(true);setOnboardingError('');
    (async()=>{
      const {data,error}=await supabase.from('onboarding_respostas').select('*')
        .eq('user_id',userId).order('created_at',{ascending:false}).limit(1);
      if(!active)return;
      if(error)setOnboardingError('Não foi possível carregar o questionário: '+error.message);
      else setOnboarding(data?.[0]||{onboarding_concluido:false});
      setOnboardingLoading(false);
    })();
    return()=>{active=false;};
  },[userId]);

  useEffect(()=>{
    if(!userId)return;
    setMessages([]);setLogs([]);setChatError('');setLogError('');
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

  useEffect(()=>{
    if(!userId)return;
    let active=true;
    (async()=>{
      const {data,error}=await supabase.from('profiles').select('id,nome,email,phone,foto_url').eq('id',userId).maybeSingle();
      if(!active)return;
      if(!error)setProfile(data||{id:userId,nome:session?.user?.user_metadata?.full_name||'',email:session?.user?.email||'',phone:'',foto_url:null});
    })();
    return()=>{active=false;};
  },[userId]);

  useEffect(()=>{
    let active=true;
    if(!profile?.foto_url){setPhotoUrl('');return;}
    (async()=>{
      const {data,error}=await supabase.storage.from('cm-avatars').createSignedUrl(profile.foto_url,3600);
      if(active)setPhotoUrl(error?'':data.signedUrl);
    })();
    return()=>{active=false;};
  },[profile?.foto_url]);

  async function loadCheckins(){
    if(!userId)return;
    const {data,error}=await supabase.from('cm_treino_checkins').select('id,plano_id,dia_semana,semana_inicio,concluido,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(1000);
    if(error){setCheckinError(error.message);return;}
    setCheckinError('');setCheckins(data||[]);
  }

  async function toggleCheckin(day){
    if(!userId||!training||checkinBusy)return;
    const dayIndex=weekdayIndex(day.dia);
    if(dayIndex<0){setCheckinError('Dia da semana inválido.');return;}
    const week=weekMonday();
    const item=checkins.find(x=>x.plano_id===training.id&&x.semana_inicio===week&&x.dia_semana===dayIndex);
    setCheckinBusy(true);setCheckinError('');
    try{
      if(item){
        const {error}=await supabase.from('cm_treino_checkins').delete().eq('id',item.id).eq('user_id',userId);
        if(error)throw error;
      }else{
        const {error}=await supabase.from('cm_treino_checkins').insert({user_id:userId,plano_id:training.id,dia_semana:dayIndex,semana_inicio:week,concluido:true});
        if(error)throw error;
      }
      await loadCheckins();
    }catch(e){setCheckinError(e.message||'Não foi possível atualizar o registro.');}
    finally{setCheckinBusy(false);}
  }

  async function resetWeek(){
    if(!userId||!training||checkinBusy)return;
    setCheckinBusy(true);setCheckinError('');
    try{
      const {error}=await supabase.from('cm_treino_checkins').delete().eq('user_id',userId).eq('plano_id',training.id).eq('semana_inicio',weekMonday());
      if(error)throw error;
      await loadCheckins();setResetConfirm(false);
    }catch(e){setCheckinError(e.message||'Erro ao zerar semana.');}
    finally{setCheckinBusy(false);}
  }

  async function loadDiet(){
    if(!userId)return;
    setDietLoading(true);setDietError('');
    try{
      const {data,error}=await supabase.from('cm_planos_alimentares').select('id,plano_json,status,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(1);
      if(error)throw error;
      setDiet(data?.[0]||null);
    }catch(e){setDietError(e.message||'Erro ao carregar orientações alimentares.');}
    finally{setDietLoading(false);}
  }

  async function generateDiet(){
    if(!userId||dietGenerating)return;
    setDietGenerating(true);setDietError('');
    try{
      const {data:{session:latest},error}=await supabase.auth.getSession();
      if(error||!latest||latest.user?.id!==userId)throw new Error('Faça login novamente.');
      const response=await fetch(`${URL}/functions/v1/cm-gerar-dieta-demo`,{
        method:'POST',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:`Bearer ${latest.access_token}`},body:'{}'
      });
      const result=await response.json().catch(()=>null);
      if(!response.ok||!result?.success)throw new Error(result?.error||'Não foi possível gerar as orientações.');
      await loadDiet();
    }catch(e){setDietError(e.message||'Falha na geração.');}
    finally{setDietGenerating(false);}
  }

  async function loadTraining(){
    if(!userId)return;
    setTrainingLoading(true);setTrainingError('');
    try{
      const {data:plans,error:planError}=await supabase.from('planos_treino')
        .select('id,status,treino_json,created_at').eq('user_id',userId)
        .order('created_at',{ascending:false}).limit(20);
      if(planError)throw planError;
      const plan=(plans||[]).find(x=>x.status==='publicado') ||
        (plans||[]).find(x=>x.status==='rascunho'&&x.treino_json?.demonstrativo===true) || null;
      const days=Array.isArray(plan?.treino_json?.dias)?plan.treino_json.dias:[];
      const ids=[...new Set(days.flatMap(d=>Array.isArray(d.exercicios)?d.exercicios.map(e=>e.exercicio_id):[]).filter(Boolean))];
      let lookup={};
      if(ids.length){
        const {data:items,error:exerciseError}=await supabase.from('biblioteca_exercicios')
          .select('id,nome,grupo_muscular,equipamento,instrucoes,observacoes_seguranca')
          .in('id',ids).eq('ativo',true);
        if(exerciseError)throw exerciseError;
        lookup=Object.fromEntries((items||[]).map(e=>[e.id,e]));
      }
      setTraining(plan);setTrainingExercises(lookup);
    }catch(err){setTrainingError(err.message||'Erro ao carregar treino.');}
    finally{setTrainingLoading(false);}
  }

  async function generateTraining(){
    if(!userId || !onboarding?.onboarding_concluido || trainingGenerating)return;
    setTrainingGenerationError('');
    setTrainingGenerating(true);
    try{
      const {data:{session:latest},error:sessionError}=await supabase.auth.getSession();
      if(sessionError || !latest || latest.user?.id!==userId){
        throw new Error('Sua sessão expirou. Entre novamente na sua conta.');
      }
      const response=await fetch(`${URL}/functions/v1/cm-gerar-treino-demo`,{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:KEY,Authorization:`Bearer ${latest.access_token}`},
        body:JSON.stringify({})
      });
      const result=await response.json().catch(()=>null);
      if(!response.ok || !result?.success){
        throw new Error(result?.error || 'Não foi possível gerar a proposta agora.');
      }
      await loadTraining();
      setOnboardingThanks(false);
      setTab('treino');
    }catch(error){
      setTrainingGenerationError(error?.message || 'Não foi possível gerar a proposta.');
    }finally{
      setTrainingGenerating(false);
    }
  }

  useEffect(()=>{
    if(userId&&onboarding?.onboarding_concluido){loadTraining();loadCheckins();loadDiet();}
    // Atualiza quando a identidade ou conclusão do questionário mudar.
  },[userId,onboarding?.onboarding_concluido]);

  async function send(value=draft){
    const message=value.trim();
    if(!message||sending||!session)return;
    setDraft('');setChatError('');setSending(true);
    const tempId='pending-'+Date.now();
    setMessages(v=>[...v,{id:tempId,role:'user',content:message,created_at:new Date().toISOString()}]);
    try {
      const {data:{session:latest},error:sErr}=await supabase.auth.getSession();
      if(sErr||!latest)throw new Error('Sessão indisponível. Atualize a página.');
      const res=await fetch(`${URL}/functions/v1/cm-chat`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${latest.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({message})});
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
  const weekRecords=checkins.filter(x=>x.plano_id===training?.id&&x.semana_inicio===weekMonday()&&x.concluido);
  const plannedDays=Array.isArray(training?.treino_json?.dias)?training.treino_json.dias:[];
  const weekCount=new Set(weekRecords.map(x=>x.dia_semana)).size;
  const totalChecks=checkins.filter(x=>x.concluido && x.plano_id===training?.id).length;
  const demoPlan=training?.treino_json?.demonstrativo===true||training?.status==='rascunho';

  return <div className="min-h-[100dvh] bg-[#031D15] text-[#F8F4E9] flex justify-center" style={{fontFamily:'Inter,system-ui,sans-serif'}}>
    <div className="w-full max-w-[520px] h-[100dvh] flex flex-col bg-[#06271C] border-x border-[#214632]">
      <header className="flex items-center px-5 py-3 gap-3 border-b border-[#244634] bg-[#06271C] min-h-[76px] shrink-0">
        <img src={LOGO} alt="Corpo Em Movimento" className="w-12 h-12 object-contain"/>
        <div className="flex-1 min-w-0"><h1 className="font-semibold tracking-wide text-base">Corpo Em Movimento</h1><p className="text-[#ADC4B2] text-xs">{tab==='chat'?'Seu acompanhamento inteligente':tab==='evolucao'?'Sua jornada, um dia de cada vez':tab==='treino'?'Sua proposta de musculação':tab==='dieta'?'Hábitos e alimentação':'Seu espaço'}</p></div>
        <button className={`w-10 h-10 grid place-items-center rounded-full border ${tab==='perfil'?'text-[#E8C579] border-[#D6B36B]':'border-[#28503B] text-[#B5C9B8]'}`} aria-label="Abrir perfil" onClick={()=>setTab(tab==='perfil'?'chat':'perfil')}><UserRound size={21}/></button>
      </header>
      {boot ? <div className="flex-1 grid place-items-center"><LoaderCircle className="animate-spin text-[#E8C579]"/></div> : bootError ? <div className="flex-1 p-8 text-center"><p className="text-amber-200">{bootError}</p><button className="mt-4 underline" onClick={()=>window.location.reload()}>Tentar novamente</button></div> : passwordRecovery ? <AuthScreen recoveryMode onFinishRecovery={()=>setPasswordRecovery(false)}/> : !session ? <AuthScreen/> : adminStatus==='loading' ? <div className="flex-1 grid place-items-center"><LoaderCircle className="animate-spin text-[#E8C579]"/></div> : adminStatus==='error' ? <div className="flex-1 p-6 text-red-200">Não foi possível verificar as permissões de acesso. Atualize a página ou contate o suporte.</div> : adminStatus==='admin' ? <AdminScreen userId={userId} onSignOut={()=>supabase.auth.signOut()}/> : onboardingLoading || !onboarding ? <div className="flex-1 grid place-items-center p-6 text-center">{onboardingError || 'Carregando seu perfil...'}{onboardingError&&<button className="block mt-3 underline text-[#E8C579]" onClick={()=>supabase.auth.signOut()}>Sair da conta</button>}</div> : (!onboarding.onboarding_concluido || editingOnboarding) ? <OnboardingScreen userId={userId} initial={onboarding} onDone={data=>{const firstCompletion=!onboarding.onboarding_concluido;setOnboarding(data);setEditingOnboarding(false);setTrainingGenerationError('');setOnboardingThanks(firstCompletion);setTab(firstCompletion?'treino':'perfil');}} onCancel={onboarding.onboarding_concluido?()=>setEditingOnboarding(false):null}/> : onboardingThanks ? <main className="flex-1 min-h-0 overflow-y-auto px-6 py-8 flex flex-col justify-center"><div className="max-w-sm mx-auto w-full text-center"><div className="w-24 h-24 rounded-full bg-[#153D2C] border border-[#BCA064] flex items-center justify-center mx-auto mb-6"><Check className="text-[#E8C579]" size={48}/></div><h2 className="text-2xl font-semibold">Questionário concluído!</h2><p className="text-sm text-[#BACFBE] mt-4 leading-relaxed">Obrigado por responder! Seu perfil foi salvo. Quando quiser, gere sua primeira proposta demonstrativa de musculação com IA.</p><button onClick={generateTraining} disabled={trainingGenerating} className="mt-8 w-full rounded-xl bg-[#D8B46B] text-[#0A271A] font-semibold px-4 py-4 disabled:opacity-50 flex justify-center items-center gap-2">{trainingGenerating?<><LoaderCircle size={18} className="animate-spin"/> Gerando proposta...</>:<><Dumbbell size={19}/> Gerar meu treino</>}</button><p className="text-xs text-[#B5C6B8] mt-4">Esta é uma simulação DEMO para testes. Não é prescrição liberada para execução.</p>{trainingGenerationError&&<p role="alert" className="mt-4 text-sm text-red-200">{trainingGenerationError}</p>}<button onClick={()=>{setOnboardingThanks(false);setTab('treino');}} disabled={trainingGenerating} className="mt-6 text-sm text-[#E8C579] underline disabled:opacity-40">Fazer isso depois</button></div></main> : <>
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
        {tab==='treino'&&<main className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
          <div className="flex justify-between items-start gap-3"><div><h2 className="text-2xl font-semibold">Meu Treino</h2><p className="text-[#ACC5B1] text-sm mt-1">Seu plano registrado no Corpo Em Movimento.</p></div><button onClick={loadTraining} disabled={trainingLoading} aria-label="Atualizar treino" className="border border-[#55745F] rounded-xl p-2 text-[#E8C579] disabled:opacity-40"><RefreshCw size={19}/></button></div>
          {trainingLoading&&<p className="text-sm text-[#ACC5B1]">Carregando treino...</p>}
          {trainingError&&<p role="alert" className="text-red-200 text-sm rounded-xl border border-red-800 p-3">{trainingError}</p>}
           {trainingGenerationError&&<p role="alert" className="text-red-200 text-sm rounded-xl border border-red-800 p-3">{trainingGenerationError}</p>}
           {!trainingLoading&&!training&&<button disabled={trainingGenerating} onClick={generateTraining} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#D8B46B] text-[#0A271A] font-semibold p-3 disabled:opacity-50">{trainingGenerating?<><LoaderCircle size={18} className="animate-spin"/> Gerando proposta...</>:<><Dumbbell size={18}/> Gerar meu treino</>}</button>}
          {!trainingLoading&&!trainingError&&!training&&<section className="rounded-2xl border border-[#31543F] bg-[#103629] p-5"><p className="font-semibold">Nenhum treino disponível</p><p className="text-sm text-[#B1C5B6] mt-2">Ainda não há plano publicado ou demonstrativo disponível na sua conta.</p></section>}
          {training&&!trainingLoading&&<>
            <div className="rounded-2xl border border-[#A98C51] bg-[#183D2C] p-4"><p className="text-xs font-semibold tracking-wider text-[#E8C579]">{training.treino_json?.demonstrativo?'SIMULAÇÃO DEMO · NÃO EXECUTAR COMO PRESCRIÇÃO':'PLANO REGISTRADO'}</p><h3 className="text-lg font-semibold mt-2">{training.treino_json?.titulo||'Treino de musculação'}</h3><p className="text-xs text-[#BCD0C1] mt-1">Status: {training.status}</p><p className="text-sm text-[#B9CDBD] mt-3">{training.treino_json?.justificativa||''}</p>{training.treino_json?.demonstrativo&&<p className="mt-3 text-sm text-[#F1D8A2]">Proposta fictícia para testar o aplicativo. Não é um treino liberado para execução; necessita validação profissional.</p>}</div>
            {training.treino_json?.requer_avaliacao&&<p className="rounded-xl bg-[#43301B] p-3 text-sm text-[#FFE0A7]">A proposta requer avaliação profissional antes de qualquer orientação individualizada.</p>}
            {(training.treino_json?.dias||[]).map((dia,di)=><section key={di} className="rounded-2xl bg-[#103629] border border-[#31543F] p-4 space-y-3"><div><h3 className="text-[#E8C579] font-semibold">{dia.dia}</h3><p className="text-sm text-[#B4CAB8]">{dia.foco}</p></div><label className="flex items-center gap-3 bg-[#09291E] rounded-xl p-3"><input type="checkbox" className="accent-[#D8B46B] w-5 h-5" checked={checkins.some(x=>x.plano_id===training.id&&x.semana_inicio===weekMonday()&&x.dia_semana===weekdayIndex(dia.dia))} disabled={checkinBusy} onChange={()=>toggleCheckin(dia)}/><span className="text-sm">{demoPlan?'Marcar simulação concluída':'Treino realizado'}</span></label>{(dia.exercicios||[]).map((ex,i)=>{const info=trainingExercises[ex.exercicio_id];return <div key={ex.exercicio_id+'-'+i} className="rounded-xl bg-[#09291E] border border-[#2E503C] p-3"><p className="font-medium text-sm">{info?.nome||'Exercício da biblioteca indisponível'}</p>{info&&<p className="text-xs text-[#A8C4AF] mt-1">{[info.grupo_muscular,info.equipamento].filter(Boolean).join(' · ')}</p>}<p className="text-sm text-[#E8C579] mt-2">{ex.series} séries · {ex.repeticoes} repetições</p>{info?.instrucoes&&<p className="text-xs text-[#B9CDBD] mt-2">{info.instrucoes}</p>}{info?.observacoes_seguranca&&<p className="text-xs text-[#EBD6A7] mt-2">Atenção: {info.observacoes_seguranca}</p>}{ex.observacao&&<p className="text-xs text-[#A9BCAE] mt-2">{ex.observacao}</p>}</div>})}</section>)}
            {!training.treino_json?.dias?.length&&<p className="text-sm text-[#BACDBE]">Nenhum exercício foi gerado para esta proposta.</p>}
            <section className="rounded-2xl border border-[#31543F] bg-[#103629] p-4 space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Controle semanal</h3><p className="text-xs text-[#A8C4AF]">{weekCount} de {plannedDays.length} dias marcados{demoPlan?' (simulação)':''}</p></div><CalendarDays size={22} className="text-[#D8B46B]"/></div><button onClick={()=>setResetConfirm(true)} disabled={checkinBusy||weekCount===0} className="rounded-xl border border-[#947C51] text-[#E8C579] text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-40"><RotateCcw size={16}/> Zerar semana</button>{resetConfirm&&<div className="p-3 rounded-xl bg-[#123A2B] text-sm"><p>Remover as marcações desta semana? As semanas anteriores serão preservadas.</p><div className="flex gap-3 mt-3"><button onClick={()=>setResetConfirm(false)} className="underline">Cancelar</button><button onClick={resetWeek} disabled={checkinBusy} className="bg-[#D8B46B] text-[#09291E] rounded-lg px-3 py-2">Confirmar</button></div></div>}{checkinError&&<p role="alert" className="text-red-200 text-xs">{checkinError}</p>}</section>
          </>}
        </main>}
        {tab==='dieta'&&<main className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
          <h2 className="text-2xl font-semibold">Minha Alimentação</h2>
          <p className="text-sm text-[#B1C5B6]">Ideias de refeições e organização alimentar geradas pela IA, com base nas preferências do questionário.</p>
          <div className="rounded-2xl border border-[#A98C51] bg-[#183D2C] p-4 text-sm text-[#F1D8A2]">Conteúdo educativo DEMO. Não é dieta prescrita nem substitui nutricionista. Restrições e alergias exigem atenção especial.</div>
          <button onClick={generateDiet} disabled={dietGenerating||dietLoading} className="w-full rounded-xl bg-[#D8B46B] text-[#09291E] font-semibold p-3 flex items-center justify-center gap-2 disabled:opacity-50">{dietGenerating?<><LoaderCircle className="animate-spin" size={17}/> Gerando ideias...</>:<><Utensils size={17}/> {diet?'Gerar novas sugestões':'Gerar sugestões com IA'}</>}</button>
          {dietLoading&&<p className="text-sm text-[#B1C5B6]">Carregando sugestões...</p>}
          {dietError&&<p role="alert" className="text-red-200 text-sm">{dietError}</p>}
          {diet&&<><div className="rounded-2xl bg-[#103629] p-4 border border-[#31543F]"><h3 className="font-semibold">{diet.plano_json?.titulo||'Organização alimentar'}</h3><p className="text-xs text-[#ACC3AF] mt-2">Gerado em {new Date(diet.created_at).toLocaleDateString('pt-BR')} · {diet.status}</p><p className="text-sm text-[#BDD0BE] mt-3">{diet.plano_json?.introducao||''}</p></div>{(diet.plano_json?.refeicoes||[]).map((r,i)=><section key={i} className="rounded-2xl bg-[#103629] border border-[#31543F] p-4"><h3 className="text-[#E8C579] font-semibold">{r.nome}</h3><p className="text-sm mt-2">{r.sugestao}</p></section>)}{Array.isArray(diet.plano_json?.dicas)&&<section className="rounded-2xl bg-[#103629] border border-[#31543F] p-4"><h3 className="font-semibold mb-2">Hábitos úteis</h3>{diet.plano_json.dicas.map((x,i)=><p key={i} className="text-sm mt-2 text-[#B9CDBD]">• {x}</p>)}</section>}</>}
        </main>}
        {tab==='evolucao'&&<main className="flex-1 overflow-y-auto px-5 py-7 space-y-5">
          <h2 className="text-2xl font-semibold">Minha evolução</h2><p className="text-sm text-[#B1C5B6]">Dados calculados automaticamente a partir dos registros.</p>
          <div className="grid grid-cols-2 gap-3"><section className="rounded-2xl bg-[#103629] border border-[#31543F] p-4"><p className="text-xs text-[#B1C5B6]">Esta semana</p><p className="text-3xl text-[#E8C579] font-semibold mt-2">{weekCount}/{plannedDays.length}</p><p className="text-xs mt-2">dias marcados</p></section><section className="rounded-2xl bg-[#103629] border border-[#31543F] p-4"><p className="text-xs text-[#B1C5B6]">Histórico do plano</p><p className="text-3xl text-[#E8C579] font-semibold mt-2">{totalChecks}</p><p className="text-xs mt-2">marcações totais</p></section></div>
          {demoPlan&&<p className="text-xs text-[#E8C579]">Você está usando um treino DEMO: as marcações são simulações, não comprovações de exercício realizado.</p>}
          <section className="rounded-2xl bg-[#103629] border border-[#31543F] p-4"><h3 className="font-semibold">Adesão da semana</h3><div className="mt-3 w-full rounded-full bg-[#09291E] h-3 overflow-hidden"><div className="h-full bg-[#D8B46B] rounded-full" style={{width:`${plannedDays.length?Math.min(100,weekCount/plannedDays.length*100):0}%`}}/></div><p className="text-xs text-[#B1C5B6] mt-2">{plannedDays.length?Math.round(weekCount/plannedDays.length*100):0}% das sessões listadas no plano</p></section>
          <section className="rounded-2xl bg-[#103629] border border-[#31543F] p-4"><h3 className="font-semibold">Hábitos de hoje <span className="text-[#E8C579]">{doneToday}/{DAILY.length}</span></h3><div className="mt-4 space-y-3">{DAILY.map(h=>{const done=logs.some(l=>l.day===today&&l.habit===h.key);return <button key={h.key} onClick={()=>toggleHabit(h.key)} className={`w-full text-left flex gap-3 items-center rounded-xl border p-3 ${done?'border-[#B99B60] bg-[#214732]':'border-[#31533F] bg-[#0A2C20]'}`}><span>{done?'✓':'+'}</span><span className="text-sm">{h.label}</span></button>})}</div></section>
          <section className="rounded-2xl bg-[#103629] border border-[#31543F] p-4"><h3 className="font-semibold">Últimos sete dias</h3><p className="text-sm text-[#B1C5B6] mt-2">{attended}/7 dias com hábitos registrados</p></section>{logError&&<p role="alert" className="text-sm text-red-200">{logError}</p>}
        </main>}
        {tab==='perfil'&&<ProfileScreen profile={profile} photoUrl={photoUrl} onboarding={onboarding} session={session} userId={userId} onSaved={setProfile} onEditOnboarding={()=>setEditingOnboarding(true)} onBack={()=>setTab('chat')} onSignOut={async()=>{const {error}=await supabase.auth.signOut();if(error)setBootError(error.message);}}/>}
        <nav className="shrink-0 border-t border-[#2C503D] flex bg-[#052219] pb-[env(safe-area-inset-bottom)]" aria-label="Menu principal">{[{id:'chat',label:'Chat',Icon:MessageCircle},{id:'treino',label:'Meu Treino',Icon:Dumbbell},{id:'dieta',label:'Dieta',Icon:Utensils},{id:'evolucao',label:'Evolução',Icon:TrendingUp}].map(({id,label,Icon})=><button key={id} onClick={()=>setTab(id)} className={`flex-1 flex flex-col justify-center items-center h-16 gap-1 text-xs ${tab===id?'text-[#E8C579]':'text-[#99B2A0]'}`}><Icon size={22}/>{label}</button>)}</nav>
      </>}
    </div>
  </div>;
}

function AuthScreen({recoveryMode=false,onFinishRecovery=()=>{}}){
  const [mode,setMode]=useState(recoveryMode?'update':'login');
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [info,setInfo]=useState('');
  useEffect(()=>{if(recoveryMode)setMode('update');},[recoveryMode]);

  async function submit(e){
    e.preventDefault();setError('');setInfo('');
    if(mode==='register' && !name.trim()){setError('Informe seu nome.');return;}
    if(['register','update'].includes(mode) && password.length<8){setError('A senha precisa ter pelo menos 8 caracteres.');return;}
    if(['register','update'].includes(mode) && password!==confirm){setError('As senhas não coincidem.');return;}
    setBusy(true);
    try{
      if(mode==='login'){
        const {error:e}=await supabase.auth.signInWithPassword({email:email.trim(),password});
        if(e)throw e;
      }else if(mode==='register'){
        const {data,error:e}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{full_name:name.trim()}}});
        if(e)throw e;
        if(!data.session)setInfo('Conta criada. Verifique sua caixa de entrada para concluir o cadastro.');
      }else if(mode==='forgot'){
        const {error:e}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin});
        if(e)throw e;
        setInfo('Se o e-mail estiver cadastrado, você receberá um link de recuperação.');
      }else{
        const {error:e}=await supabase.auth.updateUser({password});
        if(e)throw e;
        setInfo('Senha alterada com sucesso.');
        setPassword('');setConfirm('');onFinishRecovery();
      }
    }catch(err){setError(err.message||'Não foi possível concluir a operação.');}
    finally{setBusy(false);}
  }
  const field='w-full rounded-xl border border-[#426650] bg-[#113A2B] px-4 py-3 text-[#F8F4E9] outline-none focus:border-[#E8C579]';
  function switchMode(next){setMode(next);setError('');setInfo('');setPassword('');setConfirm('');}
  return <main className="flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-center">
    <div className="mx-auto w-full max-w-sm">
      <img src={LOGO} alt="Corpo Em Movimento" className="h-20 w-20 object-contain mx-auto mb-5"/>
      <h2 className="text-center text-2xl font-semibold">{mode==='login'?'Bem-vindo de volta':mode==='register'?'Crie sua conta':mode==='forgot'?'Recuperar senha':'Definir nova senha'}</h2>
      <p className="text-center text-sm text-[#B3C7B8] mt-2 mb-7">{mode==='register'?'Comece sua jornada com um acesso só seu.':mode==='login'?'Entre para continuar sua jornada.':'Siga as instruções para recuperar o acesso.'}</p>
      <form onSubmit={submit} className="space-y-4">
        {mode==='register'&&<label className="block text-sm">Nome completo<input className={field+' mt-2'} required value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>}
        {mode!=='update'&&<label className="block text-sm">E-mail<input className={field+' mt-2'} type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>}
        {!['forgot'].includes(mode)&&<label className="block text-sm">{mode==='update'?'Nova senha':'Senha'}<input className={field+' mt-2'} type="password" required minLength={mode==='login'?1:8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='login'?'current-password':'new-password'}/></label>}
        {['register','update'].includes(mode)&&<label className="block text-sm">Confirmar senha<input className={field+' mt-2'} type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password"/></label>}
        {error&&<p role="alert" className="text-sm text-red-200">{error}</p>}
        {info&&<p role="status" className="text-sm text-[#E8C579]">{info}</p>}
        <button disabled={busy} type="submit" className="w-full rounded-xl bg-[#D8B46B] text-[#0A271A] font-semibold p-3 disabled:opacity-50">{busy?'Aguarde...':mode==='login'?'Entrar':mode==='register'?'Criar conta':mode==='forgot'?'Enviar link':'Salvar nova senha'}</button>
      </form>
      {mode==='login'&&<><button className="block text-sm text-[#E8C579] mx-auto mt-5" onClick={()=>switchMode('forgot')}>Esqueci minha senha</button><p className="text-center text-sm mt-6">Ainda não tem conta? <button className="text-[#E8C579] font-semibold" onClick={()=>switchMode('register')}>Cadastre-se</button></p></>}
      {mode==='register'&&<p className="text-center text-sm mt-6">Já tem uma conta? <button className="text-[#E8C579] font-semibold" onClick={()=>switchMode('login')}>Entrar</button></p>}
      {mode==='forgot'&&<button className="block text-sm text-[#E8C579] mx-auto mt-6" onClick={()=>switchMode('login')}>Voltar para login</button>}
    </div>
  </main>;
}


const INITIAL_ANSWERS = {
  idade:'',altura_cm:'',peso_atual:'',genero:'',objetivo:'',meta_peso:'',
  experiencia_musculacao:'',nivel_atividade:'',estrutura:'academia',
  disponibilidade:[],tempo_treino_min:'',equipamentos:[],limitacoes_fisicas:'',
  restricoes_alimentares:'',preferencias_alimentares:'',habitos_alimentares:'',termos_aceitos:false
};
const STEPS = ['Sobre você','Seu objetivo','Sua rotina','Saúde e alimentação','Confirmação'];
const FIELD = 'w-full rounded-xl border border-[#426650] bg-[#113A2B] px-4 py-3 mt-2 text-[#F8F4E9] outline-none focus:border-[#E8C579]';
function OnboardingScreen({userId,initial,onDone,onCancel}){
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState(()=>({...INITIAL_ANSWERS,...(initial||{}),
    disponibilidade:Array.isArray(initial?.disponibilidade)?initial.disponibilidade:[],
    equipamentos:Array.isArray(initial?.equipamentos)?initial.equipamentos:[],
    idade:initial?.idade??'',altura_cm:initial?.altura_cm??'',peso_atual:initial?.peso_atual??'',
    meta_peso:initial?.meta_peso??'',tempo_treino_min:initial?.tempo_treino_min??''}));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const set=(field,value)=>setAnswers(a=>({...a,[field]:value}));
  const toggle=(field,value)=>setAnswers(a=>({...a,[field]:a[field].includes(value)?a[field].filter(v=>v!==value):[...a[field],value]}));
  const options=(field,items)=><div className="flex flex-wrap gap-2 mt-3">{items.map(item=><button key={item} type="button" onClick={()=>toggle(field,item)} className={`rounded-xl px-3 py-2 text-sm border ${answers[field].includes(item)?'bg-[#D8B46B] text-[#0B291B] border-[#D8B46B]':'bg-[#113A2B] border-[#426650]'}`}>{item}</button>)}</div>;
  const dropdown=(field,items,label)=><label className="block text-sm mt-4">{label}<select required value={answers[field]} onChange={e=>set(field,e.target.value)} className={FIELD}><option value="">Selecione</option>{items.map(x=><option key={x} value={x}>{x}</option>)}</select></label>;
  const number=(field,label,min,max,stepValue='1')=><label className="block text-sm mt-4">{label}<input type="number" inputMode="decimal" min={min} max={max} step={stepValue} value={answers[field]} onChange={e=>set(field,e.target.value)} className={FIELD}/></label>;
  const textarea=(field,label,placeholder)=><label className="block text-sm mt-4">{label}<textarea rows={3} value={answers[field]||''} onChange={e=>set(field,e.target.value)} placeholder={placeholder} className={FIELD+' resize-none'}/></label>;
  function validate(){
    if(step===0 && (!answers.idade || +answers.idade<18 || +answers.idade>100 || +answers.altura_cm<90 || +answers.altura_cm>240 || +answers.peso_atual<25 || +answers.peso_atual>350)) return 'Preencha idade (18 a 100), altura (90 a 240 cm) e peso (25 a 350 kg).';
    if(step===1 && (!answers.objetivo || !answers.experiencia_musculacao))return 'Selecione seu objetivo e nível de experiência.';
    if(step===2 && (!answers.disponibilidade.length || !answers.tempo_treino_min || +answers.tempo_treino_min<15 || +answers.tempo_treino_min>180))return 'Informe os dias e a duração do treino (15 a 180 minutos).';
    if(step===4 && !answers.termos_aceitos)return 'Leia e aceite o uso das respostas para personalização.';
    return '';
  }
  async function next(){setError('');const err=validate();if(err){setError(err);return;}if(step<4){setStep(s=>s+1);return;}
    setBusy(true);
    try{
      const numeric=k=>answers[k]===''?null:Number(answers[k]);
      const payload={user_id:userId,genero:answers.genero||null,objetivo:answers.objetivo,
        idade:numeric('idade'),altura_cm:numeric('altura_cm'),peso_atual:numeric('peso_atual'),meta_peso:numeric('meta_peso'),
        experiencia_musculacao:answers.experiencia_musculacao,nivel_atividade:answers.nivel_atividade||null,
        estrutura:answers.estrutura,disponibilidade:answers.disponibilidade,tempo_treino_min:numeric('tempo_treino_min'),
        equipamentos:answers.equipamentos,limitacoes_fisicas:answers.limitacoes_fisicas||null,
        restricoes_alimentares:answers.restricoes_alimentares||null,
        preferencias_alimentares:answers.preferencias_alimentares||null,
        habitos_alimentares:answers.habitos_alimentares||null,termos_aceitos:true,
        modalidade:'musculacao',onboarding_concluido:true,updated_at:new Date().toISOString()};
      const query=initial?.id
        ? supabase.from('onboarding_respostas').update(payload).eq('id',initial.id).eq('user_id',userId)
        : supabase.from('onboarding_respostas').insert(payload);
      const {data,error:saveError}=await query.select('*').single();
      if(saveError)throw saveError;
      onDone(data);
    }catch(e){setError('Não foi possível salvar: '+(e.message||'erro inesperado'));}
    finally{setBusy(false);}
  }
  return <main className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
    <div className="max-w-sm mx-auto pb-6">
      <div className="flex items-center justify-between text-xs text-[#B3C7B8]"><span>Seu perfil de treino</span><span>Etapa {step+1} de {STEPS.length}</span></div>
      <div className="h-1.5 rounded-full bg-[#315641] mt-3 mb-7"><div className="h-full rounded-full bg-[#D8B46B]" style={{width:`${(step+1)*20}%`}}/></div>
      <h2 className="text-2xl font-semibold">{STEPS[step]}</h2>
      <p className="text-sm text-[#B3C7B8] mt-2 mb-5">{step===0?'Vamos conhecer suas características.':step===1?'O que você deseja conquistar?':step===2?'Vamos adaptar o treino à sua disponibilidade.':step===3?'Estas respostas são opcionais e ajudam a identificar cuidados necessários.':'Confira as informações antes de finalizar.'}</p>
      {step===0&&<>
        {number('idade','Sua idade (anos)',18,100)}
        {number('altura_cm','Sua altura (cm)',90,240,'0.1')}
        {number('peso_atual','Seu peso atual (kg)',25,350,'0.1')}
        {dropdown('genero',['Feminino','Masculino','Outro','Prefiro não informar'],'Gênero (opcional)')}
      </>}
      {step===1&&<>
        {dropdown('objetivo',['Ganhar massa muscular','Emagrecer','Recomposição corporal','Melhorar força','Melhorar condicionamento'],'Objetivo principal')}
        {dropdown('experiencia_musculacao',['Iniciante','Intermediário','Avançado'],'Experiência em musculação')}
        {dropdown('nivel_atividade',['Sedentário','Pouco ativo','Moderadamente ativo','Muito ativo'],'Nível atual de atividade (opcional)')}
        {number('meta_peso','Meta de peso em kg (opcional)',25,350,'0.1')}
      </>}
      {step===2&&<>
        {dropdown('estrutura',['academia','casa com equipamentos'],'Onde pretende treinar?')}
        <p className="text-sm mt-5">Quais dias você tem disponíveis?</p>
        {options('disponibilidade',['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'])}
        {number('tempo_treino_min','Tempo disponível por treino (minutos)',15,180)}
        <p className="text-sm mt-5">Equipamentos disponíveis (opcional)</p>
        {options('equipamentos',['Máquinas','Halteres','Barra','Elásticos','Banco','Peso corporal'])}
      </>}
      {step===3&&<>
        {textarea('limitacoes_fisicas','Lesões, dores ou limitações (opcional)','Se houver, descreva. Evite fornecer diagnósticos detalhados.')}
        {textarea('restricoes_alimentares','Restrições alimentares (opcional)','Alergias ou alimentos que evita')}
        {textarea('preferencias_alimentares','Preferências alimentares (opcional)','Alimentos que prefere ou não gosta')}
        {textarea('habitos_alimentares','Rotina alimentar (opcional)','Como costuma organizar suas refeições?')}
        <p className="text-xs text-[#B3C7B8] mt-4">O app não substitui orientação médica, de nutricionista ou de profissional de educação física.</p>
      </>}
      {step===4&&<>
        <div className="bg-[#103629] border border-[#315641] p-4 rounded-xl text-sm space-y-2">
          <p><strong>Objetivo:</strong> {answers.objetivo}</p><p><strong>Experiência:</strong> {answers.experiencia_musculacao}</p>
          <p><strong>Local:</strong> {answers.estrutura}</p><p><strong>Dias:</strong> {answers.disponibilidade.join(', ')}</p>
          <p><strong>Tempo:</strong> {answers.tempo_treino_min} min</p>
        </div>
        <label className="flex gap-3 mt-5 text-sm items-start"><input type="checkbox" checked={!!answers.termos_aceitos} onChange={e=>set('termos_aceitos',e.target.checked)} className="mt-1"/><span>Autorizo o armazenamento e uso das minhas respostas, incluindo as informações opcionais de saúde e alimentação, para personalizar minha experiência no aplicativo. Posso atualizá-las posteriormente.</span></label>
        <p className="text-xs text-[#B3C7B8] mt-3">A geração de treino individualizado será habilitada após integração e validação dos protocolos profissionais.</p>
      </>}
      {error&&<p role="alert" className="mt-4 text-sm text-red-200">{error}</p>}
      <div className="flex gap-3 mt-8">
        {(step>0||onCancel)&&<button type="button" disabled={busy} onClick={()=>{if(step>0){setStep(s=>s-1);setError('');}else onCancel?.();}} className="px-5 py-3 border border-[#426650] rounded-xl">Voltar</button>}
        <button type="button" disabled={busy} onClick={next} className="flex-1 px-4 py-3 bg-[#D8B46B] text-[#0A271A] font-semibold rounded-xl disabled:opacity-50">{busy?'Salvando...':step===4?'Concluir questionário':'Continuar'}</button>
      </div>
    </div>
  </main>;
}

function ProfileScreen({profile,photoUrl,onboarding,session,userId,onSaved,onEditOnboarding,onBack,onSignOut}){
  const [nome,setNome]=useState(profile?.nome||session?.user?.user_metadata?.full_name||'');
  const [phone,setPhone]=useState(profile?.phone||'');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [info,setInfo]=useState('');
  useEffect(()=>{setNome(profile?.nome||session?.user?.user_metadata?.full_name||'');setPhone(profile?.phone||'');},[profile?.nome,profile?.phone,session?.user?.id]);
  async function save(){
    setBusy(true);setError('');setInfo('');
    try{
      if(!nome.trim())throw new Error('Informe seu nome.');
      const {data,error}=await supabase.from('profiles').upsert({id:userId,nome:nome.trim(),email:session.user.email,phone:phone.trim()||null},{onConflict:'id'}).select('id,nome,email,phone,foto_url').single();
      if(error)throw error;
      onSaved(data);setInfo('Dados atualizados.');
    }catch(e){setError(e.message||'Não foi possível salvar.');}
    finally{setBusy(false);}
  }
  async function uploadPhoto(event){
    const file=event.target.files?.[0];if(!file)return;
    setError('');setInfo('');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){setError('Use JPG, PNG ou WebP de até 2 MB.');return;}
    setBusy(true);
    try{
      const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
      const path=`${userId}/avatar-${Date.now()}.${ext}`;
      const {error:uploadError}=await supabase.storage.from('cm-avatars').upload(path,file,{contentType:file.type,upsert:false});
      if(uploadError)throw uploadError;
      const {data,error}=await supabase.from('profiles').upsert({id:userId,email:session.user.email,foto_url:path},{onConflict:'id'}).select('id,nome,email,phone,foto_url').single();
      if(error)throw error;
      onSaved(data);setInfo('Foto atualizada.');
    }catch(e){setError(e.message||'Falha no envio da foto.');}
    finally{setBusy(false);event.target.value='';}
  }
  return <main className="flex-1 overflow-y-auto px-6 py-6 space-y-5"><button onClick={onBack} className="text-[#E8C579] text-sm flex gap-2 items-center"><ArrowLeft size={16}/> Voltar</button>
    <h2 className="text-2xl font-semibold">Meu Perfil</h2><div className="flex flex-col items-center gap-3">
      <div className="w-24 h-24 bg-[#133D2B] border border-[#B99B60] rounded-full overflow-hidden grid place-items-center">{photoUrl?<img src={photoUrl} alt="Foto de perfil" className="w-full h-full object-cover"/>:<UserRound size={43} className="text-[#E8C579]"/>}</div>
      <label className="border border-[#B99B60] rounded-xl text-sm px-4 py-2 text-[#E8C579] flex gap-2 items-center cursor-pointer"><Camera size={16}/> Alterar foto<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadPhoto} disabled={busy}/></label>
    </div><section className="rounded-2xl bg-[#103629] border border-[#31543F] p-4 space-y-3"><h3 className="font-semibold">Dados de cadastro</h3><label className="block text-sm">Nome<input value={nome} onChange={e=>setNome(e.target.value)} className="mt-1 w-full rounded-xl bg-[#09291E] border border-[#426650] px-3 py-2"/></label><label className="block text-sm">E-mail<input readOnly value={session?.user?.email||''} className="mt-1 w-full rounded-xl bg-[#09291E] border border-[#426650] px-3 py-2 opacity-70"/></label><label className="block text-sm">Telefone<input value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 w-full rounded-xl bg-[#09291E] border border-[#426650] px-3 py-2"/></label><button onClick={save} disabled={busy} className="w-full rounded-xl bg-[#D8B46B] text-[#09291E] p-3 font-semibold disabled:opacity-50">{busy?'Salvando...':'Salvar meus dados'}</button></section>
    <section className="rounded-2xl bg-[#103629] border border-[#31543F] p-4 space-y-2"><h3 className="font-semibold">Meu questionário</h3><p className="text-sm text-[#B1C5B6]">Objetivo: {onboarding?.objetivo||'Não definido'}</p><p className="text-sm text-[#B1C5B6]">Experiência: {onboarding?.experiencia_musculacao||'Não definido'}</p><p className="text-sm text-[#B1C5B6]">Disponibilidade: {(onboarding?.disponibilidade||[]).join(', ')||'Não definida'}</p><button className="text-[#E8C579] underline text-sm mt-3" onClick={onEditOnboarding}>Atualizar questionário</button></section>
    {error&&<p role="alert" className="text-red-200 text-sm">{error}</p>}{info&&<p role="status" className="text-[#E8C579] text-sm">{info}</p>}
    <button onClick={onSignOut} className="flex items-center gap-2 border border-[#8D6653] text-[#F2CEC0] rounded-xl px-4 py-3"><LogOut size={17}/> Sair da conta</button>
  </main>;
}


function AdminScreen({userId,onSignOut}){
  const [section,setSection]=useState('resumo');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [records,setRecords]=useState({profiles:[],onboarding:[],treinos:[],dietas:[],checkins:[]});
  const [filter,setFilter]=useState('');
  const [selected,setSelected]=useState(null);
  const [expanded,setExpanded]=useState(false);

  async function refresh(){
    setLoading(true);setError('');
    try{
      // Cada SELECT é limitado pelas políticas RLS do Supabase.
      const tables=[
        ['profiles','id,nome,email,phone,role,is_admin'],
        ['onboarding_respostas','id,user_id,objetivo,experiencia_musculacao,disponibilidade,onboarding_concluido,created_at'],
        ['planos_treino','id,user_id,status,treino_json,created_at'],
        ['cm_planos_alimentares','id,user_id,status,plano_json,created_at'],
        ['cm_treino_checkins','id,user_id,plano_id,semana_inicio,dia_semana,concluido,created_at']
      ];
      const results=await Promise.all(tables.map(async ([name,fields])=>{
        const {data,error}=await supabase.from(name).select(fields).limit(1000);
        if(error)throw new Error(name+': '+error.message);
        return data||[];
      }));
      const next=Object.fromEntries(tables.map(([name],i)=>[name==='onboarding_respostas'?'onboarding':name==='planos_treino'?'treinos':name==='cm_planos_alimentares'?'dietas':name==='cm_treino_checkins'?'checkins':name,results[i]]));
      setRecords(next);
    }catch(err){setError(err.message||'Falha ao carregar os indicadores.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{refresh();},[userId]);
  const {profiles,onboarding,treinos,dietas,checkins}=records;
  const students=profiles.filter(p=>!(p.is_admin||p.role==='admin'||p.role==='professor'));
  const search=filter.trim().toLocaleLowerCase('pt-BR');
  const results=students.filter(p=>`${p.nome||''} ${p.email||''}`.toLocaleLowerCase('pt-BR').includes(search));
  const person=id=>profiles.find(p=>p.id===id);
  const name=id=>person(id)?.nome||person(id)?.email||'Conta sem nome cadastrado';
  const fmt=date=>date?new Date(date).toLocaleDateString('pt-BR'):'—';
  const selectedProfile=person(selected);
  const selectedOnboarding=onboarding.filter(x=>x.user_id===selected).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0];
  const selectedWorkouts=treinos.filter(x=>x.user_id===selected);
  const selectedDiets=dietas.filter(x=>x.user_id===selected);
  const selectedCheckins=checkins.filter(x=>x.user_id===selected&&x.concluido);
  const card='rounded-2xl border border-[#31543F] bg-[#103629] p-4';
  const tabs=[['resumo','Resumo',BarChart3],['alunos','Alunos',Users],['treinos','Treinos',Dumbbell],['dietas','Dietas',Utensils],['evolucao','Evolução',TrendingUp]];
  return <main className="flex-1 min-h-0 flex flex-col">
    <div className="px-5 pt-5 pb-3 border-b border-[#31543F] shrink-0">
      <div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-[#E8C579] text-xs uppercase tracking-wider"><ShieldCheck size={15}/> Área restrita</div><h2 className="text-xl font-semibold mt-1">Painel Administrativo</h2></div><div className="flex gap-2"><button aria-label="Atualizar indicadores" onClick={refresh} disabled={loading} className="border border-[#426650] rounded-xl p-2"><RefreshCw size={19} className={loading?'animate-spin':''}/></button><button aria-label="Sair da conta" onClick={onSignOut} className="border border-[#426650] rounded-xl p-2"><LogOut size={19}/></button></div></div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{tabs.map(([id,label,Icon])=><button key={id} onClick={()=>{setSection(id);setSelected(null);setExpanded(false);}} className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border ${section===id?'bg-[#D8B46B] text-[#09291E] border-[#D8B46B]':'bg-[#103629] border-[#426650] text-[#BBD0C0]'}`}><Icon size={15}/>{label}</button>)}</div>
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-4">
      {error&&<div role="alert" className="p-3 bg-red-950/50 text-red-100 text-sm rounded-xl">{error}</div>}
      {loading&&<p className="text-sm text-[#BCD0C1]">Carregando dados do painel...</p>}
      {!loading&&<>
        {section==='resumo'&&<>
          <p className="text-sm text-[#B9CDBD]">Visão geral dos registros disponíveis no Supabase.</p>
          <div className="grid grid-cols-2 gap-3">{[[students.length,'Alunos',Users],[treinos.length,'Planos de treino',Dumbbell],[dietas.length,'Planos alimentares',Utensils],[checkins.filter(c=>c.concluido).length,'Marcações de treino',Activity]].map(([value,label,Icon])=><div className={card} key={label}><Icon size={19} className="text-[#E8C579]"/><p className="text-3xl font-semibold mt-3">{value}</p><p className="text-xs mt-1 text-[#B8CEBD]">{label}</p></div>)}</div>
          <div className={card}><h3 className="font-semibold">Acompanhamento</h3><p className="text-sm text-[#B9CDBD] mt-2">Consulte os alunos, os planos registrados e as marcações de treinos. As propostas DEMO continuam identificadas como demonstrativas.</p></div>
        </>}
        {section==='alunos'&&<>
          <label className="flex gap-2 items-center px-3 rounded-xl border border-[#426650] bg-[#09291E]"><Search size={18} className="text-[#B8CEBD]"/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar aluno por nome ou e-mail" className="bg-transparent w-full outline-none py-3 text-sm"/></label>
          <p className="text-xs text-[#B8CEBD]">{results.length} aluno(s) encontrado(s)</p>
          {results.map(p=><button key={p.id} onClick={()=>{setSelected(p.id);setExpanded(false);}} className="w-full text-left rounded-xl border border-[#31543F] bg-[#103629] p-4 flex justify-between items-center"><span className="min-w-0"><strong className="block text-sm truncate">{p.nome||'Nome não informado'}</strong><span className="block text-xs text-[#B8CEBD] truncate mt-1">{p.email}</span></span><Eye className="shrink-0 text-[#E8C579]" size={18}/></button>)}
          {selectedProfile&&<section className={card}><div className="flex justify-between items-center"><h3 className="font-semibold">Detalhes do aluno</h3><button onClick={()=>setSelected(null)} aria-label="Fechar detalhes"><X size={18}/></button></div><p className="font-medium mt-3">{selectedProfile.nome||'Nome não informado'}</p><p className="text-xs text-[#B8CEBD] mt-1">{selectedProfile.email}</p><div className="mt-3 space-y-2 text-sm"><p>Objetivo: {selectedOnboarding?.objetivo||'Não informado'}</p><p>Experiência: {selectedOnboarding?.experiencia_musculacao||'Não informada'}</p><p>Dias disponíveis: {(selectedOnboarding?.disponibilidade||[]).join(', ')||'Não informado'}</p><p>Planos de treino: {selectedWorkouts.length}</p><p>Planos alimentares: {selectedDiets.length}</p><p>Marcações: {selectedCheckins.length}</p></div></section>}
        </>}
        {section==='treinos'&&<><p className="text-sm text-[#B9CDBD]">Planos cadastrados — consulta administrativa.</p>{[...treinos].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).map(p=><article className={card} key={p.id}><p className="font-medium">{p.treino_json?.titulo||'Plano de treino'}</p><p className="text-xs text-[#B9CDBD] mt-1">{name(p.user_id)} · {fmt(p.created_at)}</p><p className="text-xs text-[#E8C579] mt-2">{p.treino_json?.demonstrativo?'DEMO — não liberado para execução':p.status}</p></article>)}{!treinos.length&&<p className="text-sm text-[#B9CDBD]">Nenhum plano encontrado.</p>}</>}
        {section==='dietas'&&<><p className="text-sm text-[#B9CDBD]">Planos alimentares cadastrados — consulta administrativa.</p>{[...dietas].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).map(p=><article className={card} key={p.id}><p className="font-medium">{p.plano_json?.titulo||'Plano alimentar'}</p><p className="text-xs text-[#B9CDBD] mt-1">{name(p.user_id)} · {fmt(p.created_at)}</p><p className="text-xs text-[#E8C579] mt-2">{p.status==='aprovado'?'Registrado como aprovado':'Rascunho demonstrativo'}</p></article>)}{!dietas.length&&<p className="text-sm text-[#B9CDBD]">Nenhum plano encontrado.</p>}</>}
        {section==='evolucao'&&<><p className="text-sm text-[#B9CDBD]">Registros de conclusão dos treinos. Marcações DEMO não comprovam atividades realizadas.</p><div className={card}><h3 className="font-semibold">Esta semana</h3><p className="text-3xl text-[#E8C579] mt-2">{checkins.filter(c=>c.concluido&&c.semana_inicio===weekMonday()).length}</p><p className="text-xs text-[#B9CDBD] mt-1">Marcações registradas</p></div>{students.map(p=>{const n=checkins.filter(c=>c.user_id===p.id&&c.concluido).length;return <div className={card} key={p.id}><p className="font-medium text-sm">{p.nome||p.email}</p><p className="text-xs text-[#B9CDBD] mt-1">{n} marcação(ões) no histórico consultado</p></div>})}</>}
        <p className="text-xs text-[#94AE9C] leading-relaxed">Indicadores calculados com até 1.000 registros por tabela; não representam necessariamente a base completa. O acesso é condicionado às políticas do Supabase.</p>
      </>}
    </div>
  </main>;
}
