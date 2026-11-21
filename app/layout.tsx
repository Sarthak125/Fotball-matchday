import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", weight: ["500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Matchday", template: "%s · Matchday" },
  description: "Live scores, tables and stats for the Premier League, La Liga and Champions League.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0f14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body>
        <Nav />
        {children}
        <footer className="site">Data from API-Football. Times are shown in your local time zone.</footer>
      </body>
    </html>
  );
}
