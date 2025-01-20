import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import Footer from "~/components/Footer";
import Navigation from "~/components/Navigation";

export const metadata: Metadata = {
  metadataBase: new URL("https://snupai.me"),
  title: {
    default: "Snupai's Website",
    template: "%s | Snupai's Website",
  },
  description: "Personal website of Snupai - Student, Programmer, and Automation Engineer",
  icons: [{ rel: "icon", url: "/snupai.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <TRPCReactProvider>
          <div className="flex flex-col min-h-screen bg-mocha">
            <Navigation />
            <div className="flex-grow">
              {children}
            </div>
            <Footer />
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
