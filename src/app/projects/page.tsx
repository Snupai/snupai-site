import ProjectList from "~/components/ProjectList";
import { type Metadata } from "next";
import { listResolvedProjectsForPublic } from "~/server/projects/store";
import PageHeader from "~/components/PageHeader";

const description =
  "Projects by Snupai, including C# tools, bots, web experiments, automation ideas, and a few open-source projects worth recommending.";

export const metadata: Metadata = {
  title: "Snupai's Projects",
  description,
  openGraph: {
    title: "Snupai's Projects",
    description,
    url: "https://snupai.me/projects",
    siteName: "Snupai's Website",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Snupai's Projects",
    description,
    creator: "@Snupai",
  },
};

export const revalidate = 0;

export default async function ProjectsPage() {
  const { owned, shoutout } = await listResolvedProjectsForPublic();
  return (
    <main className="flex flex-col">
      <div className="container mx-auto flex flex-col gap-16 px-4 py-16 sm:py-20">
        <PageHeader
          kicker="projects"
          subtitle="Things I've built and a few I simply love to recommend."
        >
          My <span className="title-highlight">Projects</span>
        </PageHeader>

        <section className="mx-auto w-full max-w-5xl flex flex-col gap-6">
          <ProjectList initialRepos={owned} label="built by me" />
        </section>

        <section className="mx-auto w-full max-w-5xl flex flex-col gap-6">
          <ProjectList initialRepos={shoutout} label="love & recommend" />
        </section>
      </div>
    </main>
  );
}
