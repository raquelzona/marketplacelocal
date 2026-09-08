export type GapKind = "high_demand_low_supply" | "growing_demand_low_supply" | "low_demand_high_supply" | "balanced";
export type Confidence = "low" | "medium" | "high";

export function growthPercentage(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) * 1000) / previous) / 10;
}

export function trendLabel(current: number, previous: number) {
  const growth = growthPercentage(current, previous);
  if (previous === 0 && current > 0) return "Novo sinal";
  if (growth !== null && growth >= 10) return "Em alta";
  if (growth !== null && growth <= -10) return "Em queda";
  return "Estável";
}

export function classifyGap(demand: number, supply: number, previousDemand: number): GapKind {
  if (demand >= 5 && supply <= 2) return "high_demand_low_supply";
  if (demand > previousDemand && demand >= 5 && supply <= 3) return "growing_demand_low_supply";
  if (demand <= 3 && supply >= 8) return "low_demand_high_supply";
  return "balanced";
}

export function confidenceForVolume(volume: number): Confidence | null {
  if (volume >= 20) return "high";
  if (volume >= 10) return "medium";
  if (volume >= 3) return "low";
  return null;
}

export type GapInput = { label: string; demand: number; previousDemand: number; supply: number; kind: GapKind; dimension: "product" | "category" };
export type Recommendation = { message: string; confidence: Confidence; kind: GapKind };

export function buildRecommendation(gap: GapInput): Recommendation | null {
  const confidence = confidenceForVolume(gap.demand);
  if (!confidence || gap.kind === "balanced") return null;
  const subject = gap.dimension === "product" ? `“${gap.label}”` : `A categoria ${gap.label}`;
  if (gap.kind === "high_demand_low_supply") return { message: `${subject} tem procura relevante e apenas ${gap.supply} oferta${gap.supply === 1 ? "" : "s"} disponível${gap.supply === 1 ? "" : "is"} na região. Avalie incluir ou reforçar esse item no mix.`, confidence, kind: gap.kind };
  if (gap.kind === "growing_demand_low_supply") return { message: `${subject} está ganhando procura enquanto a oferta local permanece baixa. Considere acompanhar o estoque de perto.`, confidence, kind: gap.kind };
  return { message: `${subject} possui muita oferta em relação à procura recente. Avalie com cuidado antes de ampliar o estoque.`, confidence, kind: gap.kind };
}
