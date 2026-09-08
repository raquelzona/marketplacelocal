"use client";

import { useActionState } from "react";
import { signupAction, type AuthState } from "@/app/auth/actions";
import { Field, Message } from "@/components/auth/login-form";

const initialState: AuthState = {};
export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initialState);
  return <form action={action} className="mt-8 space-y-5">
    <Field label="Nome completo" name="nome" type="text" autoComplete="name" placeholder="Seu nome" />
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Cidade" name="cidade" type="text" autoComplete="address-level2" placeholder="Sua cidade"/><Field label="Bairro" name="bairro" type="text" autoComplete="address-level3" placeholder="Seu bairro"/></div>
    <fieldset><legend className="mb-2 text-sm font-semibold text-slate-700">Como você usará a plataforma?</legend><div className="grid gap-3 sm:grid-cols-2"><Role value="consumer" title="Consumidor" description="Descobrir negócios locais"/><Role value="merchant" title="Comerciante" description="Desenvolver meu negócio"/></div></fieldset>
    <Field label="Email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" />
    <Field label="Senha" name="password" type="password" autoComplete="new-password" placeholder="Mínimo de 8 caracteres" />
    {state.error && <Message kind="error">{state.error}</Message>}
    {state.success && <Message kind="success">{state.success}</Message>}
    <button disabled={pending || Boolean(state.success)} className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Criando conta..." : "Criar minha conta"}</button>
  </form>;
}

function Role({value,title,description}:{value:string;title:string;description:string}){return <label className="cursor-pointer"><input required className="peer sr-only" type="radio" name="role" value={value}/><span className="block rounded-2xl border border-slate-200 p-4 transition peer-checked:border-teal-600 peer-checked:bg-teal-50 peer-checked:ring-2 peer-checked:ring-teal-600/10"><span className="block text-sm font-semibold text-slate-900">{title}</span><span className="mt-1 block text-xs text-slate-500">{description}</span></span></label>}
