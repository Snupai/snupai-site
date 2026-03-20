export type ManagedProjectSection = "owned" | "shoutout";

export type ManagedProjectRecord = {
  id: string;
  repoPath: string;
  section: ManagedProjectSection;
  descriptionOverride: string | null;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  homepageOverride: string | null;
  titleOverride: string | null;
};

export type ProjectSyncPreview =
  | {
      status: "ok";
      message: null;
      repo: {
        name: string;
        description: string | null;
        ownerLogin: string;
        ownerUrl: string;
        stars: number;
        language: string;
        htmlUrl: string;
        homepage?: string;
        archived: boolean;
        lastCommit: string;
      };
    }
  | {
      status: "inaccessible";
      message: string;
      repo: null;
    };

export type ResolvedProjectView = {
  id: string;
  name: string;
  description: string;
  language: string;
  stargazers_count: number;
  last_commit: string;
  html_url: string;
  homepage?: string;
  archived?: boolean;
  owner: {
    login: string;
    html_url: string;
  };
  section: ManagedProjectSection;
  sortOrder: number;
};
