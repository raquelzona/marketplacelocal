import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/consumer/onboarding-flow";
import { consumerProfileComplete, requireRole } from "@/lib/auth/guards";

export const metadata:Metadata={title:"Primeiros passos"};
export default async function Page(){const {profile}=await requireRole("consumer");if(consumerProfileComplete(profile))redirect("/consumidor");return <main className="container-shell grid flex-1 place-items-center py-10 sm:py-16"><OnboardingFlow initialName={profile.nome} initialCity={profile.cidade??""} initialNeighborhood={profile.bairro??""} initialInterests={profile.interests??[]}/></main>}
