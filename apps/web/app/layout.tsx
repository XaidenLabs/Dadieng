import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.DADIENG_PUBLIC_APP_URL ?? "https://dadieng-console.dadiengalfred.chatgpt.site"),
  title: { default: "Dadieng Console", template: "%s · Dadieng" },
  description: "Operate and inspect the shared defense network for AI agents.",
  icons: { icon: "/dadieng-logo.png", shortcut: "/dadieng-logo.png" },
  openGraph: {
    title: "Dadieng — a shared immune system for AI agents",
    description: "Inspect threats, defenses, validators, and protocol safety in one operator console.",
    images: [{ url: "/dadieng-banner.png", width: 1536, height: 1024, alt: "Dadieng protocol" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
