import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { createAlertAction, deleteAlertAction } from "./actions";

type Match = {
  created_at: string;
  product: { nome?: string } | { nome?: string }[];
  merchant: { nome_fantasia?: string } | { nome_fantasia?: string }[];
};

export default async function Page({ searchParams }: {
  searchParams: Promise<{ criado?: string; erro?: string }>;
}) {
  const { criado, erro: actionError } = await searchParams;
  const { user } = await requireRole("consumer");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_alerts")
    .select("id,search_term,product_id,cidade,bairro,active,created_at,product:products(nome),notifications:alert_notifications(created_at,product:products(nome),merchant:merchants(nome_fantasia))")
    .eq("consumer_id", user.id)
    .order("created_at", { ascending: false });

  return <main className="container-shell flex-1 py-10">
    <p className="section-kicker">Acompanhamento local</p>
    <h1 className="mt-3 text-3xl font-semibold">Meus alertas</h1>
    <p className="mt-2 text-slate-600">Acompanhe produtos ou termos. Os avisos ficam somente dentro do MarketPulse.</p>
    {criado && <p role="status" className="mt-6 rounded-xl bg-teal-50 p-4 text-sm text-teal-800">Alerta criado. Mostraremos aqui quando surgir uma opção disponível.</p>}
    {actionError && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">Não foi possível criar o alerta. Revise o termo e tente novamente.</p>}
    <form action={createAlertAction} className="mt-7 flex max-w-xl gap-3 rounded-3xl border bg-white p-4">
      <input name="term" required minLength={2} maxLength={100} placeholder="Ex.: Mouse Gamer RGB" className="consumer-input"/>
      <button className="button-primary shrink-0">Criar alerta</button>
    </form>
    {error ? <p className="mt-6 text-red-700">Não foi possível carregar os alertas.</p> : data?.length ? <div className="mt-7 grid gap-4 md:grid-cols-2">{data.map(alert => {
      const product = relation(alert.product);
      const matches = (alert.notifications ?? []) as unknown as Match[];
      return <article key={alert.id} className="rounded-3xl border bg-white p-6"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase text-teal-700">{matches.length ? "Encontrado" : "Acompanhando"}</p><h2 className="mt-2 font-semibold">{alert.search_term || product?.nome || "Produto"}</h2><p className="mt-1 text-xs text-slate-500">{alert.bairro}, {alert.cidade}</p></div><form action={deleteAlertAction}><input type="hidden" name="id" value={alert.id}/><button className="text-sm font-bold text-red-600">Excluir</button></form></div>{matches.length ? <ul className="mt-4 space-y-2">{matches.map((match, index) => <li key={index} className="rounded-xl bg-teal-50 p-3 text-sm"><strong>{relation(match.product)?.nome}</strong><span className="block text-xs text-slate-500">{relation(match.merchant)?.nome_fantasia} · {new Date(match.created_at).toLocaleDateString("pt-BR")}</span></li>)}</ul> : <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Avisaremos aqui quando houver uma opção disponível.</p>}</article>;
    })}</div> : <p className="mt-7 rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500">Você ainda não criou alertas.</p>}
  </main>;
}

function relation<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}
