import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CICADA — Local AI Assistant",
  description: "Private, local-first personal AI assistant running on Ollama and Next.js.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-canvas text-content-primary antialiased min-h-screen selection:bg-surface-active selection:text-content-primary">
        {children}
      </body>
    </html>
  );
}
