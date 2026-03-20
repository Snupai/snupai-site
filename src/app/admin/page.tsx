import Link from "next/link";
import { listRecentContactSubmissions } from "~/server/contact/store";
import { listManagedProjects } from "~/server/projects/store";

export default async function AdminPage() {
  const [submissions, projects] = await Promise.all([
    listRecentContactSubmissions(50),
    listManagedProjects(),
  ]);

  const blockedCount = submissions.filter(
    (submission) => submission.status === "blocked",
  ).length;
  const suppressedCount = submissions.filter(
    (submission) => submission.status === "suppressed",
  ).length;
  const acceptedCount = submissions.filter(
    (submission) => submission.status === "accepted",
  ).length;
  const visibleProjects = projects.filter(
    (project) => project.isVisible,
  ).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      {/* Contact Moderation Card */}
      <div className="bg-mocha-surface space-y-6 rounded-xl p-6">
        <div className="space-y-1">
          <h2 className="highlight-text text-2xl font-bold">
            Contact Moderation
          </h2>
          <p className="text-mocha-subtext0 text-sm">
            Recent attempts are stored for 30 days with IP and request metadata.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="bg-mocha-mantle space-y-1 rounded-lg p-4">
            <div className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
              Accepted
            </div>
            <div className="text-mocha-green text-3xl font-bold">
              {acceptedCount}
            </div>
          </div>
          <div className="bg-mocha-mantle space-y-1 rounded-lg p-4">
            <div className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
              Suppressed
            </div>
            <div className="text-mocha-yellow text-3xl font-bold">
              {suppressedCount}
            </div>
          </div>
          <div className="bg-mocha-mantle space-y-1 rounded-lg p-4">
            <div className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
              Blocked
            </div>
            <div className="text-mocha-red text-3xl font-bold">
              {blockedCount}
            </div>
          </div>
        </div>

        <Link
          href="/admin/contact-submissions"
          className="highlight-text inline-flex items-center gap-1 text-sm font-medium"
        >
          Open moderation queue <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {/* Projects Card */}
      <div className="bg-mocha-surface space-y-6 rounded-xl p-6">
        <div className="space-y-1">
          <h2 className="highlight-text text-2xl font-bold">Projects</h2>
          <p className="text-mocha-subtext0 text-sm">
            Public project content from Redis-backed records.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="bg-mocha-mantle space-y-1 rounded-lg p-4">
            <div className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
              Managed entries
            </div>
            <div className="text-mocha-text text-3xl font-bold">
              {projects.length}
            </div>
          </div>
          <div className="bg-mocha-mantle space-y-1 rounded-lg p-4">
            <div className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider">
              Visible
            </div>
            <div className="text-mocha-blue text-3xl font-bold">
              {visibleProjects}
            </div>
          </div>
        </div>

        <Link
          href="/admin/projects"
          className="highlight-text inline-flex items-center gap-1 text-sm font-medium"
        >
          Open project manager <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
