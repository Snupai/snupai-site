"use client";

import { useMemo, useState } from "react";
import type {
  ManagedProjectRecord,
  ManagedProjectSection,
  ProjectSyncPreview,
} from "~/server/projects/types";

type AdminProjectItem = {
  project: ManagedProjectRecord;
  preview: ProjectSyncPreview;
};

type AddProjectForm = {
  repoPath: string;
  section: ManagedProjectSection;
  descriptionOverride: string;
};

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const copy = [...items];
  const [item] = copy.splice(index, 1);
  if (item === undefined) {
    return items;
  }
  copy.splice(nextIndex, 0, item);
  return copy;
}

export default function ProjectsAdminPanel({
  initialProjects,
}: {
  initialProjects: AdminProjectItem[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(
      initialProjects.map((item) => [
        item.project.id,
        item.project.descriptionOverride ?? "",
      ]),
    ),
  );
  const [addForm, setAddForm] = useState<AddProjectForm>({
    repoPath: "",
    section: "owned",
    descriptionOverride: "",
  });
  const [validationPreview, setValidationPreview] =
    useState<ProjectSyncPreview | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupedProjects = useMemo(
    () => ({
      owned: projects
        .filter((item) => item.project.section === "owned")
        .sort((a, b) => a.project.sortOrder - b.project.sortOrder),
      shoutout: projects
        .filter((item) => item.project.section === "shoutout")
        .sort((a, b) => a.project.sortOrder - b.project.sortOrder),
    }),
    [projects],
  );

  async function refreshProjects() {
    const response = await fetch("/api/admin/projects", { cache: "no-store" });
    const data = (await response.json()) as {
      projects?: AdminProjectItem[];
      error?: string;
    };
    if (!response.ok || !data.projects) {
      throw new Error(data.error ?? "Failed to refresh projects.");
    }

    setProjects(data.projects);
    setDrafts(
      Object.fromEntries(
        data.projects.map((item) => [
          item.project.id,
          item.project.descriptionOverride ?? "",
        ]),
      ),
    );
  }

  async function runAction(actionKey: string, callback: () => Promise<void>) {
    setBusyAction(actionKey);
    setError(null);

    try {
      await callback();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function validateRepo() {
    await runAction("validate", async () => {
      const response = await fetch("/api/admin/projects/validate-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoPath: addForm.repoPath }),
      });
      const data = (await response.json()) as {
        preview?: ProjectSyncPreview;
        error?: string;
      };
      if (!response.ok || !data.preview) {
        throw new Error(data.error ?? "Validation failed.");
      }

      setValidationPreview(data.preview);
    });
  }

  async function createProject() {
    await runAction("create", async () => {
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addForm),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not create project.");
      }

      setAddForm({
        repoPath: "",
        section: "owned",
        descriptionOverride: "",
      });
      setValidationPreview(null);
      await refreshProjects();
    });
  }

  async function patchProject(id: string, payload: Record<string, unknown>) {
    await runAction(`patch:${id}`, async () => {
      const response = await fetch(`/api/admin/projects/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not update project.");
      }

      await refreshProjects();
    });
  }

  async function deleteProject(id: string) {
    await runAction(`delete:${id}`, async () => {
      const response = await fetch(`/api/admin/projects/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete project.");
      }

      await refreshProjects();
    });
  }

  async function reorderProjects(
    section: ManagedProjectSection,
    index: number,
    direction: -1 | 1,
  ) {
    const nextItems = moveItem(groupedProjects[section], index, direction);
    if (nextItems === groupedProjects[section]) {
      return;
    }

    const ownedIds =
      section === "owned"
        ? nextItems.map((item) => item.project.id)
        : groupedProjects.owned.map((item) => item.project.id);
    const shoutoutIds =
      section === "shoutout"
        ? nextItems.map((item) => item.project.id)
        : groupedProjects.shoutout.map((item) => item.project.id);

    await runAction(`reorder:${section}`, async () => {
      const response = await fetch("/api/admin/projects/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ownedIds, shoutoutIds }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not reorder projects.");
      }

      await refreshProjects();
    });
  }

  return (
    <div className="space-y-8">
      {/* Add Project Form */}
      <div className="bg-mocha-surface space-y-6 rounded-xl p-6">
        <h2 className="highlight-text text-2xl font-bold">Add Project</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
              GitHub repo path
            </span>
            <input
              type="text"
              value={addForm.repoPath}
              onChange={(event) =>
                setAddForm((current) => ({
                  ...current,
                  repoPath: event.target.value,
                }))
              }
              placeholder="owner/name"
              className="border-mocha-overlay bg-mocha-mantle text-mocha-text placeholder:text-mocha-subtext0/50 focus:border-mocha-lavender focus:ring-mocha-lavender/30 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1"
            />
          </label>
          <label className="space-y-2">
            <span className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
              Section
            </span>
            <select
              value={addForm.section}
              onChange={(event) =>
                setAddForm((current) => ({
                  ...current,
                  section: event.target.value as ManagedProjectSection,
                }))
              }
              className="border-mocha-overlay bg-mocha-mantle text-mocha-text focus:border-mocha-lavender focus:ring-mocha-lavender/30 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1"
            >
              <option value="owned">Owned</option>
              <option value="shoutout">Shoutout</option>
            </select>
          </label>
          <label className="space-y-2 sm:col-span-2 lg:col-span-1">
            <span className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
              Description override
            </span>
            <input
              type="text"
              value={addForm.descriptionOverride}
              onChange={(event) =>
                setAddForm((current) => ({
                  ...current,
                  descriptionOverride: event.target.value,
                }))
              }
              placeholder="Leave empty to use GitHub description"
              className="border-mocha-overlay bg-mocha-mantle text-mocha-text placeholder:text-mocha-subtext0/50 focus:border-mocha-lavender focus:ring-mocha-lavender/30 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void validateRepo()}
            disabled={busyAction !== null || !addForm.repoPath.trim()}
            className="text-mocha-text bg-mocha-surface-1 hover:bg-mocha-surface-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50"
          >
            Validate
          </button>
          <button
            type="button"
            onClick={() => void createProject()}
            disabled={busyAction !== null || validationPreview?.status !== "ok"}
            className="bg-[var(--green)]/10 text-mocha-green hover:bg-[var(--green)]/20 rounded-lg border border-[var(--green)] px-5 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50"
          >
            Create
          </button>
        </div>

        {validationPreview && (
          <div className="bg-mocha-mantle rounded-lg p-4">
            {validationPreview.status === "ok" ? (
              <div className="space-y-1">
                <div className="text-mocha-text font-medium">
                  {validationPreview.repo.ownerLogin}/
                  {validationPreview.repo.name}
                </div>
                <div className="text-mocha-subtext1 flex flex-wrap gap-4 text-sm">
                  <span>Stars: {validationPreview.repo.stars}</span>
                  <span>
                    Last commit:{" "}
                    {new Date(
                      validationPreview.repo.lastCommit,
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-mocha-red text-sm">
                {validationPreview.message}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-[var(--red)]/10 text-mocha-red rounded-lg border border-[var(--red)] px-4 py-3 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Project Sections */}
      {(["owned", "shoutout"] as const).map((section) => (
        <div key={section} className="space-y-4">
          <h2 className="highlight-text text-2xl font-bold capitalize">
            {section}
          </h2>

          {groupedProjects[section].length === 0 && (
            <div className="bg-mocha-surface rounded-xl p-6">
              <p className="text-mocha-subtext0 text-sm">
                No projects in this section.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {groupedProjects[section].map((item, index) => (
              <div
                key={item.project.id}
                className="bg-mocha-surface space-y-4 rounded-xl p-6 transition-colors"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-mocha-text truncate text-lg font-semibold">
                        {item.project.repoPath}
                      </h3>
                      {item.project.isVisible ? (
                        <span className="bg-[var(--green)]/10 text-mocha-green inline-flex shrink-0 rounded-full border border-[var(--green)] px-2.5 py-0.5 text-xs font-medium">
                          visible
                        </span>
                      ) : (
                        <span className="border-mocha-overlay bg-mocha-mantle text-mocha-subtext0 inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium">
                          hidden
                        </span>
                      )}
                    </div>
                    <div className="text-mocha-subtext0 mt-1 text-xs">
                      Sort order: {item.project.sortOrder}
                    </div>
                  </div>

                  {/* Reorder + Delete */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void reorderProjects(section, index, -1)}
                      disabled={busyAction !== null || index === 0}
                      className="text-mocha-subtext1 hover:bg-mocha-surface-1 hover:text-mocha-text rounded-lg p-2 transition-all duration-200 disabled:opacity-30"
                      title="Move up"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m18 15-6-6-6 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => void reorderProjects(section, index, 1)}
                      disabled={
                        busyAction !== null ||
                        index === groupedProjects[section].length - 1
                      }
                      className="text-mocha-subtext1 hover:bg-mocha-surface-1 hover:text-mocha-text rounded-lg p-2 transition-all duration-200 disabled:opacity-30"
                      title="Move down"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    <div className="bg-mocha-overlay mx-1 h-6 w-px" />
                    <button
                      type="button"
                      onClick={() => void deleteProject(item.project.id)}
                      disabled={busyAction !== null}
                      className="text-mocha-subtext1 hover:bg-[var(--red)]/10 hover:text-mocha-red rounded-lg p-2 transition-all duration-200 disabled:opacity-30"
                      title="Delete project"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" x2="10" y1="11" y2="17" />
                        <line x1="14" x2="14" y1="11" y2="17" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Description */}
                  <div className="space-y-2">
                    <span className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
                      Description
                    </span>
                    <textarea
                      value={drafts[item.project.id] ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.project.id]: event.target.value,
                        }))
                      }
                      rows={3}
                      className="border-mocha-overlay bg-mocha-mantle text-mocha-text placeholder:text-mocha-subtext0/50 focus:border-mocha-lavender focus:ring-mocha-lavender/30 w-full resize-none rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        void patchProject(item.project.id, {
                          descriptionOverride: drafts[item.project.id] ?? "",
                        })
                      }
                      disabled={busyAction !== null}
                      className="text-mocha-text bg-mocha-surface-1 hover:bg-mocha-surface-2 rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-200 disabled:opacity-50"
                    >
                      Save description
                    </button>
                  </div>

                  {/* Preview */}
                  <div className="space-y-2">
                    <span className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
                      GitHub Preview
                    </span>
                    <div className="bg-mocha-mantle rounded-lg p-4">
                      {item.preview.status === "ok" ? (
                        <div className="space-y-2">
                          <div className="text-mocha-text font-medium">
                            {item.preview.repo.ownerLogin}/
                            {item.preview.repo.name}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-mocha-subtext0">Stars</span>
                              <p className="text-mocha-yellow">
                                {item.preview.repo.stars}
                              </p>
                            </div>
                            <div>
                              <span className="text-mocha-subtext0">
                                Language
                              </span>
                              <p className="text-mocha-blue">
                                {item.preview.repo.language || "unknown"}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-mocha-subtext0">
                                Last commit
                              </span>
                              <p className="text-mocha-subtext1">
                                {new Date(
                                  item.preview.repo.lastCommit,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-mocha-red text-sm">
                          {item.preview.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer - State Controls */}
                <div className="border-mocha-overlay/50 flex flex-wrap items-center gap-4 border-t pt-4">
                  <label className="flex items-center gap-2">
                    <span className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
                      Section
                    </span>
                    <select
                      value={item.project.section}
                      onChange={(event) =>
                        void patchProject(item.project.id, {
                          section: event.target.value,
                        })
                      }
                      className="border-mocha-overlay bg-mocha-mantle text-mocha-text focus:border-mocha-lavender rounded-lg border px-3 py-1.5 text-sm transition-colors focus:outline-none"
                    >
                      <option value="owned">Owned</option>
                      <option value="shoutout">Shoutout</option>
                    </select>
                  </label>
                  <label className="text-mocha-text flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.project.isVisible}
                      onChange={(event) =>
                        void patchProject(item.project.id, {
                          isVisible: event.target.checked,
                        })
                      }
                      className="border-mocha-overlay rounded accent-[var(--green)]"
                    />
                    Visible on public page
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
