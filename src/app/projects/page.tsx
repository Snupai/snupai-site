import Navigation from "~/components/Navigation";
import ProjectList from "~/components/ProjectList";

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
  }
];

const SHOUTOUT_REPO_LIST = [
  {
    path: 'SebiAi/custom-nothing-glyph-tools',
    description: 'A tool for creating custom nothing glyphs for Nothing Phones.'
  }
];

async function getReposData(repoList: typeof REPO_LIST) {
  const repoPromises = repoList.map(async ({ path, description }) => {
    // Get repo info
    const repoRes = await fetch(`https://api.github.com/repos/${path}`, {
      next: { revalidate: 3600 }
    });
    const repoData = await repoRes.json();

    // Get latest commit to default branch
    const commitRes = await fetch(`https://api.github.com/repos/${path}/commits/${repoData.default_branch}`, {
      next: { revalidate: 3600 }
    });
    const commitData = await commitRes.json();

    return {
      ...repoData,
      description: description || repoData.description, // Use custom description if provided, fall back to GitHub description
      last_commit: commitData.commit.committer.date
    };
  });
  
  return Promise.all(repoPromises);
}

export default async function ProjectsPage() {
  const repos = await getReposData(REPO_LIST);
  const shoutout_repos = await getReposData(SHOUTOUT_REPO_LIST);
  return (
    <main className="flex min-h-screen flex-col bg-mocha">
      <Navigation currentPage="projects" />
      <div className="container mx-auto flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[4rem]">
          My <span className="text-mocha-rosewater">Projects</span>
        </h1>
        <ProjectList initialRepos={repos} />
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[4rem]">
          <span className="text-mocha-rosewater">Projects</span> I love and recommend
        </h1>
        <ProjectList initialRepos={shoutout_repos} />
      </div>
    </main>
  );
} 