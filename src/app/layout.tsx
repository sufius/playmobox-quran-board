import type { Metadata } from "next";
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
      <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <div className="page">
          {children}
        </div>
      </body>
    </html>
  );
}
