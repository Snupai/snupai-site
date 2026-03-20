import { z } from "zod";
import { requireAdminApiSession } from "~/server/admin/auth";
import { validateGitHubRepo } from "~/server/projects/github";
import { createManagedProject, listResolvedProjectsForAdmin } from "~/server/projects/store";

const createProjectSchema = z.object({
  repoPath: z.string().trim().min(1),
  section: z.enum(["owned", "shoutout"]),
  descriptionOverride: z.string().optional(),
});

export async function GET() {
  const session = await requireAdminApiSession();
  if (session instanceof Response) {
    return session;
  }

  return Response.json({ projects: await listResolvedProjectsForAdmin() });
}

export async function POST(request: Request) {
  const session = await requireAdminApiSession();
  if (session instanceof Response) {
    return session;
  }

  const parsed = createProjectSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid project payload." }, { status: 400 });
  }

  const preview = await validateGitHubRepo(parsed.data.repoPath, 0);
  if (preview.status !== "ok") {
    return Response.json({ error: preview.message }, { status: 400 });
  }

  const project = await createManagedProject(parsed.data);
  return Response.json({ project });
}
