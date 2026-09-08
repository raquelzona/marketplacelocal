import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/merchant/product-form";
import { requireMerchantCompany } from "@/lib/merchant/data";

export const metadata:Metadata={title:"Editar produto"};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const {merchant,supabase}=await requireMerchantCompany();const {data:product}=await supabase.from("products").select("id,nome,categoria,marca,quantidade,status").eq("id",id).eq("merchant_id",merchant.id).maybeSingle();if(!product)notFound();return <main className="container-shell flex-1 py-10 sm:py-14"><div className="mx-auto max-w-2xl"><Link href="/comerciante/produtos" className="text-sm font-bold text-teal-700">← Voltar ao catálogo</Link><p className="section-kicker mt-7">Catálogo</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950 sm:text-4xl">Editar produto</h1><p className="mt-3 text-slate-600">Atualize informações, quantidade ou disponibilidade.</p><section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><ProductForm product={product}/></section></div></main>}
