import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompanyForm } from "@/components/merchant/company-form";
import { StoreIcon } from "@/components/ui/icons";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata:Metadata={title:"Configure sua empresa"};
export default async function Page(){const {user}=await requireRole("merchant");const supabase=await createClient();const {data}=await supabase.from("merchants").select("id").eq("owner_id",user.id).maybeSingle();if(data)redirect("/comerciante");return <main className="container-shell flex-1 py-10 sm:py-14"><div className="mx-auto max-w-3xl"><div className="grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-700"><StoreIcon className="size-7"/></div><p className="section-kicker mt-7">Primeiros passos</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950 sm:text-4xl">Apresente sua empresa à comunidade.</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">Preencha os dados essenciais. Sua loja começará com verificação pendente e ficará pública após aprovação.</p><section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><CompanyForm/></section></div></main>}
