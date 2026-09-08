"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { normalizeAlertTerm } from "@/lib/alerts/matching";
import { createClient } from "@/lib/supabase/server";

export async function createAlertAction(formData: FormData) {
  const { user, profile } = await requireRole("consumer");
  const term = normalizeAlertTerm(String(formData.get("term") ?? ""));
  const productId = String(formData.get("product_id") ?? "") || null;
  if (!productId && term.length < 2) redirect("/consumidor/alertas?erro=invalido");

  const supabase = await createClient();
  const { error } = await supabase.from("product_alerts").insert({
    consumer_id: user.id,
    search_term: productId ? null : term,
    product_id: productId,
    cidade: profile.cidade ?? "",
    bairro: profile.bairro ?? "",
  });

  if (error) redirect("/consumidor/alertas?erro=salvar");
  revalidatePath("/consumidor/alertas");
  redirect("/consumidor/alertas?criado=1");
}

export async function deleteAlertAction(formData: FormData) {
  const { user } = await requireRole("consumer");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("product_alerts").delete().eq("id", id).eq("consumer_id", user.id);
  revalidatePath("/consumidor/alertas");
}
