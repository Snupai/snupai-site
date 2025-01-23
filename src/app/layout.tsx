import "@/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { TRPCReactProvider } from "@/trpc/react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <TRPCReactProvider headers={headers()}>
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

function headers() {
  return new Headers({
    'x-trpc-source': 'react',
  });
}
