import { type Metadata } from "next";
import PageHeader from "~/components/PageHeader";

export const metadata: Metadata = {
  title: "About Snupai",
  description:
    "Learn more about me - a student, programmer, and automation engineer.",
  openGraph: {
    title: "About Snupai",
    description:
      "Learn more about me - a student, programmer, and automation engineer.",
    url: "https://snupai.me/about",
    siteName: "Snupai's Website",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Snupai",
    description:
      "Learn more about me - a student, programmer, and automation engineer.",
    creator: "@Snupai",
  },
};

export const dynamic = "force-dynamic";

const doing = [
  "Programming",
  "playing with AI",
  "studying",
  "sleeping",
  "automation engineering",
  "eating cookies :3",
  "playing games",
];

export default function AboutPage() {
  const birthday = new Date(2002, 7, 30); // August 30, 2002 (month is 0-indexed)
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDiff = today.getMonth() - birthday.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthday.getDate())
  ) {
    age--;
  }

  return (
    <main className="flex flex-col">
      <div className="container mx-auto flex max-w-3xl flex-col gap-12 px-4 py-16 sm:py-20">
        <PageHeader
          kicker="about"
          subtitle="Student, programmer, and automation engineer — coding for fun."
        >
          About <span className="title-highlight">Snupai</span>
        </PageHeader>

        <p className="text-balance text-center text-lg leading-relaxed text-mocha-subtext">
          {
            "Hi. I'm a student at the University of Applied Sciences Kaiserslautern in Germany, studying applied computer science."
          }
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <section className="rounded-2xl border border-mocha-surface bg-mocha-mantle/60 p-6 backdrop-blur-sm transition-colors hover:border-mocha-lavender sm:col-span-2">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-mocha-lavender">
              So, who am I?
            </h2>
            <p className="leading-relaxed text-mocha-subtext">
              {`I am Snupai. I am ${age} years old. I code from time to time. `}
              {
                "I'm a huge fan of AI and machine learning. I'm a noob when it comes to programming but love playing around. "
              }
              {"My code is probably bad but I'm having fun."}
            </p>
          </section>

          <section className="rounded-2xl border border-mocha-surface bg-mocha-mantle/60 p-6 backdrop-blur-sm transition-colors hover:border-mocha-lavender">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-mocha-lavender">
              What I do
            </h2>
            <ul className="flex flex-wrap gap-2">
              {doing.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-mocha-surface bg-mocha-surface/40 px-3 py-1 text-sm text-mocha-subtext"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-mocha-surface bg-mocha-mantle/60 p-6 backdrop-blur-sm transition-colors hover:border-mocha-lavender">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-mocha-lavender">
              Fun fact
            </h2>
            <p className="leading-relaxed text-mocha-subtext">
              {
                "Snupai is a nickname from my friends — not sure why, but it stuck. It's a mix of Snu Snu and Senpai. "
              }
              {"Senpai is Japanese for an older student or mentor. Snu Snu is... well, I won't explain that one here."}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
