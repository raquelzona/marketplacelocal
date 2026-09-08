import type { Metadata } from "next";
import Link from "next/link";
import { StoreIcon } from "@/components/ui/icons";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata:Metadata={title:"Criar conta"};
export default function Page(){return <main className="container-shell grid flex-1 place-items-center py-16"><section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/40 sm:p-9"><div className="grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><StoreIcon className="size-6"/></div><p className="section-kicker mt-7">Faça parte da rede</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Crie sua conta</h1><p className="mt-3 leading-7 text-slate-600">Escolha seu perfil e comece a fazer parte da economia local.</p><SignupForm/><p className="mt-7 text-center text-sm text-slate-500">Já possui uma conta? <Link href="/login" className="font-semibold text-teal-700 hover:text-teal-800">Entrar</Link></p></section></main>}
