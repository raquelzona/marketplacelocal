"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/auth/actions";
import { ChartIcon, HomeIcon, StoreIcon } from "@/components/ui/icons";

const items=[
  {href:"/comerciante",label:"Visão geral",icon:HomeIcon,exact:true},
  {href:"/comerciante/produtos",label:"Produtos",icon:StoreIcon,exact:true},
  {href:"/comerciante/produtos/novo",label:"Cadastrar produto",icon:ChartIcon},
  {href:"/comerciante/empresa",label:"Empresa",icon:StoreIcon},
  {href:"/comerciante/relatorio",label:"Resumo semanal",icon:ChartIcon},
];

export function MerchantNav(){const pathname=usePathname();return <nav aria-label="Área do comerciante" className="sticky top-[72px] z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl"><div className="container-shell hidden h-16 items-center gap-1 md:flex">{items.map(({href,label,icon:Icon,exact})=>{const active=exact?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} aria-current={active?"page":undefined} className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${active?"bg-teal-50 text-teal-800":"text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><Icon className="size-4"/>{label}</Link>})}<form action={logoutAction} className="ml-auto"><button className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-700">Sair</button></form></div><div className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur-xl md:hidden">{items.map(({href,label,icon:Icon,exact})=>{const active=exact?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-center text-[10px] font-semibold ${active?"text-teal-700":"text-slate-500"}`}><Icon className="size-5"/>{label}</Link>})}<form action={logoutAction}><button className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[10px] font-semibold text-slate-500"><span className="text-lg">↪</span>Sair</button></form></div></nav>}
