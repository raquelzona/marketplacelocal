import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/merchant/product-form";
import { requireMerchantCompany } from "@/lib/merchant/data";

export const metadata:Metadata={title:"Cadastrar produto"};
export default async function Page(){await requireMerchantCompany();return <main className="container-shell flex-1 py-10 sm:py-14"><div className="mx-auto max-w-2xl"><Link href="/comerciante/produtos" className="text-sm font-bold text-teal-700">← Voltar ao catálogo</Link><p className="section-kicker mt-7">Novo item</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950 sm:text-4xl">Cadastrar produto</h1><p className="mt-3 text-slate-600">Informe os dados e a disponibilidade atual do produto.</p><section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><ProductForm/></section></div></main>}
