import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { moveQuestionAction } from "@/app/admin/questionarios/actions";
import { QuestionEditor } from "@/components/admin/question-editor";
import { SurveyForm } from "@/components/admin/survey-form";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editar questionário" };
export default async function Page({params}:{params:Promise<{id:string}>}){
  await requireRole("admin");
  const {id}=await params;
  const supabase=await createClient();
  const [{data:survey},{data:questions},{count:submissionCount}]=await Promise.all([
    supabase.from("questionnaires").select("id,titulo,descricao,ativo,estimated_minutes,target_city,target_neighborhood,target_interest").eq("id",id).single(),
    supabase.from("questionnaire_questions").select("id,pergunta,tipo,opcoes,ordem").eq("questionnaire_id",id).order("ordem"),
    supabase.from("questionnaire_submissions").select("id",{count:"exact",head:true}).eq("questionnaire_id",id),
  ]);
  if(!survey)notFound();
  const locked=Boolean(submissionCount);
  return <main className="container-shell flex-1 py-10 sm:py-14"><div className="mx-auto max-w-4xl"><Link href="/admin/questionarios" className="text-sm font-bold text-teal-700">← Voltar aos questionários</Link><p className="section-kicker mt-7">Configuração</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950 sm:text-4xl">Editar questionário</h1>{locked&&<p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Este questionário já recebeu respostas. Título, descrição, segmentação e status ainda podem ser alterados, mas as perguntas foram preservadas para manter o histórico consistente.</p>}<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><SurveyForm survey={survey}/></section><section className="mt-10"><div><p className="section-kicker">Conteúdo</p><h2 className="mt-2 text-2xl font-semibold text-slate-950">Perguntas</h2><p className="mt-2 text-sm text-slate-500">Use as setas para ajustar a ordem antes da primeira resposta.</p></div><div className="mt-6 space-y-5">{questions?.map((question,index)=><div key={question.id}><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pergunta {index+1}</span>{!locked&&<div className="flex gap-2"><MoveButton id={question.id} questionnaireId={id} direction={-1} disabled={index===0} label="↑"/><MoveButton id={question.id} questionnaireId={id} direction={1} disabled={index===questions.length-1} label="↓"/></div>}</div><QuestionEditor questionnaireId={id} question={question} locked={locked}/></div>)}</div><div className="mt-8"><h3 className="mb-3 font-semibold text-slate-950">Adicionar pergunta</h3><QuestionEditor questionnaireId={id} locked={locked}/></div></section></div></main>
}
function MoveButton({id,questionnaireId,direction,disabled,label}:{id:string;questionnaireId:string;direction:number;disabled:boolean;label:string}){return <form action={moveQuestionAction}><input type="hidden" name="id" value={id}/><input type="hidden" name="questionnaire_id" value={questionnaireId}/><input type="hidden" name="direction" value={direction}/><button disabled={disabled} title={direction<0?"Mover para cima":"Mover para baixo"} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:border-teal-300 disabled:opacity-30">{label}</button></form>}
