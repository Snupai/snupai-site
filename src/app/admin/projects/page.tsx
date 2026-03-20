import ProjectsAdminPanel from "~/components/admin/ProjectsAdminPanel";
import { requireAdminSession } from "~/server/admin/auth";
import { listResolvedProjectsForAdmin } from "~/server/projects/store";

export default async function AdminProjectsPage() {
  await requireAdminSession("/admin/projects");
  const projects = await listResolvedProjectsForAdmin();

  return <ProjectsAdminPanel initialProjects={projects} />;
}
