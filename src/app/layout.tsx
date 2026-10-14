import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { Stars } from "@/components/Stars";
import "./globals.css";

const heading = Space_Grotesk({ variable: "--font-heading", subsets: ["latin"], weight: ["500", "700"] });
const body = DM_Sans({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SpaceClub Mission Control",
  description: "Your sites, domains, analytics and support in one place",
};

// Applies a saved light/dark choice before first paint, so there's no flash
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <Stars />
        <div className="relative z-10 flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
