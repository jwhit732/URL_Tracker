import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RTO Link Tracker",
  description: "Internal link tracking for Smart AI Solutions",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
