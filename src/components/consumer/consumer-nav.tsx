"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardIcon, HeartIcon, HomeIcon, SearchIcon, StoreIcon } from "@/components/ui/icons";

const items = [
  { href: "/consumidor", label: "Início", icon: HomeIcon },
  { href: "/consumidor/buscar", label: "Buscar", icon: SearchIcon },
  { href: "/consumidor/lojas", label: "Lojas", icon: StoreIcon },
  { href: "/consumidor/pesquisas", label: "Pesquisas", icon: ClipboardIcon },
  { href: "/consumidor/alertas", label: "Alertas", icon: HeartIcon },
  { href: "/consumidor/perfil", label: "Perfil", icon: HeartIcon },
];

export function ConsumerNav() {
  const pathname = usePathname();
  return <nav aria-label="Área do consumidor" className="sticky top-[72px] z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl md:static">
    <div className="container-shell hidden h-16 items-center gap-1 md:flex">
      {items.map(({href,label,icon:Icon}) => { const active = href === "/consumidor" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${active ? "bg-teal-50 text-teal-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><Icon className="size-4"/>{label}</Link>; })}
    </div>
    <div className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur-xl md:hidden">
      {items.map(({href,label,icon:Icon}) => { const active = href === "/consumidor" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${active ? "text-teal-700" : "text-slate-500"}`}><Icon className="size-5"/>{label}</Link>; })}
    </div>
  </nav>;
}
