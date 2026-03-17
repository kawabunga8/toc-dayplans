import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TOC Day Plans",
  description: "Richmond Christian School — TOC Day Plans",
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
