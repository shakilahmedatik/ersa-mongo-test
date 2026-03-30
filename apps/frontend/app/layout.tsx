import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ersa-chat frontend",
  description: "Next.js frontend workspace in a Bun-powered Turborepo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
