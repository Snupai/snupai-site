import { randomUUID } from "node:crypto";
import { z } from "zod";
import { redis } from "~/server/redis";
import { resolveManagedProject, validateGitHubRepo } from "~/server/projects/github";
import type { ManagedProjectRecord, ManagedProjectSection } from "~/server/projects/types";

const PROJECT_IDS_KEY = "projects:ids";
const SECTION_ORDER: Record<ManagedProjectSection, number> = {
  owned: 0,
  shoutout: 1,
};

const repoPathSchema = z.string().trim().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Repo path must look like owner/name");

const defaultProjects: Array<Pick<ManagedProjectRecord, "repoPath" | "section" | "descriptionOverride">> = [
  { repoPath: "Snupai/Nyaaa-Bot", section: "owned", descriptionOverride: "(discontinued) A Discord bot written in C# I started to learn C# with." },
  { repoPath: "Snupai/MultipackParser", section: "owned", descriptionOverride: "A tool for parsing and managing palettizing data for work internal Palettizing robots." },
  { repoPath: "Snupai/Uebungen-Csharp-Clos", section: "owned", descriptionOverride: "A collection of exercises for learning C#." },
  { repoPath: "Snupai/Uebungen-etc", section: "owned", descriptionOverride: "Even more exercises for learning C#." },
  { repoPath: "Snupai/tcp-ip-comm", section: "owned", descriptionOverride: "A simple TCP/IP communication test for C#." },
  { repoPath: "Snupai/TicTacToe", section: "owned", descriptionOverride: "My final exam for school. A simple TicTacToe game for C#." },
  { repoPath: "Snupai/TicTacToeTcpIpReceiver", section: "owned", descriptionOverride: "The TCP/IP communication receiver for the TicTacToe game." },
  { repoPath: "Snupai/some_bot", section: "owned", descriptionOverride: "A Discord bot just for fun." },
  { repoPath: "Snupai/visualize_MultiPack", section: "owned", descriptionOverride: "A tool for visualizing palettizing data for work internal Palettizing robots." },
  { repoPath: "Snupai/heymiizu-fm-site", section: "owned", descriptionOverride: "A website for a friend of mine using framer motion." },
  { repoPath: "Snupai/carrd-miizu-site", section: "owned", descriptionOverride: "A carrd.co clone for a friend of mine using a lot of css animations." },
  { repoPath: "SebiAi/custom-nothing-glyph-tools", section: "shoutout", descriptionOverride: "A tool for creating custom nothing glyphs for Nothing Phones." },
  { repoPath: "SebiAi/GlyphVisualizer", section: "shoutout", descriptionOverride: "A tool for visualizing glyphs for Nothing Phones." },
  { repoPath: "Pycord-Development/pycord", section: "shoutout", descriptionOverride: "Pycord is a modern, easy to use, feature-rich, and async ready API wrapper for Discord written in Python." },
  { repoPath: "Aiko-IT-Systems/DisCatSharp", section: "shoutout", descriptionOverride: "Your library to write discord apps in C# with focus on always providing access to the latest discord features." },
];
const DEFAULT_OWNED_PROJECT_COUNT = defaultProjects.filter((project) => project.section === "owned").length;

function getProjectKey(id: string) {
  return `project:${id}`;
}

function sortProjects(projects: ManagedProjectRecord[]) {
  return [...projects].sort((left, right) => {
    const sectionDifference = SECTION_ORDER[left.section] - SECTION_ORDER[right.section];
    if (sectionDifference !== 0) {
      return sectionDifference;
    }

    return left.sortOrder - right.sortOrder;
  });
}

function normalizeRepoPath(repoPath: string) {
  return repoPathSchema.parse(repoPath);
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function getProjectIds() {
  return await redis.smembers<string[]>(PROJECT_IDS_KEY);
}

async function getProjectById(id: string) {
  return await redis.get<ManagedProjectRecord>(getProjectKey(id));
}

async function putProject(record: ManagedProjectRecord) {
  await redis.set(getProjectKey(record.id), record);
  await redis.sadd(PROJECT_IDS_KEY, record.id);
}

export async function ensureManagedProjectsSeeded() {
  const existingIds = await getProjectIds();
  if (existingIds.length > 0) {
    return;
  }

  const createdAt = new Date().toISOString();
  await Promise.all(defaultProjects.map(async (project, index) => {
    const record: ManagedProjectRecord = {
      id: randomUUID(),
      repoPath: project.repoPath,
      section: project.section,
      descriptionOverride: project.descriptionOverride,
      sortOrder: project.section === "owned" ? index : index - DEFAULT_OWNED_PROJECT_COUNT,
      isVisible: true,
      createdAt,
      updatedAt: createdAt,
      homepageOverride: null,
      titleOverride: null,
    };
    await putProject(record);
  }));
}

export async function listManagedProjects() {
  await ensureManagedProjectsSeeded();
  const ids = await getProjectIds();
  const records = await Promise.all(ids.map((id) => getProjectById(id)));
  return sortProjects(records.filter((record): record is ManagedProjectRecord => record !== null));
}

export async function getManagedProject(id: string) {
  await ensureManagedProjectsSeeded();
  return await getProjectById(id);
}

export async function createManagedProject(input: {
  repoPath: string;
  section: ManagedProjectSection;
  descriptionOverride?: string | null;
}) {
  const repoPath = normalizeRepoPath(input.repoPath);
  const existing = await listManagedProjects();
  if (existing.some((project) => project.repoPath.toLowerCase() === repoPath.toLowerCase())) {
    throw new Error("A project with this repo path already exists.");
  }

  const nextSortOrder = existing.filter((project) => project.section === input.section).length;
  const now = new Date().toISOString();
  const record: ManagedProjectRecord = {
    id: randomUUID(),
    repoPath,
    section: input.section,
    descriptionOverride: normalizeOptionalText(input.descriptionOverride),
    sortOrder: nextSortOrder,
    isVisible: true,
    createdAt: now,
    updatedAt: now,
    homepageOverride: null,
    titleOverride: null,
  };

  await putProject(record);
  return record;
}

export async function updateManagedProject(
  id: string,
  updates: Partial<Pick<ManagedProjectRecord, "descriptionOverride" | "section" | "isVisible" | "homepageOverride" | "titleOverride" | "repoPath">>,
) {
  const existing = await getManagedProject(id);
  if (!existing) {
    throw new Error("Project not found.");
  }

  const repoPath = updates.repoPath ? normalizeRepoPath(updates.repoPath) : existing.repoPath;
  const nextSection = updates.section ?? existing.section;
  const allProjects = await listManagedProjects();
  if (repoPath.toLowerCase() !== existing.repoPath.toLowerCase()
    && allProjects.some((project) => project.id !== id && project.repoPath.toLowerCase() === repoPath.toLowerCase())) {
    throw new Error("A project with this repo path already exists.");
  }

  const updated: ManagedProjectRecord = {
    ...existing,
    repoPath,
    section: nextSection,
    descriptionOverride: updates.descriptionOverride === undefined ? existing.descriptionOverride : normalizeOptionalText(updates.descriptionOverride),
    isVisible: updates.isVisible ?? existing.isVisible,
    homepageOverride: updates.homepageOverride === undefined ? existing.homepageOverride : normalizeOptionalText(updates.homepageOverride),
    titleOverride: updates.titleOverride === undefined ? existing.titleOverride : normalizeOptionalText(updates.titleOverride),
    updatedAt: new Date().toISOString(),
  };

  if (updates.section && updates.section !== existing.section) {
    updated.sortOrder = allProjects.filter((project) => project.section === updates.section && project.id !== id).length;
  }

  await putProject(updated);
  return updated;
}

export async function deleteManagedProject(id: string) {
  const existing = await getManagedProject(id);
  if (!existing) {
    return false;
  }

  await redis.del(getProjectKey(id));
  await redis.srem(PROJECT_IDS_KEY, id);
  return true;
}

export async function reorderManagedProjects(input: {
  ownedIds: string[];
  shoutoutIds: string[];
}) {
  const allProjects = await listManagedProjects();
  const projectMap = new Map(allProjects.map((project) => [project.id, project]));

  await Promise.all([
    ...input.ownedIds.map(async (id, index) => {
      const project = projectMap.get(id);
      if (!project) {
        return;
      }

      await putProject({
        ...project,
        section: "owned",
        sortOrder: index,
        updatedAt: new Date().toISOString(),
      });
    }),
    ...input.shoutoutIds.map(async (id, index) => {
      const project = projectMap.get(id);
      if (!project) {
        return;
      }

      await putProject({
        ...project,
        section: "shoutout",
        sortOrder: index,
        updatedAt: new Date().toISOString(),
      });
    }),
  ]);
}

export async function listResolvedProjectsForPublic() {
  const managedProjects = await listManagedProjects();
  const visibleProjects = managedProjects.filter((project) => project.isVisible);
  const resolved = await Promise.all(visibleProjects.map((project) => resolveManagedProject(project, 3600)));

  return {
    owned: resolved
      .filter((project) => project.resolved && project.managed.section === "owned")
      .map((project) => project.resolved!),
    shoutout: resolved
      .filter((project) => project.resolved && project.managed.section === "shoutout")
      .map((project) => project.resolved!),
  };
}

export async function listResolvedProjectsForAdmin() {
  const managedProjects = await listManagedProjects();
  return await Promise.all(managedProjects.map(async (project) => ({
    project,
    preview: await validateGitHubRepo(project.repoPath, 0),
  })));
}
