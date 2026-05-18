import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TOGETHER | Cozy Multiplayer Couple World",
  description: "A gorgeous, peaceful digital sanctuary for couples to chill, chat, play mini-games, and stay connected.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TOGETHER",
  },
  applicationName: "TOGETHER",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-full flex flex-col bg-[#0b0e17] text-[#ebeef5] overflow-hidden select-none touch-none">
        {children}
        <Script id="register-sw">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function(err) {
                  console.log('SW registration failed:', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
