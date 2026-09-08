import type { Metadata } from "next";
import Link from "next/link";
import { UserIcon } from "@/components/ui/icons";
import { LoginForm } from "@/components/auth/login-form";

export const metadata:Metadata={title:"Entrar"};
export default async function Page({searchParams}:{searchParams:Promise<{erro?:string}>}) {
  const { erro } = await searchParams;
  return <main className="container-shell grid flex-1 place-items-center py-16"><section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/40 sm:p-9"><div className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><UserIcon className="size-6"/></div><p className="section-kicker mt-7">Bem-vindo de volta</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Acesse sua conta</h1><p className="mt-3 leading-7 text-slate-600">Entre para acessar sua área personalizada no MarketPulse Local.</p>{erro && <p className="mt-5 rounded-xl bg-red-50 p-3.5 text-sm text-red-700">{erro === "confirmacao" ? "Não foi possível confirmar seu email. Solicite um novo link." : erro === "logout" ? "Não foi possível encerrar a sessão. Tente novamente." : "Não foi possível carregar seu perfil."}</p>}<LoginForm/><p className="mt-7 text-center text-sm text-slate-500">Ainda não tem uma conta? <Link href="/cadastro" className="font-semibold text-teal-700 hover:text-teal-800">Cadastre-se</Link></p></section></main>;
}
