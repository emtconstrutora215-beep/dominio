import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Construtora ERP | Gestão de Obras Simplificada",
  description: "Sistema web robusto para a gestão de construtoras médias. Controle de Custos, Compras, Pagamentos e Dashboards.",
  keywords: "construção, erp, gestão de obras, software de construção, medição, controle financeiro",
};

import { TRPCProvider } from "@/trpc/Provider";
import { Toaster } from "@/components/ui/sonner";
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-slate-50`}
      >
        <TRPCProvider>
          {children}
        </TRPCProvider>
        <Toaster />
      </body>
    </html>
  );
}
