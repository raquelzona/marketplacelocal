import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { searchProductsAction } from "@/app/consumidor/actions";
import { MapPinIcon, SearchIcon, StoreIcon } from "@/components/ui/icons";
import { INTEREST_CATEGORIES } from "@/lib/consumer/categories";
import { consumerProfileComplete, requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { UseLocationButton } from "@/components/consumer/use-location-button";
import { distanceKm, formatDistance, sortByDistance } from "@/lib/geo/distance";
import { createAlertAction } from "@/app/consumidor/alertas/actions";

export const metadata: Metadata = { title: "Buscar produtos" };
const PAGE_SIZE = 12;
const statuses = ["available", "low_stock", "unavailable"] as const;

type SearchParams = { q?: string; categoria?: string; marca?: string; cidade?: string; bairro?: string; status?: string; pagina?: string; evento?: string; lat?:string; lng?:string };
type ProductResult = {
  id: string; nome: string; categoria: string; marca: string | null; quantidade: number; status: string;
  merchant_id: string; merchant_name: string; merchant_city: string; merchant_neighborhood: string;
  merchant_verification_status: string; total_count: number; distanceKm?:number|null;sponsored?:boolean;merchantPlan?:string;
};

function clean(value: string | undefined, max = 100) {
  return (value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").replace(/[^\p{L}\p{N}\s&.,'/-]/gu, "").slice(0, max);
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { profile } = await requireRole("consumer");
  if (!consumerProfileComplete(profile)) redirect("/consumidor/onboarding");
  const raw = await searchParams;
  const latitude=Number(raw.lat),longitude=Number(raw.lng);
  const consumerCoordinates=Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180?{latitude,longitude}:null;
  const filters = {
    q: clean(raw.q),
    categoria: INTEREST_CATEGORIES.includes(raw.categoria as typeof INTEREST_CATEGORIES[number]) ? raw.categoria! : "",
    marca: clean(raw.marca, 80),
    cidade: clean(raw.cidade) || profile.cidade!,
    bairro: clean(raw.bairro) || profile.bairro!,
    status: statuses.includes(raw.status as typeof statuses[number]) ? raw.status! : "",
    lat: consumerCoordinates?String(latitude):"",
    lng: consumerCoordinates?String(longitude):"",
  };
  const page = Math.max(1, Number.parseInt(raw.pagina ?? "1", 10) || 1);
  const hasSearch = Boolean(filters.q || filters.categoria || filters.marca || filters.status || raw.cidade !== undefined || raw.bairro !== undefined || consumerCoordinates);
  let products: ProductResult[] = [];
  let errorMessage = "";

  if (hasSearch) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_public_products", {
      p_term: filters.q || null,
      p_category: filters.categoria || null,
      p_brand: filters.marca || null,
      p_city: filters.cidade || null,
      p_neighborhood: filters.bairro || null,
      p_status: filters.status || null,
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    });
    if (error) errorMessage = "Não foi possível realizar a busca agora. Tente novamente.";
    else {
      products = (data ?? []) as ProductResult[];
      const merchantIds=[...new Set(products.map(item=>item.merchant_id))];
      if(merchantIds.length){
        const {data:stores}=await supabase.from("merchants").select("id,latitude,longitude,sponsored,plan").in("id",merchantIds);
        const metadata=new Map((stores??[]).map(store=>[store.id,store]));
        products=products.map(product=>{const store=metadata.get(product.merchant_id);return {...product,sponsored:store?.sponsored??false,merchantPlan:store?.plan??"basic",distanceKm:consumerCoordinates&&store?.latitude!=null&&store.longitude!=null?distanceKm(consumerCoordinates,{latitude:store.latitude,longitude:store.longitude}):null}});
        if(consumerCoordinates)products=sortByDistance(products.map(item=>({...item,distanceKm:item.distanceKm??null})));
      }
    }
  }

  const total = Number(products[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <main className="container-shell flex-1 py-10 sm:py-14">
    <div className="max-w-3xl"><p className="section-kicker">Busca local</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950 sm:text-4xl">Encontre o que precisa, perto de você.</h1><p className="mt-3 text-sm leading-6 text-slate-500">Use sua posição para ordenar por distância. Ela permanece apenas na URL desta busca e não é armazenada.</p><div className="mt-5"><UseLocationButton/></div></div>
    {raw.evento === "erro" && <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">A busca foi aberta, mas não foi possível registrar este evento no histórico.</p>}
    <form action={searchProductsAction} className="mt-8 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <input type="hidden" name="lat" value={filters.lat}/><input type="hidden" name="lng" value={filters.lng}/>
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]"><label className="relative"><span className="sr-only">Produto, categoria ou marca</span><SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"/><input name="q" defaultValue={filters.q} placeholder="Ex.: ração, papelaria, Samsung" className="consumer-input consumer-input-with-icon"/></label><SelectCategory value={filters.categoria}/><label><span className="sr-only">Marca</span><input name="marca" defaultValue={filters.marca} placeholder="Marca" className="consumer-input"/></label></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"><label><span className="sr-only">Cidade</span><input required name="cidade" defaultValue={filters.cidade} placeholder="Cidade" className="consumer-input"/></label><label><span className="sr-only">Bairro</span><input required name="bairro" defaultValue={filters.bairro} placeholder="Bairro" className="consumer-input"/></label><label><span className="sr-only">Disponibilidade</span><select name="status" defaultValue={filters.status} className="consumer-input"><option value="">Qualquer disponibilidade</option><option value="available">Disponível</option><option value="low_stock">Estoque baixo</option><option value="unavailable">Indisponível</option></select></label><button className="button-primary px-8">Buscar</button></div>
    </form>
    {filters.q&&<form action={createAlertAction} className="mt-3 flex justify-end"><input type="hidden" name="term" value={filters.q}/><button className="text-sm font-bold text-teal-700">♡ Avise-me quando “{filters.q}” estiver disponível</button></form>}

    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">{hasSearch ? `${total} resultado${total === 1 ? "" : "s"}` : "Resultados"}</h2>{hasSearch && <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPinIcon className="size-3.5"/>{filters.bairro}, {filters.cidade}</p>}</div>{hasSearch && <Link href="/consumidor/buscar" className="text-sm font-bold text-teal-700 hover:text-teal-800">Limpar filtros</Link>}</div>
      {errorMessage ? <ErrorState text={errorMessage}/> : products.length ? <><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.map(product => <ResultCard key={product.id} product={product}/>)}</div><Pagination page={page} totalPages={totalPages} filters={filters}/></> : <EmptySearch hasSearch={hasSearch}/>} 
    </section>
  </main>;
}

function SelectCategory({value}:{value:string}){return <label><span className="sr-only">Categoria</span><select name="categoria" defaultValue={value} className="consumer-input"><option value="">Todas as categorias</option>{INTEREST_CATEGORIES.map(item=><option key={item}>{item}</option>)}</select></label>}
function ResultCard({product}:{product:ProductResult}){return <article className={`rounded-3xl border bg-white p-5 shadow-sm ${product.sponsored?"border-amber-300":"border-slate-200"} ${product.status === "unavailable" ? "opacity-70" : ""}`}><div className="flex items-start justify-between gap-3"><div className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><StoreIcon className="size-5"/></div><div className="flex flex-col items-end gap-2"><Availability status={product.status}/>{product.sponsored&&<span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Patrocinado</span>}</div></div><h3 className="mt-5 text-lg font-semibold text-slate-950">{product.nome}</h3><p className="mt-1 text-sm text-slate-500">{product.marca || "Marca não informada"}</p><div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{product.categoria}</span>{product.status !== "unavailable" && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{product.quantidade} unidade(s)</span>}</div><div className="mt-5 border-t border-slate-100 pt-4"><div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-800">{product.merchant_name}</p><span title="Loja verificada" className="text-xs font-bold text-emerald-600">✓</span></div><p className="mt-1 text-xs text-slate-500">{product.merchant_neighborhood}, {product.merchant_city}{formatDistance(product.distanceKm??null)?` · ${formatDistance(product.distanceKm??null)}`:""}</p><Link href={`/consumidor/lojas/${product.merchant_id}`} className="mt-3 inline-flex text-sm font-bold text-teal-700">Ver loja →</Link></div></article>}
function Availability({status}:{status:string}){const map=status==="available"?["Disponível","bg-teal-50 text-teal-700"]:status==="low_stock"?["Estoque baixo","bg-amber-50 text-amber-700"]:["Indisponível","bg-slate-100 text-slate-600"];return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${map[1]}`}>{map[0]}</span>}
function EmptySearch({hasSearch}:{hasSearch:boolean}){return <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><SearchIcon className="size-6"/></div><h3 className="mt-4 font-semibold text-slate-900">{hasSearch?"Nenhum produto encontrado":"Sua busca começa aqui"}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{hasSearch?"Não encontramos resultados com todos esses filtros. Limpe ou ajuste um deles.":"Informe um termo, marca, categoria ou disponibilidade para consultar produtos locais."}</p>{hasSearch&&<Link href="/consumidor/buscar" className="button-secondary mt-6">Limpar filtros</Link>}</div>}
function ErrorState({text}:{text:string}){return <div className="mt-5 rounded-2xl bg-red-50 p-5"><p className="text-sm text-red-700">{text}</p><Link href="/consumidor/buscar" className="mt-3 inline-block text-sm font-bold text-red-800">Recomeçar a busca</Link></div>}
function Pagination({page,totalPages,filters}:{page:number;totalPages:number;filters:Record<string,string>}){if(totalPages<=1)return null;const url=(target:number)=>{const params=new URLSearchParams(filters);params.set("pagina",String(target));return `/consumidor/buscar?${params}`};return <nav aria-label="Paginação dos resultados" className="mt-8 flex items-center justify-center gap-4"><Link aria-disabled={page<=1} tabIndex={page<=1?-1:undefined} href={page<=1?"#":url(page-1)} className={`button-secondary ${page<=1?"pointer-events-none opacity-40":""}`}>Anterior</Link><span className="text-sm text-slate-500">Página {page} de {totalPages}</span><Link aria-disabled={page>=totalPages} tabIndex={page>=totalPages?-1:undefined} href={page>=totalPages?"#":url(page+1)} className={`button-secondary ${page>=totalPages?"pointer-events-none opacity-40":""}`}>Próxima</Link></nav>}
