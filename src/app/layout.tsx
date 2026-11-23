import "./globals.css";
import type { Metadata } from "next";
import { StoreProvider } from "@/lib/store";
import Shell from "@/components/Shell";

export const metadata: Metadata = { title: "QA Run Manager" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><StoreProvider><Shell>{children}</Shell></StoreProvider></body>
    </html>
  );
}
