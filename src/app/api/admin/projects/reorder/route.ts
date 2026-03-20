import { z } from "zod";
import { requireAdminApiSession } from "~/server/admin/auth";
import { reorderManagedProjects } from "~/server/projects/store";

const reorderSchema = z.object({
  ownedIds: z.array(z.string().uuid()),
  shoutoutIds: z.array(z.string().uuid()),
});

export async function POST(request: Request) {
  const session = await requireAdminApiSession();
  if (session instanceof Response) {
    return session;
  }

  const parsed = reorderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid reorder payload." }, { status: 400 });
  }

  await reorderManagedProjects(parsed.data);
  return Response.json({ success: true });
}
