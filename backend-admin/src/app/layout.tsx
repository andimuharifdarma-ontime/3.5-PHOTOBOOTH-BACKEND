import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AdminProfileProvider } from "@/contexts/AdminProfileContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SelftFoto Admin",
  description: "Admin panel for SelftFoto photobooth",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AdminProfileProvider>
          {children}
        </AdminProfileProvider>
      </body>
    </html>
  );
}