"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type SurveyState = { error?: string };

export async function submitSurveyAction(_state: SurveyState, formData: FormData): Promise<SurveyState> {
  await requireRole("consumer");
  const questionnaireId = String(formData.get("questionnaire_id") ?? "");
  let answers: unknown;
  try { answers = JSON.parse(String(formData.get("answers") ?? "{}")); }
  catch { return { error: "As respostas não puderam ser processadas." }; }
  if (!questionnaireId || !answers || typeof answers !== "object" || Array.isArray(answers)) return { error: "Responda todas as perguntas antes de enviar." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_questionnaire", { p_questionnaire_id: questionnaireId, p_answers: answers });
  if (error) {
    if (error.message.includes("already_submitted")) return { error: "Você já respondeu esta pesquisa." };
    if (error.message.includes("incomplete") || error.message.includes("invalid_")) return { error: "Revise as respostas antes de enviar." };
    if (error.message.includes("unavailable") || error.message.includes("outside_audience")) return { error: "Esta pesquisa não está mais disponível para seu perfil." };
    return { error: "Não foi possível enviar as respostas. Tente novamente." };
  }
  redirect("/consumidor/pesquisas?enviado=1");
}
