import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { isUserRole, roleHome, roleLabel } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/logo";

export async function SiteHeader(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=user?await supabase.from("profiles").select("nome,role").eq("id",user.id).maybeSingle():{data:null};
  const authProfile=user&&profile&&isUserRole(profile.role)?{nome:profile.nome,role:profile.role}:null;
  return <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl"><div className="container-shell flex h-[72px] items-center justify-between gap-5"><Logo/><nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Navegação principal"><Link className="transition hover:text-teal-700" href="/#como-funciona">Como funciona</Link>{authProfile?<Link className="transition hover:text-teal-700" href={roleHome[authProfile.role]}>Minha área</Link>:<><Link className="transition hover:text-teal-700" href="/consumidor">Consumidor</Link><Link className="transition hover:text-teal-700" href="/comerciante">Comerciante</Link></>}</nav>{authProfile?<div className="flex min-w-0 items-center gap-2 sm:gap-3"><Link href={roleHome[authProfile.role]} className="hidden min-w-0 text-right sm:block"><span className="block max-w-36 truncate text-sm font-semibold text-slate-800">{authProfile.nome}</span><span className="block text-xs text-slate-500">{roleLabel[authProfile.role]}</span></Link><form action={logoutAction}><button type="submit" className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">Sair</button></form></div>:<div className="flex items-center gap-2 sm:gap-3"><Link href="/login" className="hidden px-2 py-2 text-sm font-semibold text-slate-700 transition hover:text-teal-700 sm:block">Entrar</Link><Link href="/cadastro" className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 sm:px-5">Criar conta</Link></div>}</div></header>
}
