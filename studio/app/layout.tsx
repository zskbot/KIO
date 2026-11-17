import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "KIO.AI — Product Engineering Studio", description: "Plan, build and ship software with KIO AI Copilot." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="vi"><body>{children}</body></html>; }
