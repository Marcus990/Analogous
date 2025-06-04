import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Analogous - Understand Complex Topics Through Analogies",
  description: "A platform that helps users understand complex topics through analogies using AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} text-white antialiased`}>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1 container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
