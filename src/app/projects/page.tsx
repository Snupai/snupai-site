import ProjectList from "~/components/ProjectList";
import { type Metadata } from "next";
import { listResolvedProjectsForPublic } from "~/server/projects/store";

export const metadata: Metadata = {
  title: "Snupai's Projects",
  description: "Check out my projects and other cool projects I recommend.",
  openGraph: {
    title: "Snupai's Projects",
    description: "Check out my projects and other cool projects I recommend.",
    url: "https://snupai.me/projects",
    siteName: "Snupai's Website",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Snupai's Projects",
    description: "Check out my projects and other cool projects I recommend.",
    creator: "@Snupai",
  },
};

export default async function ProjectsPage() {
  const { owned, shoutout } = await listResolvedProjectsForPublic();
  return (
    <main className="flex flex-col">
      <div className="container mx-auto flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[4rem]">
          My <span className="title-highlight">Projects</span>
        </h1>
        <ProjectList initialRepos={owned} />
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[4rem]">
          <span className="title-highlight">Projects</span> I love and recommend
        </h1>
        <ProjectList initialRepos={shoutout} />
      </div>
    </main>
  );
}
