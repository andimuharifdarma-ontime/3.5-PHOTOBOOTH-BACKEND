import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PhotoProvider } from "@/store/usePhotoStore";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SyncProvider } from "@/components/providers/SyncProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Photobooth Dovelens.ft",
  description: "Photobooth Dovelens - capture your moments in style",
  icons: {
    icon: [
      { url: "/logo/LOGO5.png", type: "image/png" },
      { url: "/logo/LOGO5.png", sizes: "32x32", type: "image/png" },
      { url: "/logo/LOGO5.png", sizes: "192x192", type: "image/png" }
    ],
    apple: [
      { url: "/logo/LOGO5.png", sizes: "180x180" }
    ],
    shortcut: [
      "/logo/LOGO5.png"
    ]
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta property="csp-nonce" content={nonce} />
        <link rel="icon" type="image/png" sizes="32x32" href="/logo/LOGO5.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/logo/LOGO5.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo/LOGO5.png" />
        <link rel="shortcut icon" type="image/png" href="/logo/LOGO5.png" />
      </head>
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <SyncProvider>
            <PhotoProvider>
              {children}
            </PhotoProvider>
          </SyncProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
