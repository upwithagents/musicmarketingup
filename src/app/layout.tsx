import type { Metadata } from "next";
import { Archivo, Inter, IBM_Plex_Mono } from "next/font/google";
import { AppNav, ThemeScript } from "@upwithagents/ui";
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
    <html
      lang="en"
      className={`${archivo.variable} ${inter.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <PortalChrome>
          <div className="print:hidden">
            <AppNav
              links={[
                { href: "/", label: "Dashboard" },
                { href: "/songs", label: "Songs" },
                { href: "/setlists", label: "Setlists" },
                { href: "/gigs", label: "Gigs" },
                { href: "/calendar", label: "Calendar" },
                { href: "/epk", label: "EPK" },
                { href: "/profile", label: "Profile" },
              ]}
            />
          </div>
          <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
        </PortalChrome>
      </body>
    </html>
  );
}
