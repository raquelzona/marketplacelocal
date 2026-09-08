import { notFound } from "next/navigation";
import { SurveyFlow, type SurveyQuestion } from "@/components/questionnaires/survey-flow";
import { normalizeAttribution } from "@/lib/campaigns/attribution";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  questionnaire_id: string;
  city: string | null;
  neighborhood: string | null;
  questions: SurveyQuestion[];
};
type Query = {
  concluida?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  source?: string;
  medium?: string;
  campaign?: string;
};

export default async function Page({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Query>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const utm = normalizeAttribution(query);
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_campaign", { p_slug: slug });
  const campaign = data as Campaign | null;
  if (!campaign) notFound();

  if (query.concluida) {
    return <main className="container-shell grid flex-1 place-items-center py-16"><section className="max-w-xl rounded-3xl border bg-white p-9 text-center shadow-sm"><p className="section-kicker">Participação concluída</p><h1 className="mt-3 text-3xl font-semibold">Obrigado por compartilhar sua intenção.</h1><p className="mt-3 text-slate-600">Sua resposta será usada apenas de forma agregada.</p></section></main>;
  }

  await supabase.rpc("register_campaign_view", {
    p_slug: slug,
    p_utm_source: utm.source || null,
    p_utm_medium: utm.medium || null,
    p_utm_campaign: utm.campaign || null,
  });

  return <main className="container-shell flex-1 py-12"><div className="mx-auto max-w-2xl"><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">Pesquisa pública</span><h1 className="mt-5 text-3xl font-semibold sm:text-4xl">{campaign.title}</h1>{campaign.description && <p className="mt-3 leading-7 text-slate-600">{campaign.description}</p>}<p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">As respostas são analisadas de forma agregada. Não solicitamos nome, email ou localização precisa; cidade e bairro são opcionais.</p><div className="mt-8"><SurveyFlow questionnaireId={campaign.questionnaire_id} questions={campaign.questions} campaignSlug={slug} defaultCity={campaign.city ?? ""} defaultNeighborhood={campaign.neighborhood ?? ""} utmSource={utm.source} utmMedium={utm.medium} utmCampaign={utm.campaign}/></div></div></main>;
}
