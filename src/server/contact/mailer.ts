import type { ContactRequestMetadata } from "~/server/contact/types";
import { sendContactSubmissionEmail } from "~/server/contact/email";

export async function sendContactNotification({
  name,
  email,
  message,
  metadata,
  submissionId,
  adminReviewUrl,
}: {
  name: string;
  email: string;
  message: string;
  metadata: ContactRequestMetadata;
  submissionId: string;
  adminReviewUrl: string;
  approvedFromSuppression?: boolean;
}) {
  await sendContactSubmissionEmail(
    {
      id: submissionId,
      createdAt: new Date().toISOString(),
      status: "accepted",
      reasons: [],
      name,
      email,
      message,
      ip: metadata.ip,
      country: metadata.country,
      userAgent: metadata.userAgent,
      origin: metadata.origin,
      referer: metadata.referer,
      delivery: "not_sent",
      reviewed: false,
    },
    adminReviewUrl,
  );
}
