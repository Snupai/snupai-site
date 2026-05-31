import Link from "next/link";
import ClickableTitle from "~/components/ClickableTitle";
import AsciiWave from "~/components/AsciiWave";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Snupai's Website",
  description: "Welcome to my personal website. For fun :3",
  openGraph: {
    title: "Snupai's Website",
    description: "Welcome to my personal website. For fun :3",
    url: "https://snupai.me",
    siteName: "Snupai's Website",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Snupai's Website",
    description: "Welcome to my personal website. For fun :3",
    creator: "@Snupai",
  },
};

const links = [
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/contact", label: "Contact" },
];

export default function HomePage() {
  return (
    <main className="flex min-h-[calc(100vh-9rem)] flex-col items-center justify-center px-6 py-20">
      <div className="flex w-full max-w-xl flex-col items-center gap-10">
        {/* Subtle ASCII wave centerpiece */}
        <div className="relative w-full">
          <AsciiWave
            className="h-40 w-full text-[0.55rem] text-mocha-overlay-2 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] sm:h-48 sm:text-[0.7rem]"
          />
        </div>

        {/* Title */}
        <h1 className="text-center text-4xl font-extrabold tracking-tight sm:text-6xl">
          <ClickableTitle text="snupai.me" url="https://snupai.me" />
        </h1>

        {/* Minimal calm copy */}
        <p className="max-w-md text-balance text-center text-base leading-relaxed text-mocha-subtext sm:text-lg">
          Hello, and welcome. A quiet corner of the internet — feel free to look
          around.
        </p>

        {/* Minimal navigation links */}
        <nav className="flex flex-wrap items-center justify-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-mocha-surface px-5 py-2 text-sm font-medium text-mocha-subtext transition-colors hover:border-mocha-overlay hover:text-mocha-lavender"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
