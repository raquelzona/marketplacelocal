"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUserRole, roleHome } from "@/lib/auth/roles";

export type AuthState = { error?: string; success?: string };

function credentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

function friendlyError(message: string) {
  if (message.includes("Invalid login credentials")) return "Email ou senha incorretos.";
  if (message.includes("Email not confirmed")) return "Confirme seu email antes de entrar.";
  if (message.includes("User already registered")) return "Já existe uma conta com este email.";
  if (message.includes("Password should be")) return "A senha não atende aos requisitos de segurança.";
  return "Não foi possível concluir a operação. Tente novamente.";
}

export async function loginAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = credentials(formData);
  if (!email.includes("@") || !password) return { error: "Informe um email e uma senha válidos." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendlyError(error.message) };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (!profile || !isUserRole(profile.role)) {
    await supabase.auth.signOut();
    return { error: "Seu perfil ainda não está disponível. Contate o suporte." };
  }
  revalidatePath("/", "layout");
  redirect(roleHome[profile.role]);
}

export async function signupAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = credentials(formData);
  const nome = String(formData.get("nome") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const bairro = String(formData.get("bairro") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "");
  const role = requestedRole === "merchant" ? "merchant" : requestedRole === "consumer" ? "consumer" : null;

  if (nome.length < 2) return { error: "Informe seu nome completo." };
  if (!email.includes("@")) return { error: "Informe um email válido." };
  if (password.length < 8) return { error: "A senha deve ter pelo menos 8 caracteres." };
  if (!cidade || !bairro) return { error: "Informe sua cidade e seu bairro." };
  if (!role) return { error: "Escolha entre Consumidor e Comerciante." };

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback`, data: { nome, cidade, bairro, role } },
  });
  if (error) return { error: friendlyError(error.message) };
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(roleHome[role]);
  }
  return { success: "Cadastro realizado! Verifique seu email para confirmar a conta." };
}

export async function logoutAction() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/login?erro=logout");
  revalidatePath("/", "layout");
  redirect("/login");
}
