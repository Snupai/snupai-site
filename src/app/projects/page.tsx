import ProjectList from "@/components/ProjectList";
import { type Metadata } from "next";
import { getRepoLists } from "@/lib/content";
import type { Project } from "@/lib/content";

type GitHubRepo = {
  id: number;
  name: string;
  description: string | null;
  default_branch: string;
  html_url: string;
  language: string;
  stargazers_count: number;
  private: boolean;
  owner: {
    login: string;
    html_url: string;
  };
};

type GitHubCommit = {
  commit: {
    committer: {
      date: string;
    };
  };
};

async function getReposData(repoList: Project[]) {
  const repoPromises = repoList.map(async ({ repo, description }) => {
    try {
      // Get repo info
      const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
        next: { revalidate: 3600 }
      });

      // If repo is not found or not public, skip it
      if (!repoRes.ok) {
        console.warn(`Repository ${repo} is not accessible: ${repoRes.statusText}`);
        return null;
      }

      const repoData = (await repoRes.json()) as GitHubRepo;

      // Check if repo is private
      if (repoData.private) {
        console.warn(`Repository ${repo} is private`);
        return null;
      }

      // Get latest commit to default branch
      const commitRes = await fetch(`https://api.github.com/repos/${repo}/commits/${repoData.default_branch}`, {
        next: { revalidate: 3600 }
      });

      if (!commitRes.ok) {
        console.warn(`Could not fetch commits for ${repo}: ${commitRes.statusText}`);
        return null;
      }

      const commitData = (await commitRes.json()) as GitHubCommit;

      return {
        ...repoData,
        description: description ?? repoData.description ?? '',
        last_commit: commitData.commit.committer.date
      };
    } catch (error) {
      console.error(`Error fetching data for ${repo}:`, error);
      return null;
    }
  });
  
  const results = await Promise.all(repoPromises);
  return results.filter((repo): repo is NonNullable<typeof repo> => repo !== null);
}

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

export const revalidate = 0; // revalidate on every request

export default async function ProjectsPage() {
  const { projects, shoutoutRepos } = await getRepoLists();
  const repos = await getReposData(projects);
  const shoutout_repos = await getReposData(shoutoutRepos);

  return (
    <main className="flex flex-col">
      <div className="container mx-auto flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[4rem]">
          My <span className="title-highlight">Projects</span>
        </h1>
        <ProjectList initialRepos={repos} />
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[4rem]">
          <span className="title-highlight">Projects</span> I love and recommend
        </h1>
        <ProjectList initialRepos={shoutout_repos} />
      </div>
    </main>
  );
} 