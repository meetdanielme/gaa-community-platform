import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { Inter } from "next/font/google";
import { clubConfig } from "@/club.config";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: clubConfig.fullName, template: `%s · ${clubConfig.name}` },
  description: clubConfig.description,
};

export const viewport: Viewport = {
  themeColor: clubConfig.colours.primary,
};

const brandVars = {
  "--brand-primary": clubConfig.colours.primary,
  "--brand-accent": clubConfig.colours.accent,
  "--brand-ink": clubConfig.colours.ink,
  "--brand-muted": clubConfig.colours.muted,
  "--brand-pale": clubConfig.colours.pale,
  "--brand-paper": clubConfig.colours.paper,
} as CSSProperties;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IE" className={`${inter.variable} h-full antialiased`} style={brandVars}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
