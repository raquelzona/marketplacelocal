import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUserRole, roleHome, type UserRole } from "@/lib/auth/roles";

export async function requireRole(expectedRole: UserRole) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("nome, role, cidade, bairro, interests").eq("id", user.id).single();
  if (!profile || !isUserRole(profile.role)) redirect("/login?erro=perfil");
  if (profile.role !== expectedRole) redirect(roleHome[profile.role]);
  return { user, profile };
}

export function consumerProfileComplete(profile: { cidade: string | null; bairro: string | null; interests: string[] | null }) {
  return Boolean(profile.cidade?.trim() && profile.bairro?.trim() && profile.interests?.length);
}
