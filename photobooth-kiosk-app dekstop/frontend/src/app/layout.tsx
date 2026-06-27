import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dovelens Photobooth Kiosk",
  description: "Premium self-photo studio kiosk with live preview",
  icons: {
    icon: [
      { url: "/logo/LOGO5.png", type: "image/png" },
      { url: "/logo/LOGO5.png", sizes: "32x32", type: "image/png" },
      { url: "/logo/LOGO5.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/logo/LOGO5.png", sizes: "180x180" }],
    shortcut: ["/logo/LOGO5.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${fontSans.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col font-sans overflow-hidden select-none" style={{ background: "var(--kiosk-bg, #0c0a09)", color: "var(--kiosk-text, #fafaf9)" }}>
        {children}
      </body>
    </html>
  );
}
