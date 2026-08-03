import type { Metadata } from "next";
import { Libre_Franklin, Source_Serif_4 } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { CookieConsent } from "@/components/cookie-consent";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import "./globals.css";

const body = Libre_Franklin({
  variable: "--font-body",
  subsets: ["latin"],
});

const display = Source_Serif_4({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nahda Publications",
  description:
    "Journal submission, peer review, and scholarly publishing platform",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <AuthProvider>
          <SiteHeader />
          <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
          <SiteFooter />
          <CookieConsent />
        </AuthProvider>
      </body>
    </html>
  );
}
