import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeInitScript } from "@/components/theme-init";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SIGCO — Sistema Integrado de Gestão de Clínica Odontológica",
  description: "Plataforma completa de gestão de clínica odontológica",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full dark`} suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body className="h-full font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
