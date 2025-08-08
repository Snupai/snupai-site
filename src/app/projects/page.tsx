import ProjectList from "~/components/ProjectList";
import { type Metadata } from "next";
import { env } from "~/env";

const REPO_LIST = [
  {
    path: 'Snupai/Nyaaa-Bot',
    description: '(discontinued) A Discord bot written in C# I started to learn C# with.'
  },
  {
    path: 'Snupai/snupai-site',
    description: 'My personal website built with Next.js, TypeScript, and Tailwind CSS (this one)'
  },
  {
    path: 'Snupai/MultipackParser',
    description: 'A tool for parsing and managing palettizing data for work internal Palettizing robots.'
  },
  {
    path: 'Snupai/Uebungen-Csharp-Clos',
    description: 'A collection of exercises for learning C#.'
  },
  {
    path: 'Snupai/Uebungen-etc',
    description: 'Even more exercises for learning C#.'
  },
  {
    path: 'Snupai/tcp-ip-comm',
    description: 'A simple TCP/IP communication test for C#.'
  },
  {
    path: 'Snupai/TicTacToe',
    description: 'My final exam for school. A simple TicTacToe game for C#.'
  },
  {
    path: 'Snupai/TicTacToeTcpIpReceiver',
    description: 'The TCP/IP communication receiver for the TicTacToe game.'
  },
  {
    path: 'Snupai/some_bot',
    description: 'A Discord bot just for fun.'
  },
  {
    path: 'Snupai/visualize_MultiPack',
    description: 'A tool for visualizing palettizing data for work internal Palettizing robots.'
  },
  {
    path: 'Snupai/heymiizu-fm-site',
    description: 'A website for a friend of mine using framer motion.'
  },
  {
    path: 'Snupai/carrd-miizu-site',
    description: 'A carrd.co clone for a friend of mine using a lot of css animations.'
  }
];

const SHOUTOUT_REPO_LIST = [
  {
    path: 'SebiAi/custom-nothing-glyph-tools',
    description: 'A tool for creating custom nothing glyphs for Nothing Phones.'
  },
  {
    path: 'SebiAi/GlyphVisualizer',
    description: 'A tool for visualizing glyphs for Nothing Phones.'
  },
  {
    path: 'Pycord-Development/pycord',
    description: 'Pycord is a modern, easy to use, feature-rich, and async ready API wrapper for Discord written in Python.'
  },
  {
    path: 'Aiko-IT-Systems/DisCatSharp',
    description: 'Your library to write discord apps in C# with focus on always providing access to the latest discord features.'
  }
];

type GitHubRepo = {
  id: number;
  name: string;
  description: string | null;
  default_branch: string;
  html_url: string;
  homepage?: string | null;
  language: string;
  stargazers_count: number;
  private: boolean;
  archived: boolean;
  pushed_at?: string;
  updated_at?: string;
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

async function getReposData(repoList: typeof REPO_LIST) {
  const repoPromises = repoList.map(async ({ path, description }) => {
    try {
      // Get repo info
      const repoRes = await fetch(`https://api.github.com/repos/${path}`, {
        headers: env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : undefined,
        next: { revalidate: 3600 }
      });

      // If repo is not found or not public, skip it
      if (!repoRes.ok) {
        console.warn(`Repository ${path} is not accessible: ${repoRes.statusText}`);
        return null;
      }

      const repoData = (await repoRes.json()) as GitHubRepo;

      // Check if repo is private
      if (repoData.private) {
        console.warn(`Repository ${path} is private`);
        return null;
      }

      // Get latest commit to default branch
      const commitRes = await fetch(`https://api.github.com/repos/${path}/commits/${repoData.default_branch}`, {
        headers: env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : undefined,
        next: { revalidate: 3600 }
      });

      let lastCommitDate: string | null = null;
      if (commitRes.ok) {
        const commitData = (await commitRes.json()) as GitHubCommit;
        lastCommitDate = commitData.commit.committer.date;
      } else {
        console.warn(`Could not fetch commits for ${path}: ${commitRes.statusText}`);
        // Fallback to pushed_at or updated_at if available
        lastCommitDate = repoData.pushed_at ?? repoData.updated_at ?? null;
      }

      if (!lastCommitDate) {
        return null;
      }

      return {
        ...repoData,
        homepage: repoData.homepage && repoData.homepage.trim().length > 0 ? repoData.homepage : undefined,
        description: description ?? repoData.description ?? '',
        last_commit: lastCommitDate,
      };
    } catch (error) {
      console.error(`Error fetching data for ${path}:`, error);
      return null;
    }
  });
  
  const results = await Promise.all(repoPromises);
  // Filter out null results (private/inaccessible repos)
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

export default async function ProjectsPage() {
  const repos = await getReposData(REPO_LIST);
  const shoutout_repos = await getReposData(SHOUTOUT_REPO_LIST);
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