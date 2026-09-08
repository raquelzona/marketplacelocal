"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { INTEREST_CATEGORIES } from "@/lib/consumer/categories";
import { requireMerchantCompany } from "@/lib/merchant/data";
import { createClient } from "@/lib/supabase/server";

export type MerchantState = { error?: string; success?: string };

function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function companyValues(formData: FormData) {
  const cnpjRaw = String(formData.get("cnpj") ?? "").replace(/\D/g, "");
  const category = String(formData.get("categoria") ?? "").trim();
  const latitudeRaw = String(formData.get("latitude") ?? "").trim();
  const longitudeRaw = String(formData.get("longitude") ?? "").trim();
  return {
    nome_fantasia: String(formData.get("nome_fantasia") ?? "").trim(),
    razao_social: optional(formData.get("razao_social")),
    cnpj: cnpjRaw || null,
    categoria: category,
    endereco: String(formData.get("endereco") ?? "").trim(),
    cidade: String(formData.get("cidade") ?? "").trim(),
    bairro: String(formData.get("bairro") ?? "").trim(),
    latitude: latitudeRaw ? Number(latitudeRaw.replace(",", ".")) : null,
    longitude: longitudeRaw ? Number(longitudeRaw.replace(",", ".")) : null,
    horario_funcionamento: { resumo: String(formData.get("horario") ?? "").trim() },
    telefone: optional(formData.get("telefone")),
    whatsapp: optional(formData.get("whatsapp")),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    redes_sociais: {
      instagram: optional(formData.get("instagram")),
      facebook: optional(formData.get("facebook")),
      site: optional(formData.get("site")),
    },
  };
}

function validateCompany(values: ReturnType<typeof companyValues>) {
  if (values.nome_fantasia.length < 2) return "Informe o nome fantasia.";
  if (!INTEREST_CATEGORIES.includes(values.categoria as typeof INTEREST_CATEGORIES[number])) return "Escolha uma categoria válida.";
  if (!values.endereco || !values.cidade || !values.bairro) return "Preencha o endereço, cidade e bairro.";
  if (!values.horario_funcionamento.resumo) return "Informe o horário de funcionamento.";
  if (!values.email.includes("@")) return "Informe um email comercial válido.";
  if (values.cnpj && values.cnpj.length !== 14) return "O CNPJ deve conter 14 números.";
  if ((values.latitude === null) !== (values.longitude === null)) return "Informe latitude e longitude juntas.";
  if (values.latitude !== null && (!Number.isFinite(values.latitude) || Math.abs(values.latitude) > 90)) return "Latitude inválida.";
  if (values.longitude !== null && (!Number.isFinite(values.longitude) || Math.abs(values.longitude) > 180)) return "Longitude inválida.";
}

export async function createCompanyAction(_state: MerchantState, formData: FormData): Promise<MerchantState> {
  const { user } = await requireRole("merchant");
  const values = companyValues(formData);
  const validation = validateCompany(values);
  if (validation) return { error: validation };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("merchants").select("id").eq("owner_id", user.id).maybeSingle();
  if (existing) redirect("/comerciante");
  const { error } = await supabase.from("merchants").insert({ ...values, owner_id: user.id });
  if (error) return { error: error.code === "23505" ? "Este CNPJ já está cadastrado." : "Não foi possível criar a empresa." };
  revalidatePath("/comerciante", "layout");
  redirect("/comerciante");
}

export async function updateCompanyAction(_state: MerchantState, formData: FormData): Promise<MerchantState> {
  const { user, merchant } = await requireMerchantCompany();
  const values = companyValues(formData);
  const validation = validateCompany(values);
  if (validation) return { error: validation };
  const supabase = await createClient();
  const { error } = await supabase.from("merchants").update(values).eq("id", merchant.id).eq("owner_id", user.id);
  if (error) return { error: error.code === "23505" ? "Este CNPJ já está cadastrado." : "Não foi possível atualizar a empresa." };
  revalidatePath("/comerciante", "layout");
  return { success: "Dados da empresa atualizados." };
}

function productValues(formData: FormData) {
  const quantity = Number(formData.get("quantidade"));
  const status = String(formData.get("status") ?? "");
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    categoria: String(formData.get("categoria") ?? "").trim(),
    marca: optional(formData.get("marca")),
    quantidade: quantity,
    status: status === "available" || status === "low_stock" || status === "unavailable" ? status : null,
  };
}

function validateProduct(values: ReturnType<typeof productValues>) {
  if (values.nome.length < 2) return "Informe o nome do produto.";
  if (!values.categoria) return "Escolha uma categoria.";
  if (!Number.isInteger(values.quantidade) || values.quantidade < 0) return "A quantidade deve ser um número inteiro positivo.";
  if (!values.status) return "Escolha um status válido.";
}

export async function createProductAction(_state: MerchantState, formData: FormData): Promise<MerchantState> {
  const { merchant, supabase } = await requireMerchantCompany();
  const values = productValues(formData);
  const validation = validateProduct(values);
  if (validation) return { error: validation };
  const { error } = await supabase.from("products").insert({ ...values, status: values.status!, merchant_id: merchant.id });
  if (error) return { error: "Não foi possível cadastrar o produto." };
  revalidatePath("/comerciante");
  redirect("/comerciante/produtos?sucesso=criado");
}

export async function updateProductAction(_state: MerchantState, formData: FormData): Promise<MerchantState> {
  const { merchant, supabase } = await requireMerchantCompany();
  const id = String(formData.get("id") ?? "");
  const values = productValues(formData);
  const validation = validateProduct(values);
  if (validation) return { error: validation };
  const { data, error } = await supabase.from("products").update({ ...values, status: values.status! }).eq("id", id).eq("merchant_id", merchant.id).select("id").maybeSingle();
  if (error || !data) return { error: "Produto não encontrado ou sem permissão para editar." };
  revalidatePath("/comerciante");
  redirect("/comerciante/produtos?sucesso=atualizado");
}

export async function updateProductStatusAction(_state: MerchantState, formData: FormData): Promise<MerchantState> {
  const { merchant, supabase } = await requireMerchantCompany();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!(["available", "low_stock", "unavailable"] as string[]).includes(status)) return { error: "Status inválido." };
  const { data, error } = await supabase.from("products").update({ status }).eq("id", id).eq("merchant_id", merchant.id).select("id").maybeSingle();
  if (error || !data) return { error: "Não foi possível alterar a disponibilidade." };
  revalidatePath("/comerciante");
  return { success: "Disponibilidade atualizada." };
}

export async function deleteProductAction(_state: MerchantState, formData: FormData): Promise<MerchantState> {
  const { merchant, supabase } = await requireMerchantCompany();
  const id = String(formData.get("id") ?? "");
  const { data, error } = await supabase.from("products").delete().eq("id", id).eq("merchant_id", merchant.id).select("id").maybeSingle();
  if (error || !data) return { error: "Não foi possível excluir o produto." };
  revalidatePath("/comerciante");
  return { success: "Produto excluído." };
}
