import ContactModerationPanel from "~/components/admin/ContactModerationPanel";
import { requireAdminSession } from "~/server/admin/auth";
import { getContactBan, listRecentContactSubmissions } from "~/server/contact/store";

export default async function AdminContactSubmissionsPage() {
  await requireAdminSession("/admin/contact-submissions");

  const submissions = await listRecentContactSubmissions(100);
  const submissionsWithBans = await Promise.all(submissions.map(async (submission) => ({
    ...submission,
    isIpBanned: (await getContactBan(submission.ip)) !== null,
  })));

  return <ContactModerationPanel initialSubmissions={submissionsWithBans} />;
}
