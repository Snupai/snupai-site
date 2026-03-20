import { z } from "zod";
import { requireAdminApiSession } from "~/server/admin/auth";
import { validateGitHubRepo } from "~/server/projects/github";

const validateRepoSchema = z.object({
  repoPath: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const session = await requireAdminApiSession();
  if (session instanceof Response) {
    return session;
  }

  const parsed = validateRepoSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid repo payload." }, { status: 400 });
  }

  const preview = await validateGitHubRepo(parsed.data.repoPath, 0);
  return Response.json({ preview });
}
