import { requireAdminApiSession } from "~/server/admin/auth";
import { sendContactSubmissionEmail } from "~/server/contact/email";
import { getContactSubmission, updateContactSubmission } from "~/server/contact/store";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminApiSession();
  if (session instanceof Response) {
    return session;
  }

  const { id } = await context.params;
  const submission = await getContactSubmission(id);
  if (!submission) {
    return Response.json({ error: "Submission not found." }, { status: 404 });
  }

  if (submission.status !== "suppressed") {
    return Response.json({ error: "Only suppressed submissions can be approved." }, { status: 400 });
  }

  try {
    const adminReviewUrl = `${new URL(request.url).origin}/admin/contact-submissions`;
    await sendContactSubmissionEmail(submission, adminReviewUrl);
    await updateContactSubmission(id, (record) => ({
      ...record,
      status: "accepted",
      delivery: "sent",
      reviewed: true,
    }));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Approval email error:", error);
    await updateContactSubmission(id, (record) => ({
      ...record,
      delivery: "failed",
    }));

    return Response.json({ error: "Failed to send approval email." }, { status: 500 });
  }
}
