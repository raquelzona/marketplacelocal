import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MarketPulse Local", template: "%s | MarketPulse Local" },
  description: "Inteligência de mercado para fortalecer o comércio local.",
};

// O header depende dos cookies da sessão e nunca deve reutilizar HTML de outro usuário.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full scroll-smooth antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900"><div className="flex min-h-screen flex-col"><SiteHeader/><div className="flex flex-1 flex-col">{children}</div><SiteFooter/></div></body>
    </html>
  );
}
