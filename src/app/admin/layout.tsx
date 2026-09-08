import {AdminNav} from "@/components/admin/admin-nav";import {requireRole} from "@/lib/auth/guards";
export default async function AdminLayout({children}:{children:React.ReactNode}){await requireRole('admin');return <div className="flex flex-1 flex-col bg-[#f7faf9]"><AdminNav/>{children}</div>}
