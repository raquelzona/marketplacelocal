import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { isUserRole, roleHome } from "@/lib/auth/roles";

const protectedRoles = { "/consumidor": "consumer", "/comerciante": "merchant", "/admin": "admin", "/administrador": "admin" } as const;

function roleForPath(path: string) {
  return Object.entries(protectedRoles).find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1];
}

export async function proxy(request: NextRequest) {
  try {
    const { response, supabase, user } = await updateSession(request);
    const path = request.nextUrl.pathname;
    const expectedRole = roleForPath(path);

    if (!user) {
      if (expectedRole) return NextResponse.redirect(new URL("/login", request.url));
      return response;
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !isUserRole(profile.role)) return NextResponse.redirect(new URL("/login?erro=perfil", request.url));
    if (path.startsWith("/administrador")) return NextResponse.redirect(new URL(path.replace("/administrador", "/admin"), request.url));
    if (path === "/login" || path === "/cadastro" || (expectedRole && expectedRole !== profile.role)) {
      return NextResponse.redirect(new URL(roleHome[profile.role], request.url));
    }
    return response;
  } catch {
    if (roleForPath(request.nextUrl.pathname)) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }
}

export const config = { matcher: ["/login", "/cadastro", "/consumidor/:path*", "/comerciante/:path*", "/admin/:path*", "/administrador/:path*"] };
