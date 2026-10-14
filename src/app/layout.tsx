import type { Metadata } from "next";
import { Hind } from "next/font/google";
import { Scene } from "@/components/Scene";
import "./globals.css";

// Frutiger look: Segoe UI / Frutiger where installed, Hind as the web fallback
const hind = Hind({ variable: "--font-hind", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "SpaceClub Mission Control",
  description: "Your sites, domains, analytics and support in one place",
  icons: { icon: "/logo-orb.svg" },
};

// Resolves the System/Day/Night setting into data-theme before first paint
const themeScript = `try{var m=localStorage.getItem("theme");var d=m==="dark"||(m!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={hind.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Scene />
        {children}
      </body>
    </html>
  );
}
