import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUserRole, roleHome } from "@/lib/auth/roles";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?erro=confirmacao", request.url));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/login?erro=confirmacao", request.url));

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (!profile || !isUserRole(profile.role)) return NextResponse.redirect(new URL("/login?erro=perfil", request.url));
  return NextResponse.redirect(new URL(roleHome[profile.role], request.url));
}
