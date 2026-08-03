import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Libre_Franklin, Source_Serif_4 } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { seoBaseUrl } from "@/lib/seo/scholar";
import "./globals.css";

const CookieConsent = dynamic(
  () =>
    import("@/components/cookie-consent").then((m) => m.CookieConsent),
  { ssr: false },
);

const body = Libre_Franklin({
  variable: "--font-body",
  subsets: ["latin"],
});

const display = Source_Serif_4({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(seoBaseUrl()),
  title: {
    default: "Nahda Publications",
    template: "%s | Nahda Publications",
  },
  description:
    "Peer-reviewed open-access journals. Submit manuscripts, track peer review, and discover scholarly articles with DOI-backed records.",
  applicationName: "Nahda Publications",
  keywords: [
    "Nahda Publications",
    "open access journals",
    "peer review",
    "scholarly publishing",
    "DOI",
  ],
  authors: [{ name: "Nahda Publications" }],
  openGraph: {
    type: "website",
    siteName: "Nahda Publications",
    title: "Nahda Publications",
    description:
      "Peer-reviewed open-access journals and scholarly articles.",
    url: seoBaseUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: "Nahda Publications",
    description:
      "Peer-reviewed open-access journals and scholarly articles.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col antialiased"
        suppressHydrationWarning
      >
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
