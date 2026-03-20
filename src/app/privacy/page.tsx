import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy information for snupai.me",
};

export default function PrivacyPage() {
  return (
    <main className="flex flex-col">
      <div className="container mx-auto flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[4rem]">
          <span className="title-highlight">Privacy</span> Policy
        </h1>

        <div className="w-full max-w-3xl space-y-6">
          <div className="bg-mocha-surface space-y-4 rounded-xl p-6">
            <h2 className="highlight-text text-2xl font-bold">
              Contact form processing
            </h2>
            <p className="text-mocha-subtext1 text-base leading-relaxed">
              When you submit the contact form, the site stores the message
              contents you provide along with technical metadata used for abuse
              prevention and moderation.
            </p>
          </div>

          <div className="bg-mocha-surface space-y-4 rounded-xl p-6">
            <h2 className="highlight-text text-2xl font-bold">
              Stored metadata
            </h2>
            <p className="text-mocha-subtext1 text-base leading-relaxed">
              Stored metadata may include your IP address, user-agent string,
              origin header, referer header, country header supplied by the
              hosting platform, submission timestamp, and the moderation outcome
              assigned to the request.
            </p>
          </div>

          <div className="bg-mocha-surface space-y-4 rounded-xl p-6">
            <h2 className="highlight-text text-2xl font-bold">
              Purpose and retention
            </h2>
            <p className="text-mocha-subtext1 text-base leading-relaxed">
              This information is processed to receive legitimate contact
              requests, rate limit abusive traffic, suppress spam, and manage IP
              bans where necessary. Contact submission records are retained for
              30 days unless a longer retention period is required to
              investigate abuse.
            </p>
          </div>

          <div className="bg-mocha-surface space-y-4 rounded-xl p-6">
            <h2 className="highlight-text text-2xl font-bold">
              Email delivery
            </h2>
            <p className="text-mocha-subtext1 text-base leading-relaxed">
              Accepted contact submissions are forwarded by email to the site
              operator. Suppressed or blocked attempts are stored for moderation
              but are not forwarded by email.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
