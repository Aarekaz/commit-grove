import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CommitGrove — Watch your code grow into a living forest",
  description:
    "Transform your GitHub contribution history into a beautiful 3D forest visualization.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#f6f8fa] text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
