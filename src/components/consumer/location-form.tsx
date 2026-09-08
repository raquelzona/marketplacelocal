"use client";

import { useActionState } from "react";
import { updateLocationAction, type ProfileState } from "@/app/consumidor/actions";

export function LocationForm({cidade,bairro}:{cidade:string;bairro:string}) {
  const [state, action, pending] = useActionState(updateLocationAction, {} as ProfileState);
  return <form action={action} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
    <label><span className="sr-only">Cidade</span><input required name="cidade" defaultValue={cidade} placeholder="Cidade" className="consumer-input"/></label>
    <label><span className="sr-only">Bairro</span><input required name="bairro" defaultValue={bairro} placeholder="Bairro" className="consumer-input"/></label>
    <button disabled={pending} className="rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-60">{pending ? "Salvando..." : "Atualizar"}</button>
    {(state.error || state.success) && <p role="status" className={`text-sm sm:col-span-3 ${state.error ? "text-red-600" : "text-teal-700"}`}>{state.error ?? state.success}</p>}
  </form>;
}
