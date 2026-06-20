import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const title = "CommitGrove — Watch your code grow into a living world";
const description =
  "Transform your GitHub contribution history into a beautiful 3D forest, city, or terrain.";

// Resolves relative OG/Twitter image URLs (e.g. the per-user opengraph-image
// route) to absolute ones. Without this, Next falls back to localhost:3000 and
// social crawlers can't load the share card. Prefer an explicit site URL, then
// the Vercel-provided production host, then localhost for dev.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    siteName: "CommitGrove",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
