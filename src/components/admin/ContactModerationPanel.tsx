"use client";

import { useMemo, useState } from "react";
import type { ContactSubmissionRecord } from "~/server/contact/types";

type AdminSubmission = ContactSubmissionRecord & {
  isIpBanned: boolean;
};

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "accepted"
      ? "border-[var(--green)] bg-[var(--green)]/10 text-mocha-green"
      : status === "suppressed"
        ? "border-[var(--yellow)] bg-[var(--yellow)]/10 text-mocha-yellow"
        : "border-[var(--red)] bg-[var(--red)]/10 text-mocha-red";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      {status}
    </span>
  );
}

export default function ContactModerationPanel({
  initialSubmissions,
}: {
  initialSubmissions: AdminSubmission[];
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSubmissions[0]?.id ?? null,
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSubmission = useMemo(
    () =>
      submissions.find((submission) => submission.id === selectedId) ??
      submissions[0] ??
      null,
    [selectedId, submissions],
  );

  async function refreshSubmissions() {
    const response = await fetch("/api/admin/contact-submissions", {
      cache: "no-store",
    });
    const data = (await response.json()) as {
      submissions?: AdminSubmission[];
      error?: string;
    };
    if (!response.ok || !data.submissions) {
      throw new Error(data.error ?? "Failed to refresh submissions.");
    }

    const nextSubmissions = data.submissions;
    setSubmissions(nextSubmissions);
    setSelectedId((current) =>
      nextSubmissions.some((submission) => submission.id === current)
        ? current
        : (nextSubmissions[0]?.id ?? null),
    );
  }

  async function runAction(actionKey: string, callback: () => Promise<void>) {
    setBusyAction(actionKey);
    setError(null);

    try {
      await callback();
      await refreshSubmissions();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function approveSubmission(id: string) {
    await runAction(`approve:${id}`, async () => {
      const response = await fetch(
        `/api/admin/contact-submissions/${id}/approve`,
        {
          method: "POST",
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Approval failed.");
      }
    });
  }

  async function banIp(ip: string, submissionId: string) {
    await runAction(`ban:${ip}`, async () => {
      const response = await fetch("/api/admin/contact-bans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ip,
          submissionId,
          reason: "Manual ban from moderation dashboard",
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Ban request failed.");
      }
    });
  }

  async function unbanIp(ip: string) {
    await runAction(`unban:${ip}`, async () => {
      const response = await fetch("/api/admin/contact-bans", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ip }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unban request failed.");
      }
    });
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      {/* Submissions List */}
      <div className="bg-mocha-surface space-y-4 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="highlight-text text-2xl font-bold">
              Recent Submissions
            </h2>
            <p className="text-mocha-subtext0 mt-1 text-sm">
              {submissions.length} stored attempts
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runAction("refresh", refreshSubmissions)}
            disabled={busyAction !== null}
            className="text-mocha-subtext1 hover:bg-mocha-surface-1 hover:text-mocha-text rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
          {submissions.map((submission) => (
            <button
              key={submission.id}
              type="button"
              onClick={() => setSelectedId(submission.id)}
              className={`w-full rounded-lg p-4 text-left transition-all duration-200 ${
                selectedSubmission?.id === submission.id
                  ? "bg-mocha-surface-1 ring-mocha-lavender/30 ring-1"
                  : "bg-mocha-mantle hover:bg-mocha-surface-1"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-mocha-text truncate font-medium">
                      {submission.name}
                    </span>
                    <StatusBadge status={submission.status} />
                  </div>
                  <div className="text-mocha-subtext0 mt-1 truncate text-sm">
                    {submission.email}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-mocha-subtext0 text-xs">
                    {new Date(submission.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-mocha-subtext0 mt-0.5 text-xs">
                    {submission.ip}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="bg-mocha-surface space-y-4 rounded-xl p-6">
        <h2 className="highlight-text text-2xl font-bold">
          Submission Details
        </h2>

        {error && (
          <div className="bg-[var(--red)]/10 text-mocha-red rounded-lg border border-[var(--red)] px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!selectedSubmission && (
          <p className="text-mocha-subtext0 text-sm">
            No submissions available.
          </p>
        )}

        {selectedSubmission && (
          <div className="space-y-4">
            {/* Info Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="bg-mocha-mantle space-y-1 rounded-lg p-3">
                <div className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
                  Submission ID
                </div>
                <div className="text-mocha-text break-all text-sm">
                  {selectedSubmission.id}
                </div>
              </div>
              <div className="bg-mocha-mantle space-y-1 rounded-lg p-3">
                <div className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
                  Delivery
                </div>
                <div className="text-mocha-text text-sm">
                  {selectedSubmission.delivery}
                </div>
              </div>
              <div className="bg-mocha-mantle space-y-1 rounded-lg p-3">
                <div className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
                  IP / Country
                </div>
                <div className="text-mocha-text text-sm">
                  {selectedSubmission.ip}
                  {selectedSubmission.country
                    ? ` (${selectedSubmission.country})`
                    : ""}
                </div>
              </div>
              <div className="bg-mocha-mantle space-y-1 rounded-lg p-3">
                <div className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
                  Reasons
                </div>
                <div className="text-mocha-text text-sm">
                  {selectedSubmission.reasons.length > 0
                    ? selectedSubmission.reasons.join(", ")
                    : "none"}
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="bg-mocha-mantle space-y-2 rounded-lg p-4">
              <div className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
                Message
              </div>
              <p className="text-mocha-text whitespace-pre-wrap text-sm leading-relaxed">
                {selectedSubmission.message}
              </p>
            </div>

            {/* Metadata */}
            <div className="bg-mocha-mantle space-y-2 rounded-lg p-4 text-sm">
              <div>
                <span className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
                  User-Agent
                </span>
                <p className="text-mocha-subtext1 mt-0.5 break-all">
                  {selectedSubmission.userAgent ?? "unknown"}
                </p>
              </div>
              <div>
                <span className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
                  Origin
                </span>
                <p className="text-mocha-subtext1 mt-0.5">
                  {selectedSubmission.origin ?? "unknown"}
                </p>
              </div>
              <div>
                <span className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
                  Referer
                </span>
                <p className="text-mocha-subtext1 mt-0.5">
                  {selectedSubmission.referer ?? "unknown"}
                </p>
              </div>
              <div>
                <span className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
                  Reviewed
                </span>
                <p className="text-mocha-subtext1 mt-0.5">
                  {selectedSubmission.reviewed ? "yes" : "no"}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              {selectedSubmission.status === "suppressed" && (
                <button
                  type="button"
                  onClick={() => void approveSubmission(selectedSubmission.id)}
                  disabled={busyAction !== null}
                  className="bg-[var(--green)]/10 text-mocha-green hover:bg-[var(--green)]/20 rounded-lg border border-[var(--green)] px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                >
                  Approve and email
                </button>
              )}
              {!selectedSubmission.isIpBanned ? (
                <button
                  type="button"
                  onClick={() =>
                    void banIp(selectedSubmission.ip, selectedSubmission.id)
                  }
                  disabled={busyAction !== null}
                  className="bg-[var(--red)]/10 text-mocha-red hover:bg-[var(--red)]/20 rounded-lg border border-[var(--red)] px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                >
                  Ban IP
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void unbanIp(selectedSubmission.ip)}
                  disabled={busyAction !== null}
                  className="bg-[var(--yellow)]/10 text-mocha-yellow hover:bg-[var(--yellow)]/20 rounded-lg border border-[var(--yellow)] px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                >
                  Unban IP
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
