import type { Metadata } from "next";
import "@fontsource/raleway/500.css";
import "./globals.css";
import "./tajweed.css";

export const metadata: Metadata = {
  title: "Quran board | Playmobox",
  description: "Memorize the Quran with the Playmobox Quran board",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
          {children}
      </body>
    </html>
  );
}
