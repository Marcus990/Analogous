import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { AuthProvider } from "@/lib/auth";
import { StreakProvider } from "@/lib/streakContext";
import { NotificationProvider } from "@/lib/notificationContext";
import Footer from "@/components/Footer";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Analogous - AI-Powered Analogies",
  description: "Create compelling analogies with the help of AI",
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={`${inter.className} bg-black min-h-screen text-white`}>
        <AuthProvider>
          <NotificationProvider>
            <StreakProvider>
              <Navigation />
              <main>{children}</main>
              <Footer />
            </StreakProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
