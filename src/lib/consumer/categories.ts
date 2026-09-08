export const INTEREST_CATEGORIES = [
  "Mercados e mercearias",
  "Eletrônicos",
  "Papelaria",
  "Farmácia",
  "Pet shop",
  "Roupas",
  "Informática",
  "Materiais de construção",
  "Cosméticos e perfumaria",
  "Autopeças e acessórios",
] as const;

export function validInterests(values: FormDataEntryValue[]) {
  const allowed = new Set<string>(INTEREST_CATEGORIES);
  return [...new Set(values.map(String).filter((value) => allowed.has(value)))];
}
