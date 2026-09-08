import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardIcon, ClockIcon } from "@/components/ui/icons";
import { consumerProfileComplete, requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pesquisas" };
export default async function Page({searchParams}:{searchParams:Promise<{enviado?:string}>}) {
  const {user,profile}=await requireRole("consumer");if(!consumerProfileComplete(profile))redirect("/consumidor/onboarding");
  const supabase=await createClient();
  const [{data:surveys,error},{data:submissions}]=await Promise.all([
    supabase.from("questionnaires").select("id,titulo,descricao,ativo,estimated_minutes,target_city,target_neighborhood,target_interest,created_at").order("created_at",{ascending:false}),
    supabase.from("questionnaire_submissions").select("questionnaire_id,completed_at").eq("consumer_id",user.id).order("completed_at",{ascending:false}),
  ]);
  const answered=new Map((submissions??[]).map(item=>[item.questionnaire_id,item.completed_at]));const {enviado}=await searchParams;
  return <main className="container-shell flex-1 py-10 sm:py-14"><p className="section-kicker">Sua opinião importa</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950 sm:text-4xl">Pesquisas locais</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">Responda pesquisas rápidas e ajude a revelar necessidades reais da comunidade.</p>{enviado&&<p role="status" className="mt-7 rounded-2xl bg-teal-50 p-4 text-sm font-medium text-teal-800">Respostas enviadas com sucesso. Obrigado por participar!</p>}{error?<p className="mt-8 rounded-2xl bg-red-50 p-5 text-red-700">Não foi possível consultar as pesquisas.</p>:surveys?.length?<div className="mt-8 grid gap-5 sm:grid-cols-2">{surveys.map(survey=>{const completedAt=answered.get(survey.id);return <article key={survey.id} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div className="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-700"><ClipboardIcon className="size-5"/></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${completedAt?"bg-teal-50 text-teal-700":"bg-slate-100 text-slate-600"}`}>{completedAt?"Respondida":"Não respondida"}</span></div><h2 className="mt-5 text-xl font-semibold text-slate-950">{survey.titulo}</h2><p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{survey.descricao||"Pesquisa da comunidade local."}</p><div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500"><span className="flex items-center gap-1.5"><ClockIcon className="size-4"/>Cerca de {survey.estimated_minutes} min</span>{survey.target_neighborhood&&<span>Para {survey.target_neighborhood}</span>}{survey.target_interest&&<span>{survey.target_interest}</span>}</div>{completedAt?<p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">Respondida em {new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium"}).format(new Date(completedAt))}</p>:<Link href={`/consumidor/pesquisas/${survey.id}`} className="button-primary mt-6 self-start">Responder agora</Link>}</article>})}</div>:<Empty/>}</main>
}
function Empty(){return <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><ClipboardIcon className="size-6"/></div><h2 className="mt-4 font-semibold text-slate-900">Nenhuma pesquisa disponível agora</h2><p className="mt-2 text-sm text-slate-500">Novas pesquisas compatíveis com seu perfil aparecerão aqui.</p></div>}
