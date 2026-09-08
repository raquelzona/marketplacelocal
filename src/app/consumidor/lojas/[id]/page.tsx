import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MapPinIcon, PhoneIcon, SearchIcon, StoreIcon } from "@/components/ui/icons";
import { INTEREST_CATEGORIES } from "@/lib/consumer/categories";
import { consumerProfileComplete, requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Detalhes da loja" };
const statuses = ["available", "low_stock", "unavailable"] as const;
type Params = { q?: string; categoria?: string; status?: string };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { profile } = await requireRole("consumer");
  if (!consumerProfileComplete(profile)) redirect("/consumidor/onboarding");
  const [{ id }, filters] = await Promise.all([params, searchParams]);
  const q = clean(filters.q);
  const category = INTEREST_CATEGORIES.includes(filters.categoria as typeof INTEREST_CATEGORIES[number]) ? filters.categoria! : "";
  const status = statuses.includes(filters.status as typeof statuses[number]) ? filters.status! : "";
  const supabase = await createClient();
  const { data: store, error } = await supabase.from("merchants").select("id,nome_fantasia,razao_social,endereco,cidade,bairro,categoria,horario_funcionamento,telefone,whatsapp,email,redes_sociais,verification_status").eq("id", id).single();
  if (error || !store) notFound();

  let productQuery = supabase.from("products").select("id,nome,categoria,marca,quantidade,status").eq("merchant_id", id).order("nome").limit(50);
  if (q) productQuery = productQuery.or(`nome.ilike.%${q}%,marca.ilike.%${q}%`);
  if (category) productQuery = productQuery.eq("categoria", category);
  if (status) productQuery = productQuery.eq("status", status);
  const { data: products, error: productsError } = await productQuery;
  const hasFilters = Boolean(q || category || status);

  return <main className="container-shell flex-1 py-10 sm:py-14">
    <Link href="/consumidor/lojas" className="text-sm font-bold text-teal-700">← Voltar para lojas</Link>
    <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-950 p-7 text-white sm:p-10"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start"><div><div className="grid size-14 place-items-center rounded-2xl bg-teal-500/20 text-teal-300"><StoreIcon className="size-7"/></div><p className="mt-6 text-sm font-semibold text-teal-300">{store.categoria}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">{store.nome_fantasia}</h1>{store.razao_social&&<p className="mt-2 text-sm text-slate-400">{store.razao_social}</p>}</div><span className="self-start rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-300">Loja verificada</span></div></div>
      <div className="grid gap-6 p-7 sm:grid-cols-2 sm:p-10"><Info icon={MapPinIcon} label="Endereço" value={`${store.endereco} · ${store.bairro}, ${store.cidade}`}/><Info icon={PhoneIcon} label="Contato" value={store.whatsapp||store.telefone||store.email}/><Info icon={StoreIcon} label="Email" value={store.email}/><Info icon={StoreIcon} label="Funcionamento" value={formatHours(store.horario_funcionamento)}/></div>
    </section>

    <section className="mt-10"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">Catálogo público</p><h2 className="mt-2 text-2xl font-semibold text-slate-950">Produtos da loja</h2></div>{hasFilters&&<Link href={`/consumidor/lojas/${id}`} className="text-sm font-bold text-teal-700">Limpar filtros</Link>}</div>
      <form className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px_180px_auto]"><label className="relative"><SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"/><span className="sr-only">Buscar no catálogo</span><input name="q" defaultValue={q} placeholder="Buscar produto ou marca" className="consumer-input consumer-input-with-icon"/></label><label><span className="sr-only">Categoria</span><select name="categoria" defaultValue={category} className="consumer-input"><option value="">Todas as categorias</option>{INTEREST_CATEGORIES.map(item=><option key={item}>{item}</option>)}</select></label><label><span className="sr-only">Disponibilidade</span><select name="status" defaultValue={status} className="consumer-input"><option value="">Todos os status</option><option value="available">Disponível</option><option value="low_stock">Estoque baixo</option><option value="unavailable">Indisponível</option></select></label><button className="button-secondary">Filtrar</button></form>
      {productsError ? <p className="mt-5 rounded-2xl bg-red-50 p-5 text-sm text-red-700">Não foi possível carregar o catálogo.</p> : products?.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.map(product=><article key={product.id} className={`rounded-2xl border border-slate-200 bg-white p-5 ${product.status==="unavailable"?"opacity-70":""}`}><ProductStatus status={product.status}/><h3 className="mt-3 font-semibold text-slate-950">{product.nome}</h3><p className="mt-1 text-sm text-slate-500">{product.marca||"Marca não informada"}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500"><span className="rounded-full bg-slate-100 px-2.5 py-1">{product.categoria}</span>{product.status!=="unavailable"&&<span className="rounded-full bg-slate-100 px-2.5 py-1">{product.quantidade} unidade(s)</span>}</div></article>)}</div> : <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{hasFilters?"Nenhum produto corresponde aos filtros selecionados.":"Esta loja ainda não publicou produtos."}</div>}
    </section>
  </main>;
}

function clean(value:string|undefined){return (value??"").normalize("NFKC").trim().replace(/\s+/g," ").replace(/[^\p{L}\p{N}\s-]/gu,"").slice(0,80)}
function Info({icon:Icon,label,value}:{icon:typeof StoreIcon;label:string;value:string|null}){return <div className="flex gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><Icon className="size-5"/></div><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm leading-6 text-slate-700">{value||"Não informado"}</p></div></div>}
function ProductStatus({status}:{status:string}){const map=status==="available"?["Disponível","text-teal-700"]:status==="low_stock"?["Estoque baixo","text-amber-700"]:["Indisponível","text-slate-500"];return <span className={`text-xs font-bold ${map[1]}`}>{map[0]}</span>}
function formatHours(value:unknown){if(!value||typeof value!=="object"||Array.isArray(value))return "Consulte o estabelecimento";const record=value as Record<string,unknown>;if(typeof record.resumo==="string")return record.resumo;if(!Object.keys(record).length)return "Consulte o estabelecimento";return Object.entries(record).map(([day,hours])=>`${day}: ${String(hours)}`).join(" · ")}
