import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata, type Viewport } from "next";
import { embedColor, siteUrl, siteIcons } from "~/lib/site-metadata";
import { TRPCReactProvider } from "~/trpc/react";
import Footer from "~/components/Footer";
import Navigation from "~/components/Navigation";
import SiteBackground from "~/components/SiteBackground";
import PlausibleAnalytics from "~/components/PlausibleAnalytics";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "snupai.me - probably coding, definitely meowing",
    template: "%s | snupai.me",
  },
  description:
    "Snupai's personal site with code projects, AI experiments, automation ideas, social links, yuri vibes, and suspicious amounts of meow.",
  icons: siteIcons,
};

export const viewport: Viewport = { themeColor: embedColor };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <PlausibleAnalytics />
        <TRPCReactProvider>
          <div className="relative flex min-h-screen flex-col">
            <SiteBackground />
            <Navigation />
            <div className="relative z-10 flex-grow">
              {children}
            </div>
            <Footer />
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
