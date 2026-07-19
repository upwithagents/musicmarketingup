import type { Metadata } from "next";
import { Archivo, Inter, IBM_Plex_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import { PortalChrome } from "@/components/PortalChrome";
import "./globals.css";

const archivo = Archivo({
  variable: "--app-font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--app-font-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--app-font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MusicMarketingUp",
  description: "Music-marketing helper for indie bands",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <PortalChrome />
        <header className="border-b border-[var(--border)] print:hidden">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="text-lg font-semibold">🎤 MusicMarketingUp</span>
            <Nav />
          </div>
        </header>
        <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
      </body>
    </html>
  );
}
