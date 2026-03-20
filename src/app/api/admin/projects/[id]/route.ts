import { z } from "zod";
import { requireAdminApiSession } from "~/server/admin/auth";
import { deleteManagedProject, updateManagedProject } from "~/server/projects/store";

const updateProjectSchema = z.object({
  repoPath: z.string().trim().min(1).optional(),
  section: z.enum(["owned", "shoutout"]).optional(),
  descriptionOverride: z.string().optional(),
  isVisible: z.boolean().optional(),
  homepageOverride: z.string().optional(),
  titleOverride: z.string().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminApiSession();
  if (session instanceof Response) {
    return session;
  }

  const parsed = updateProjectSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid update payload." }, { status: 400 });
  }

  const { id } = await context.params;

  try {
    const project = await updateManagedProject(id, parsed.data);
    return Response.json({ project });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not update project." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminApiSession();
  if (session instanceof Response) {
    return session;
  }

  const { id } = await context.params;
  const deleted = await deleteManagedProject(id);
  if (!deleted) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  return Response.json({ success: true });
}
