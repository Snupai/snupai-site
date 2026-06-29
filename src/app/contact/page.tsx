import { type Metadata } from "next";
import ContactForm from "~/components/ContactForm";
import { createContactFormToken } from "~/server/contact/security";
import PageHeader from "~/components/PageHeader";

const description =
  "Contact Snupai by email, social links, or the contact form for project questions, small web ideas, automation experiments, and meow mail.";

export const metadata: Metadata = {
  title: "Contact Snupai",
  description,
  openGraph: {
    title: "Contact Snupai",
    description,
    url: "https://snupai.me/contact",
    siteName: "Snupai's Website",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Snupai",
    description,
    creator: "@Snupai",
  },
};

export const dynamic = "force-dynamic";

const socials = [
  { label: "Discord", value: "@snupai", href: "https://discord.com/users/239809113125552129/" },
  { label: "GitHub", value: "Snupai", href: "https://github.com/Snupai" },
  { label: "Bluesky", value: "@snupai.moe", href: "https://bsky.app/profile/snupai.moe" },
  { label: "X", value: "@Snupai", href: "https://x.com/Snupai" },
];

export default function ContactPage() {
  const renderedAt = Date.now();
  const formToken = createContactFormToken(renderedAt);

  return (
    <main className="flex flex-col">
      <div className="container mx-auto flex max-w-2xl flex-col gap-12 px-4 py-16 sm:py-20">
        <PageHeader
          kicker="contact"
          subtitle="Not sure why you'd want to, but here's how to reach me."
        >
          Contact <span className="title-highlight">Snupai</span>
        </PageHeader>

        {/* Primary contact details */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-mocha-surface bg-mocha-mantle/60 p-5 backdrop-blur-sm transition-colors hover:border-mocha-lavender">
            <p className="mb-1 font-mono text-xs uppercase tracking-[0.25em] text-mocha-overlay-2">
              Email
            </p>
            <a
              href="mailto:nya@snupai.me"
              className="text-lg highlight-text"
              target="_blank"
              rel="noopener noreferrer"
            >
              nya@snupai.me
            </a>
          </div>

          <div className="rounded-2xl border border-mocha-surface bg-mocha-mantle/60 p-5 backdrop-blur-sm transition-colors hover:border-mocha-lavender">
            <p className="mb-1 font-mono text-xs uppercase tracking-[0.25em] text-mocha-overlay-2">
              Location
            </p>
            <p className="text-lg text-mocha-subtext">Heaven</p>
          </div>
        </div>

        {/* Social links */}
        <div className="rounded-2xl border border-mocha-surface bg-mocha-mantle/60 p-6 backdrop-blur-sm">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-mocha-lavender">
            Social media
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1 rounded-xl border border-mocha-surface bg-mocha-surface/30 px-4 py-3 transition-colors hover:border-mocha-pink"
              >
                <span className="text-xs text-mocha-overlay-2">{s.label}</span>
                <span className="text-sm text-mocha-subtext transition-colors group-hover:text-mocha-pink">
                  {s.value}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div className="rounded-2xl border border-mocha-surface bg-mocha-mantle/60 p-6 backdrop-blur-sm">
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.25em] text-mocha-lavender">
            Send a message
          </p>
          <p className="mb-5 text-sm text-mocha-subtext">
            Prefer a form? Drop me a line below.
          </p>
          <ContactForm formToken={formToken} renderedAt={renderedAt} />
        </div>
      </div>
    </main>
  );
}
