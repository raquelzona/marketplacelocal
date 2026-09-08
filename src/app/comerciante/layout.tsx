import { MerchantNav } from "@/components/merchant/merchant-nav";
import { requireRole } from "@/lib/auth/guards";

export default async function MerchantLayout({children}:{children:React.ReactNode}){await requireRole("merchant");return <div className="flex flex-1 flex-col bg-[#f7faf9]"><MerchantNav/><div className="flex flex-1 flex-col pb-16 md:pb-0">{children}</div></div>}
