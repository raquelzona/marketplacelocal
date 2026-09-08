import { ConsumerNav } from "@/components/consumer/consumer-nav";
import { requireRole } from "@/lib/auth/guards";

export default async function ConsumerLayout({children}:{children:React.ReactNode}) {
  await requireRole("consumer");
  return <div className="flex flex-1 flex-col bg-[#f7faf9]"><ConsumerNav/><div className="flex flex-1 flex-col pb-16 md:pb-0">{children}</div></div>;
}
