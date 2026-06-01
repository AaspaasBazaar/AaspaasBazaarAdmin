import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["400", "700", "800"],
  display: "swap",
});
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AaspaasBazaar Admin",
  description: "Admin panel for the AaspaasBazaar hyperlocal marketplace",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "/";
  const isAuthShell = pathname !== "/login";

  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-screen flex bg-canvas">
        {isAuthShell ? (
          <>
            <Sidebar />
            <div className="flex-1 m-4 ml-0 panel overflow-hidden flex flex-col">
              {children}
            </div>
          </>
        ) : (
          <div className="flex-1">{children}</div>
        )}
      </body>
    </html>
  );
}
