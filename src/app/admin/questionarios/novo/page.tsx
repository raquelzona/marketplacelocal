import type { Metadata } from "next";
import Link from "next/link";
import { SurveyForm } from "@/components/admin/survey-form";
import { requireRole } from "@/lib/auth/guards";
export const metadata:Metadata={title:"Novo questionário"};
export default async function Page(){await requireRole("admin");return <main className="container-shell flex-1 py-10 sm:py-14"><div className="mx-auto max-w-3xl"><Link href="/admin/questionarios" className="text-sm font-bold text-teal-700">← Voltar</Link><p className="section-kicker mt-7">Nova pesquisa</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950 sm:text-4xl">Criar questionário</h1><section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><SurveyForm/></section></div></main>}
