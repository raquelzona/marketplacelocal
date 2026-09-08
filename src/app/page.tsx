import Link from "next/link";
import { ArrowRightIcon, ChartIcon, MapPinIcon, StoreIcon } from "@/components/ui/icons";

const benefits = [
  { icon: MapPinIcon, eyebrow: "Para consumidores", title: "Descubra o que existe perto de você", description: "Encontre negócios locais, acompanhe novidades e faça escolhas que movimentam a sua região." },
  { icon: ChartIcon, eyebrow: "Para comerciantes", title: "Transforme sinais em boas decisões", description: "Entenda o mercado ao seu redor e encontre oportunidades para tornar seu negócio mais relevante." },
  { icon: StoreIcon, eyebrow: "Para a comunidade", title: "Fortaleça a economia local", description: "Crie conexões mais próximas entre quem vende e quem compra, gerando valor para todo o bairro." },
];

export default function Home() {
  return <>
    <section className="relative overflow-hidden border-b border-slate-200/80">
      <div className="hero-grid absolute inset-0 -z-20" />
      <div className="absolute -right-32 top-16 -z-10 size-[34rem] rounded-full bg-teal-200/30 blur-3xl" />
      <div className="absolute -left-48 bottom-0 -z-10 size-[28rem] rounded-full bg-amber-100/60 blur-3xl" />
      <div className="container-shell grid min-h-[calc(100vh-72px)] items-center gap-14 py-20 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
        <div className="max-w-3xl">
          <div className="eyebrow-pill"><span className="size-2 rounded-full bg-teal-500 shadow-[0_0_0_4px_rgba(20,184,166,.12)]" />Inteligência que aproxima</div>
          <h1 className="mt-7 text-balance text-5xl font-semibold leading-[1.03] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[4.55rem]">O comércio local, visto com <span className="text-teal-700">mais clareza.</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">Uma plataforma de inteligência de mercado que conecta consumidores e comerciantes para descobrir oportunidades e fortalecer a economia da região.</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row"><Link href="/cadastro" className="button-primary group">Fazer parte da rede <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" /></Link><Link href="#como-funciona" className="button-secondary">Conhecer a proposta</Link></div>
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-500"><span className="check-item">Conexões relevantes</span><span className="check-item">Decisões orientadas por dados</span><span className="check-item">Impacto na comunidade</span></div>
        </div>
        <div className="relative mx-auto w-full max-w-[550px] lg:mx-0">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-teal-200/50 to-transparent blur-2xl" />
          <div className="rounded-[2rem] border border-white/90 bg-white/85 p-4 shadow-[0_32px_80px_-30px_rgba(15,23,42,.3)] backdrop-blur sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">Visão da região</p><p className="mt-1 font-semibold text-slate-900">Movimento local</p></div><div className="flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700"><span className="size-1.5 rounded-full bg-teal-500" /> Em crescimento</div></div>
            <div className="mt-6 grid grid-cols-2 gap-3"><Metric label="Interesse local" value="84%" detail="alta atividade" /><Metric label="Oportunidades" value="12" detail="na sua região" /></div>
            <div className="mt-6 rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
              <div className="flex items-center justify-between"><div><p className="text-sm text-slate-400">Tendência da semana</p><p className="mt-1 text-lg font-semibold">Consumo consciente</p></div><div className="rounded-xl bg-white/10 p-2.5"><ChartIcon className="size-5 text-teal-300" /></div></div>
              <div className="mt-8 flex h-24 items-end gap-2" aria-hidden="true">{[35,48,42,59,55,72,68,85,78,94].map((height,index) => <div key={index} className="flex-1 rounded-t bg-gradient-to-t from-teal-600 to-teal-300" style={{height:`${height}%`,opacity:0.5+index*0.05}} />)}</div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-100 p-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><MapPinIcon className="size-5" /></div><div className="min-w-0"><p className="text-sm font-semibold text-slate-900">Mais perto. Mais relevante.</p><p className="truncate text-xs text-slate-500">Insights pensados para a realidade da sua região.</p></div></div>
          </div>
        </div>
      </div>
    </section>
    <section id="como-funciona" className="container-shell py-24 sm:py-28">
      <div className="max-w-2xl"><p className="section-kicker">Uma rede, múltiplos ganhos</p><h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-5xl">Informação que circula. Valor que fica.</h2><p className="mt-5 text-lg leading-8 text-slate-600">O MarketPulse Local nasce para tornar o mercado próximo mais visível, compreensível e conectado.</p></div>
      <div className="mt-14 grid gap-5 lg:grid-cols-3">{benefits.map(({icon:Icon,eyebrow,title,description}) => <article key={title} className="group rounded-3xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-slate-200/50 sm:p-8"><div className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700 transition group-hover:bg-teal-700 group-hover:text-white"><Icon className="size-6" /></div><p className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-teal-700">{eyebrow}</p><h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{title}</h3><p className="mt-3 leading-7 text-slate-600">{description}</p></article>)}</div>
    </section>
    <section className="container-shell pb-24 sm:pb-28"><div className="overflow-hidden rounded-[2rem] bg-teal-700 px-6 py-14 text-center text-white shadow-xl shadow-teal-900/10 sm:px-12 sm:py-16"><p className="text-sm font-bold uppercase tracking-[.18em] text-teal-200">Comece pelo que está perto</p><h2 className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Faça parte de uma economia local mais conectada.</h2><Link href="/cadastro" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-teal-800 transition hover:bg-teal-50">Criar minha conta <ArrowRightIcon className="size-4" /></Link></div></section>
  </>;
}

function Metric({label,value,detail}:{label:string;value:string;detail:string}) { return <div className="rounded-2xl bg-slate-50 p-4 sm:p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{value}</p><p className="mt-1 text-xs text-teal-700">{detail}</p></div>; }
