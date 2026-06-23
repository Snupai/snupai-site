import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import Footer from "~/components/Footer";
import Navigation from "~/components/Navigation";
import SiteBackground from "~/components/SiteBackground";

export const metadata: Metadata = {
  metadataBase: new URL("https://snupai.me"),
  title: {
    default: "snupai.me - probably coding, definitely meowing",
    template: "%s | snupai.me",
  },
  description:
    "Snupai's personal site with code projects, AI experiments, automation ideas, social links, yuri vibes, and suspicious amounts of meow.",
  icons: {
    icon: [{ url: "/snupai.ico" }],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/touch-icon-310x310.png",
        sizes: "310x310",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
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
