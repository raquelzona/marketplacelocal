"use client";

import { useActionState, useState } from "react";
import { finishOnboardingAction, type ProfileState } from "@/app/consumidor/actions";
import { InterestPicker } from "@/components/consumer/interest-picker";
import { MapPinIcon } from "@/components/ui/icons";

export function OnboardingFlow({initialName,initialCity,initialNeighborhood,initialInterests}:{initialName:string;initialCity:string;initialNeighborhood:string;initialInterests:string[]}) {
  const [step,setStep]=useState(1);
  const [nome,setNome]=useState(initialName);
  const [cidade,setCidade]=useState(initialCity);
  const [bairro,setBairro]=useState(initialNeighborhood);
  const [interests,setInterests]=useState(initialInterests);
  const [localError,setLocalError]=useState("");
  const [state,action,pending]=useActionState(finishOnboardingAction,{} as ProfileState);

  function next(){if(step===1&&nome.trim().length<2)return setLocalError("Informe seu nome.");if(step===2&&(!cidade.trim()||!bairro.trim()))return setLocalError("Informe cidade e bairro.");if(step===3&&!interests.length)return setLocalError("Escolha ao menos uma categoria.");setLocalError("");setStep(current=>Math.min(4,current+1));}
  return <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 sm:p-10">
    <div className="flex gap-2" aria-label={`Passo ${step} de 4`}>{[1,2,3,4].map(item=><span key={item} className={`h-1.5 flex-1 rounded-full ${item<=step ? "bg-teal-600" : "bg-slate-200"}`}/>)}</div>
    <p className="section-kicker mt-8">Passo {step} de 4</p>
    <form action={action} className="mt-3">
      <input type="hidden" name="nome" value={nome}/><input type="hidden" name="cidade" value={cidade}/><input type="hidden" name="bairro" value={bairro}/>{interests.map(item=><input key={item} type="hidden" name="interests" value={item}/>)}
      {step===1&&<Step title="Como podemos chamar você?" text="Seu nome será usado para personalizar a experiência."><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Nome</span><input autoFocus value={nome} onChange={e=>setNome(e.target.value)} className="consumer-input" placeholder="Seu nome completo"/></label></Step>}
      {step===2&&<Step title="Onde você está?" text="Usamos sua região para mostrar opções realmente próximas."><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-semibold text-slate-700">Cidade</span><input autoFocus value={cidade} onChange={e=>setCidade(e.target.value)} className="consumer-input" placeholder="Sua cidade"/></label><label><span className="mb-2 block text-sm font-semibold text-slate-700">Bairro</span><input value={bairro} onChange={e=>setBairro(e.target.value)} className="consumer-input" placeholder="Seu bairro"/></label></div></Step>}
      {step===3&&<Step title="O que você procura por perto?" text="Escolha as categorias que combinam com seus interesses."><InterestPicker selected={interests} onChange={setInterests}/></Step>}
      {step===4&&<Step title="Tudo pronto para começar." text="Confira suas preferências antes de entrar no MarketPulse Local."><div className="space-y-4 rounded-2xl bg-slate-50 p-5"><Summary label="Nome" value={nome}/><Summary label="Região" value={`${bairro}, ${cidade}`}/><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Interesses</p><div className="mt-2 flex flex-wrap gap-2">{interests.map(item=><span key={item} className="rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-800">{item}</span>)}</div></div></div></Step>}
      {(localError||state.error)&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{localError||state.error}</p>}
      <div className="mt-8 flex items-center justify-between gap-3"><button type="button" onClick={()=>{setLocalError("");setStep(current=>Math.max(1,current-1))}} disabled={step===1||pending} className="button-secondary disabled:invisible">Voltar</button>{step<4?<button type="button" onClick={next} className="button-primary">Continuar</button>:<button disabled={pending} className="button-primary disabled:opacity-60">{pending?"Salvando...":"Confirmar e entrar"}</button>}</div>
    </form>
  </div>;
}

function Step({title,text,children}:{title:string;text:string;children:React.ReactNode}){return <div><h1 className="text-3xl font-semibold tracking-[-.03em] text-slate-950 sm:text-4xl">{title}</h1><p className="mt-3 leading-7 text-slate-600">{text}</p><div className="mt-7">{children}</div></div>}
function Summary({label,value}:{label:string;value:string}){return <div className="flex items-center gap-3"><MapPinIcon className="size-5 text-teal-600"/><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div></div>}
