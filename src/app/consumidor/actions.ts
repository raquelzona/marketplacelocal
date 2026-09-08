"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { INTEREST_CATEGORIES, validInterests } from "@/lib/consumer/categories";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error?: string; success?: string };

function normalizeSearchValue(value: FormDataEntryValue | null, maxLength = 100) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function profileValues(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    cidade: String(formData.get("cidade") ?? "").trim(),
    bairro: String(formData.get("bairro") ?? "").trim(),
    interests: validInterests(formData.getAll("interests")),
  };
}

async function saveProfile(formData: FormData) {
  const { user } = await requireRole("consumer");
  const values = profileValues(formData);
  if (values.nome.length < 2) return { error: "Informe um nome com pelo menos 2 caracteres." };
  if (!values.cidade || !values.bairro) return { error: "Informe sua cidade e seu bairro." };
  if (!values.interests.length) return { error: "Selecione pelo menos uma categoria de interesse." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(values).eq("id", user.id);
  if (error) return { error: "Não foi possível salvar seu perfil. Tente novamente." };
  return {};
}

export async function updateProfileAction(_state: ProfileState, formData: FormData): Promise<ProfileState> {
  const result = await saveProfile(formData);
  if (result.error) return result;
  revalidatePath("/consumidor", "layout");
  return { success: "Perfil atualizado com sucesso." };
}

export async function updateLocationAction(_state: ProfileState, formData: FormData): Promise<ProfileState> {
  const { user } = await requireRole("consumer");
  const cidade = String(formData.get("cidade") ?? "").trim();
  const bairro = String(formData.get("bairro") ?? "").trim();
  if (!cidade || !bairro) return { error: "Informe sua cidade e seu bairro." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ cidade, bairro }).eq("id", user.id);
  if (error) return { error: "Não foi possível atualizar sua localização." };
  revalidatePath("/consumidor");
  return { success: "Localização atualizada." };
}

export async function finishOnboardingAction(_state: ProfileState, formData: FormData): Promise<ProfileState> {
  const result = await saveProfile(formData);
  if (result.error) return result;
  revalidatePath("/consumidor", "layout");
  redirect("/consumidor");
}

export async function searchProductsAction(formData: FormData) {
  const { user, profile } = await requireRole("consumer");
  const termo = normalizeSearchValue(formData.get("q"));
  const requestedCategory = normalizeSearchValue(formData.get("categoria"));
  const categoria = INTEREST_CATEGORIES.includes(requestedCategory as typeof INTEREST_CATEGORIES[number]) ? requestedCategory : "";
  const marca = normalizeSearchValue(formData.get("marca"), 80);
  const cidade = normalizeSearchValue(formData.get("cidade"), 100) || profile.cidade || "";
  const bairro = normalizeSearchValue(formData.get("bairro"), 100) || profile.bairro || "";
  const requestedStatus = normalizeSearchValue(formData.get("status"), 20);
  const latitude=Number(formData.get("lat")),longitude=Number(formData.get("lng"));
  const status = ["available", "low_stock", "unavailable"].includes(requestedStatus) ? requestedStatus : "";
  const params = new URLSearchParams();
  if (termo) params.set("q", termo);
  if (categoria) params.set("categoria", categoria);
  if (marca) params.set("marca", marca);
  if (cidade) params.set("cidade", cidade);
  if (bairro) params.set("bairro", bairro);
  if (status) params.set("status", status);
  if(Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180){params.set("lat",String(latitude));params.set("lng",String(longitude))}

  if (termo || categoria || marca || status || cidade || bairro) {
    const supabase = await createClient();
    const normalizedTerm = (termo || marca || categoria || (status ? `disponibilidade ${status}` : "busca local"))
      .toLocaleLowerCase("pt-BR")
      .replace(/\s+/g, " ");
    const { error } = await supabase.from("search_events").insert({
      consumer_id: user.id,
      termo: normalizedTerm,
      categoria: categoria || null,
      cidade: cidade || null,
      bairro: bairro || null,
    });
    if (error) params.set("evento", "erro");
  }
  redirect(`/consumidor/buscar${params.size ? `?${params.toString()}` : ""}`);
}
