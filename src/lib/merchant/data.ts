import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function requireMerchantCompany() {
  const { user, profile } = await requireRole("merchant");
  const supabase = await createClient();
  const { data: merchant, error } = await supabase
    .from("merchants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) throw new Error("Não foi possível carregar a empresa.");
  if (!merchant) redirect("/comerciante/onboarding");
  return { user, profile, merchant, supabase };
}
