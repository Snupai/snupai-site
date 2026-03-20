import { z } from "zod";
import { requireAdminApiSession } from "~/server/admin/auth";
import { deleteContactBan, setContactBan, updateContactSubmission } from "~/server/contact/store";

const createBanSchema = z.object({
  ip: z.string().min(1),
  reason: z.string().trim().min(1).max(200).optional(),
  submissionId: z.string().uuid().optional(),
});

const deleteBanSchema = z.object({
  ip: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await requireAdminApiSession();
  if (session instanceof Response) {
    return session;
  }

  const parsed = createBanSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid ban payload." }, { status: 400 });
  }

  await setContactBan({
    ip: parsed.data.ip,
    createdAt: new Date().toISOString(),
    reason: parsed.data.reason ?? "Manual admin ban",
    sourceSubmissionId: parsed.data.submissionId ?? null,
  });

  if (parsed.data.submissionId) {
    await updateContactSubmission(parsed.data.submissionId, (record) => ({
      ...record,
      reviewed: true,
    }));
  }

  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await requireAdminApiSession();
  if (session instanceof Response) {
    return session;
  }

  const parsed = deleteBanSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid unban payload." }, { status: 400 });
  }

  await deleteContactBan(parsed.data.ip);
  return Response.json({ success: true });
}
