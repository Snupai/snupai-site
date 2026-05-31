import Link from "next/link";
import ClickableTitle from "~/components/ClickableTitle";
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
    <main className="relative flex min-h-[calc(100vh-9rem)] flex-col items-center justify-center px-6 py-20">
      <div className="flex w-full max-w-lg flex-col items-center gap-7 text-center">
        {/* Mono kicker with a soft live indicator */}
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.35em] text-mocha-overlay-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mocha-lavender opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mocha-lavender" />
          </span>
          welcome
        </div>

        {/* Title */}
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl">
          <ClickableTitle text="snupai.me" url="https://snupai.me" />
        </h1>

        {/* One calm line */}
        <p className="max-w-sm text-balance text-base leading-relaxed text-mocha-subtext">
          A quiet corner of the internet. Move your cursor — the waves follow.
        </p>

        {/* Inline mono navigation */}
        <nav className="mt-2 flex items-center gap-1 font-mono text-sm">
          {links.map((link, i) => (
            <span key={link.href} className="flex items-center gap-1">
              {i > 0 && (
                <span aria-hidden="true" className="px-1 text-mocha-overlay-1">
                  /
                </span>
              )}
              <Link
                href={link.href}
                className="rounded px-2 py-1 text-mocha-subtext transition-colors hover:text-mocha-lavender"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </main>
  );
}
