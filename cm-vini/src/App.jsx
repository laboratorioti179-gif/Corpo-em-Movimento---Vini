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
  const bottom = useRef(null);
  const today = new Date().toLocaleDateString('en-CA');

  useEffect(()=>{
    let alive=true;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{
      if(!alive)return;
      setSession(next);
      if(event==='PASSWORD_RECOVERY')setPasswordRecovery(true);
      if(event==='SIGNED_OUT'){
        setMessages([]);setLogs([]);setTab('chat');setOnboarding(null);setEditingOnboarding(false);
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

  return <div className="min-h-[100dvh] bg-[#031D15] text-[#F8F4E9] flex justify-center" style={{fontFamily:'Inter,system-ui,sans-serif'}}>
    <div className="w-full max-w-[520px] h-[100dvh] flex flex-col bg-[#06271C] border-x border-[#214632]">
      <header className="flex items-center px-5 py-3 gap-3 border-b border-[#244634] bg-[#06271C] min-h-[76px] shrink-0">
        <img src={LOGO} alt="Corpo Em Movimento" className="w-12 h-12 object-contain"/>
        <div className="flex-1 min-w-0"><h1 className="font-semibold tracking-wide text-base">Corpo Em Movimento</h1><p className="text-[#ADC4B2] text-xs">{tab==='chat'?'Seu acompanhamento inteligente':tab==='evolucao'?'Sua jornada, um dia de cada vez':'Seu espaço'}</p></div>
        <button className={`w-10 h-10 grid place-items-center rounded-full border ${tab==='perfil'?'text-[#E8C579] border-[#D6B36B]':'border-[#28503B] text-[#B5C9B8]'}`} aria-label="Abrir perfil" onClick={()=>setTab(tab==='perfil'?'chat':'perfil')}><UserRound size={21}/></button>
      </header>
      {boot ? <div className="flex-1 grid place-items-center"><LoaderCircle className="animate-spin text-[#E8C579]"/></div> : bootError ? <div className="flex-1 p-8 text-center"><p className="text-amber-200">{bootError}</p><button className="mt-4 underline" onClick={()=>window.location.reload()}>Tentar novamente</button></div> : passwordRecovery ? <AuthScreen recoveryMode onFinishRecovery={()=>setPasswordRecovery(false)}/> : !session ? <AuthScreen/> : onboardingLoading || !onboarding ? <div className="flex-1 grid place-items-center p-6 text-center">{onboardingError || 'Carregando seu perfil...'}{onboardingError&&<button className="block mt-3 underline text-[#E8C579]" onClick={()=>supabase.auth.signOut()}>Sair da conta</button>}</div> : (!onboarding.onboarding_concluido || editingOnboarding) ? <OnboardingScreen userId={userId} initial={onboarding} onDone={data=>{setOnboarding(data);setEditingOnboarding(false);setTab('chat');}} onCancel={onboarding.onboarding_concluido?()=>setEditingOnboarding(false):null}/> : <>
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
        {tab==='perfil'&&<main className="flex-1 px-6 py-8"><button onClick={()=>setTab('chat')} className="flex items-center gap-2 text-[#E8C579] text-sm"><ArrowLeft size={16}/> Voltar ao chat</button><div className="mt-10 flex flex-col items-center"><img src={LOGO} alt="Corpo Em Movimento" className="w-28 h-28 object-contain"/><h2 className="text-xl font-semibold mt-4">Corpo Em Movimento</h2><p className="text-center text-sm text-[#B3C7B8] mt-2">Acompanhamento inteligente de hábitos.</p></div><div className="mt-10 bg-[#113729] rounded-2xl p-5 border border-[#2C513C]"><p className="font-medium">Seu histórico privado</p><p className="text-[#B1C5B6] text-sm mt-2">Seus registros são vinculados à sua conta e podem ser acessados após entrar novamente.</p></div><div className="mt-5 text-sm text-[#B1C5B6]">{session?.user?.email}</div><button className="mt-5 block rounded-xl border border-[#D8B46B] px-5 py-3 text-[#E8C579] text-sm" onClick={()=>setEditingOnboarding(true)}>Atualizar meu questionário</button><button className="mt-6 rounded-xl bg-[#D8B46B] px-5 py-3 font-semibold text-[#0A271A]" onClick={async()=>{const {error}=await supabase.auth.signOut();if(error)setBootError(error.message);}}>Sair da conta</button></main>}
        <nav className="shrink-0 border-t border-[#2C503D] flex bg-[#052219] pb-[env(safe-area-inset-bottom)]" aria-label="Menu principal">{[{id:'chat',label:'Chat',Icon:MessageCircle},{id:'evolucao',label:'Evolução',Icon:TrendingUp}].map(({id,label,Icon})=><button key={id} onClick={()=>setTab(id)} className={`flex-1 flex flex-col justify-center items-center h-16 gap-1 text-xs ${tab===id?'text-[#E8C579]':'text-[#99B2A0]'}`}><Icon size={22}/>{label}</button>)}</nav>
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
