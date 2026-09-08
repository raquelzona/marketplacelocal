"use client";

import { useActionState } from "react";
import { loginAction, type AuthState } from "@/app/auth/actions";

const initialState: AuthState = {};
export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return <form action={action} className="mt-8 space-y-5">
    <Field label="Email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" />
    <Field label="Senha" name="password" type="password" autoComplete="current-password" placeholder="Sua senha" />
    {state.error && <Message kind="error">{state.error}</Message>}
    <button disabled={pending} className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Entrando..." : "Entrar"}</button>
  </form>;
}

type FieldProps={label:string;name:string;type:string;autoComplete:string;placeholder:string};
export function Field({label,...props}:FieldProps){return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><input {...props} required className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"/></label>}
export function Message({kind,children}:{kind:"error"|"success";children:React.ReactNode}){return <p role="status" className={`rounded-xl p-3.5 text-sm ${kind === "error" ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-800"}`}>{children}</p>}
