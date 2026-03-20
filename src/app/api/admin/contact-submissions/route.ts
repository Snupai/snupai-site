import { requireAdminApiSession } from "~/server/admin/auth";
import { getContactBan, listRecentContactSubmissions } from "~/server/contact/store";

export async function GET() {
  const session = await requireAdminApiSession();
  if (session instanceof Response) {
    return session;
  }

  const submissions = await listRecentContactSubmissions(100);
  const hydrated = await Promise.all(submissions.map(async (submission) => ({
    ...submission,
    isIpBanned: (await getContactBan(submission.ip)) !== null,
  })));

  return Response.json({ submissions: hydrated });
}
