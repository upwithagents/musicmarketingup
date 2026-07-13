import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
