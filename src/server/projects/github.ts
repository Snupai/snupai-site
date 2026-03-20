import { env } from "~/env";
import type { ManagedProjectRecord, ProjectSyncPreview, ResolvedProjectView } from "~/server/projects/types";

type GitHubRepo = {
  name: string;
  description: string | null;
  default_branch: string;
  html_url: string;
  homepage?: string | null;
  language: string | null;
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

function getGitHubHeaders() {
  return env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : undefined;
}

function getNonEmptyString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function fetchGitHubJson(url: string, options?: RequestInit & { next?: { revalidate: number } }) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      ...getGitHubHeaders(),
      ...(options?.headers ?? {}),
    },
  });

  return response;
}

async function getLastCommitDate(repoPath: string, defaultBranch: string, fallbackDate: string | null, revalidate: number) {
  const commitResponse = await fetchGitHubJson(
    `https://api.github.com/repos/${repoPath}/commits/${defaultBranch}`,
    { next: { revalidate } },
  );

  if (!commitResponse.ok) {
    return fallbackDate;
  }

  const commitData = (await commitResponse.json()) as GitHubCommit;
  return commitData.commit.committer.date;
}

export async function validateGitHubRepo(repoPath: string, revalidate = 0): Promise<ProjectSyncPreview> {
  try {
    const repoResponse = await fetchGitHubJson(`https://api.github.com/repos/${repoPath}`, revalidate > 0
      ? { next: { revalidate } }
      : { cache: "no-store" });

    if (!repoResponse.ok) {
      return {
        status: "inaccessible",
        message: `GitHub returned ${repoResponse.status} for ${repoPath}.`,
        repo: null,
      };
    }

    const repo = (await repoResponse.json()) as GitHubRepo;
    if (repo.private) {
      return {
        status: "inaccessible",
        message: "Repository is private.",
        repo: null,
      };
    }

    const fallbackDate = repo.pushed_at ?? repo.updated_at ?? null;
    const lastCommit = await getLastCommitDate(repoPath, repo.default_branch, fallbackDate, revalidate);

    if (!lastCommit) {
      return {
        status: "inaccessible",
        message: "Could not determine the latest commit date.",
        repo: null,
      };
    }

    return {
      status: "ok",
      message: null,
      repo: {
        name: repo.name,
        description: repo.description,
        ownerLogin: repo.owner.login,
        ownerUrl: repo.owner.html_url,
        stars: repo.stargazers_count,
        language: repo.language ?? "",
        htmlUrl: repo.html_url,
        homepage: getNonEmptyString(repo.homepage),
        archived: repo.archived,
        lastCommit,
      },
    };
  } catch (error) {
    return {
      status: "inaccessible",
      message: error instanceof Error ? error.message : "Unexpected GitHub error.",
      repo: null,
    };
  }
}

export async function resolveManagedProject(record: ManagedProjectRecord, revalidate = 3600) {
  const preview = await validateGitHubRepo(record.repoPath, revalidate);

  if (preview.status !== "ok") {
    return {
      managed: record,
      preview,
      resolved: null,
    };
  }

  const titleOverride = getNonEmptyString(record.titleOverride);
  const descriptionOverride = getNonEmptyString(record.descriptionOverride);
  const homepageOverride = getNonEmptyString(record.homepageOverride);

  const resolved: ResolvedProjectView = {
    id: record.id,
    name: titleOverride ?? preview.repo.name,
    description: descriptionOverride ?? preview.repo.description ?? "",
    language: preview.repo.language,
    stargazers_count: preview.repo.stars,
    last_commit: preview.repo.lastCommit,
    html_url: preview.repo.htmlUrl,
    homepage: homepageOverride ?? preview.repo.homepage,
    archived: preview.repo.archived,
    owner: {
      login: preview.repo.ownerLogin,
      html_url: preview.repo.ownerUrl,
    },
    section: record.section,
    sortOrder: record.sortOrder,
  };

  return {
    managed: record,
    preview,
    resolved,
  };
}
