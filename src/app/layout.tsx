import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { Inter } from "next/font/google";
import { clubConfig } from "@/club.config";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(clubConfig.siteUrl),
  title: { default: clubConfig.fullName, template: `%s · ${clubConfig.name}` },
  description: clubConfig.description,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: clubConfig.colours.primary },
    { media: "(prefers-color-scheme: dark)", color: "#0b131a" },
  ],
};

/**
 * Applies a Light/Dark choice saved in Profile before the page paints, so
 * there's no flash of the wrong theme. "System" stores nothing.
 */
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

const brandVars = {
  "--brand-primary": clubConfig.colours.primary,
  "--brand-accent": clubConfig.colours.accent,
  "--brand-alert": clubConfig.colours.alert,
  "--brand-ink": clubConfig.colours.ink,
  "--brand-muted": clubConfig.colours.muted,
  "--brand-pale": clubConfig.colours.pale,
  "--brand-paper": clubConfig.colours.paper,
} as CSSProperties;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script may set data-theme before React hydrates.
    <html lang="en-IE" className={`${inter.variable} h-full antialiased`} style={brandVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
