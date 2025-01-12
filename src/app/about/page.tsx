import Navigation from "~/components/Navigation";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "About Snupai",
  description: "Learn more about me - a student, programmer, and automation engineer.",
  openGraph: {
    title: "About Snupai",
    description: "Learn more about me - a student, programmer, and automation engineer.",
    url: "https://snupai.me/about",
    siteName: "Snupai's Website",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Snupai",
    description: "Learn more about me - a student, programmer, and automation engineer.",
    creator: "@Snupai",
  },
};

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col bg-mocha">
      <Navigation currentPage="about" />
      <div className="container mx-auto flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[4rem]">
          About <span className="text-mocha-rosewater">Snupai</span>
        </h1>
        
        <div className="max-w-3xl text-lg space-y-6">
          <p>
            Hi. I&apos;m a student at University of Applied Sciences Kaiserslautern in Germany, actively studying applied computer science.
          </p>

          <div className="rounded-xl bg-mocha-surface p-6 space-y-4">
            <h2 className="text-2xl font-bold text-mocha-flamingo">So, who am I?</h2>
            <p>
              I am Snupai. I am 22 years old. I code from time to time. 
              I&apos;m a huge fan of AI and machine learning. I am a noob if it comes to programming but love playing around.
              My code is probably bad but I am having fun.
            </p>
          </div>

          <div className="rounded-xl bg-mocha-surface p-6 space-y-4">
            <h2 className="text-2xl font-bold text-mocha-flamingo">What I do</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Programming</li>
              <li>playing with AI</li>
              <li>studying</li>
              <li>sleeping</li>
              <li>working as an automation engineer</li>
              <li>eating cookies :3</li>
              <li>playing games</li>
            </ul>
          </div>

          <div className="rounded-xl bg-mocha-surface p-6 space-y-4">
            <h2 className="text-2xl font-bold text-mocha-flamingo">Fun Facts</h2>
            <p>
              Snupai is a nickname I got from my friends. I am not sure why but it stuck.
              The name is a mix between Snu Snu and Senpai. Senpai is a Japanese word for older brother.
              While Snu Snu is... uh well... I won&apos;t explain it here.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
} 