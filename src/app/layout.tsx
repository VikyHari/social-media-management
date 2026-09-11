import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Creator Growth Manager",
  description: "An AI-powered digital marketing manager for one content creator.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
