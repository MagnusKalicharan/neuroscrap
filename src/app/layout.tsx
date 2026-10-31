import type { Metadata } from "next";
import { Share_Tech_Mono, Rajdhani } from "next/font/google";
import "./globals.css";

const mono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const rajdhani = Rajdhani({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEURO SCRAP — Solve. Rebuild. Survive.",
  description:
    "A post-apocalyptic web-based programming puzzle game. Scavenge lost neural algorithms, rewire ruined systems, rebuild civilisation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${mono.variable} ${rajdhani.variable}`} suppressHydrationWarning>
      <body className="antialiased bg-[#050806] text-white overflow-hidden" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
