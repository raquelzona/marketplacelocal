import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardIcon, ClockIcon, MapPinIcon, SearchIcon, StoreIcon } from "@/components/ui/icons";
import { LocationForm } from "@/components/consumer/location-form";
import { consumerProfileComplete, requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { recommendationCategories, recommendationReason } from "@/lib/consumer/recommendations";

export const metadata:Metadata={title:"Área do consumidor"};

export default async function ConsumerDashboard() {
  const { user, profile } = await requireRole("consumer");
  if (!consumerProfileComplete(profile)) redirect("/consumidor/onboarding");
  const supabase = await createClient();
  const [{data:activities},{count:surveyCount}] = await Promise.all([
    supabase.from("search_events").select("id, termo, categoria, created_at").eq("consumer_id",user.id).order("created_at",{ascending:false}).limit(5),
    supabase.from("questionnaires").select("id",{count:"exact",head:true}).eq("ativo",true),
  ]);

  const firstName = profile.nome.split(" ")[0];
  const categories=recommendationCategories(profile.interests!,activities?.map(item=>item.categoria)??[],2);const recommendationResults=await Promise.all(categories.map(category=>supabase.rpc("search_public_products",{p_term:null,p_category:category,p_brand:null,p_city:profile.cidade,p_neighborhood:profile.bairro,p_status:"available",p_limit:2,p_offset:0})));const recommendations=recommendationResults.flatMap((result,index)=>(result.data??[]).map((product:Record<string,unknown>)=>({...product,reason:recommendationReason(categories[index],activities?.map(item=>item.categoria)??[])}))).slice(0,4);
  return <main className="container-shell flex-1 py-10 sm:py-14">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="section-kicker">Seu MarketPulse</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950 sm:text-5xl">Olá, {firstName}.</h1><p className="mt-3 text-slate-600">O que você quer descobrir perto de você hoje?</p></div><div className="inline-flex items-center gap-2 self-start rounded-full border border-teal-100 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800"><MapPinIcon className="size-4"/>{profile.bairro}, {profile.cidade}</div></div>

    <section className="mt-9 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-slate-950">Sua região atual</h2><p className="mt-1 text-sm text-slate-500">A busca e as recomendações usam esta localização.</p></div><MapPinIcon className="size-6 text-teal-600"/></div><LocationForm cidade={profile.cidade!} bairro={profile.bairro!}/></section>

    <section className="mt-8 grid gap-4 md:grid-cols-3">
      <Shortcut href="/consumidor/buscar" icon={SearchIcon} label="Buscar produtos" text="Encontre itens disponíveis na sua região." tone="teal"/>
      <Shortcut href="/consumidor/pesquisas" icon={ClipboardIcon} label="Responder pesquisas" text={surveyCount ? `${surveyCount} pesquisa${surveyCount > 1 ? "s" : ""} disponíve${surveyCount > 1 ? "is" : "l"}.` : "Novas pesquisas aparecerão aqui."} tone="amber"/>
      <Shortcut href="/consumidor/lojas" icon={StoreIcon} label="Explorar lojas" text="Conheça os estabelecimentos verificados." tone="slate"/>
    </section>
    <section className="mt-8"><div className="flex items-end justify-between"><div><p className="section-kicker">Para você</p><h2 className="mt-2 text-2xl font-semibold">Recomendações locais</h2></div><span className="text-xs text-slate-400">Baseadas apenas no seu perfil e histórico</span></div>{recommendations.length?<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{recommendations.map((item,index)=><Link key={`${String(item.id)}-${index}`} href={`/consumidor/lojas/${String(item.merchant_id)}`} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-bold text-teal-700">Disponível perto de você</p><h3 className="mt-2 font-semibold">{String(item.nome)}</h3><p className="mt-1 text-sm text-slate-500">{String(item.merchant_name)}</p><p className="mt-4 text-xs leading-5 text-slate-500">{String(item.reason)}</p></Link>)}</div>:<p className="mt-5 rounded-2xl border border-dashed bg-white p-6 text-sm text-slate-500">Faça algumas buscas para receber sugestões locais explicáveis.</p>}</section>

    <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="flex items-center justify-between"><div><p className="section-kicker">Histórico</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Atividades recentes</h2></div><ClockIcon className="size-6 text-slate-400"/></div>{activities?.length ? <ul className="mt-6 divide-y divide-slate-100">{activities.map(item=><li key={item.id} className="flex items-center gap-4 py-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500"><SearchIcon className="size-4"/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">Busca por “{item.termo}”</p><p className="mt-1 text-xs text-slate-500">{item.categoria || "Todas as categorias"}</p></div><time className="text-xs text-slate-400">{new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short"}).format(new Date(item.created_at))}</time></li>)}</ul> : <EmptyActivity/>}</section>
      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-teal-300">Seus interesses</p><h2 className="mt-3 text-xl font-semibold">O que importa para você</h2><div className="mt-5 flex flex-wrap gap-2">{profile.interests!.map((interest:string)=><span key={interest} className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-200">{interest}</span>)}</div><Link href="/consumidor/perfil" className="mt-7 inline-flex text-sm font-bold text-teal-300 hover:text-teal-200">Editar interesses →</Link></section>
    </div>
  </main>;
}

function Shortcut({href,icon:Icon,label,text,tone}:{href:string;icon:typeof SearchIcon;label:string;text:string;tone:"teal"|"amber"|"slate"}){const colors={teal:"bg-teal-50 text-teal-700",amber:"bg-amber-50 text-amber-700",slate:"bg-slate-100 text-slate-700"};return <Link href={href} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg"><div className={`grid size-11 place-items-center rounded-2xl ${colors[tone]}`}><Icon className="size-5"/></div><h2 className="mt-5 font-semibold text-slate-950">{label}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p><span className="mt-5 inline-block text-sm font-bold text-teal-700 transition group-hover:translate-x-1">Acessar →</span></Link>}
function EmptyActivity(){return <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-9 text-center"><div className="mx-auto grid size-11 place-items-center rounded-full bg-white text-slate-400 shadow-sm"><ClockIcon className="size-5"/></div><p className="mt-4 text-sm font-semibold text-slate-800">Sua jornada começa aqui</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Quando você fizer buscas ou participar de pesquisas, as atividades mais recentes aparecerão neste espaço.</p></div>}
