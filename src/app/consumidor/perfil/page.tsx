import type { Metadata } from "next";
import { ProfileForm } from "@/components/consumer/profile-form";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata:Metadata={title:"Meu perfil"};
export default async function Page(){const {user}=await requireRole("consumer");const supabase=await createClient();const {data:profile,error}=await supabase.from("profiles").select("nome,email,cidade,bairro,interests").eq("id",user.id).single();if(error||!profile)return <main className="container-shell flex-1 py-12"><p className="rounded-2xl bg-red-50 p-5 text-red-700">Não foi possível carregar seu perfil.</p></main>;return <main className="container-shell flex-1 py-10 sm:py-14"><div className="max-w-3xl"><p className="section-kicker">Preferências</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950 sm:text-4xl">Seu perfil</h1><p className="mt-3 text-slate-600">Mantenha sua região e seus interesses atualizados.</p><section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><ProfileForm profile={profile}/></section></div></main>}
