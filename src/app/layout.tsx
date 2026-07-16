import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klar Klork Game",
  description: "Traditional Cambodian Gourd-Crab-Fish dice game.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="text-slate-900 antialiased">{children}</body>
    </html>
  );
}
