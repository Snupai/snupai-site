import { type NextRequest } from "next/server";
import { contactFormSchema } from "~/lib/contact-form";
import { sendContactSubmissionEmail } from "~/server/contact/email";
import {
  buildContactSubmissionRecord,
  classifyContactAttempt,
  getContactAttemptMetadata,
} from "~/server/contact/security";
import { storeContactSubmission, updateContactSubmission } from "~/server/contact/store";

function hasReason(reasons: string[], reason: string) {
  return reasons.includes(reason);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = contactFormSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid form data" },
        { status: 400 },
      );
    }

    const metadata = getContactAttemptMetadata(request);
    const classification = await classifyContactAttempt(parsed.data, metadata);
    const submission = buildContactSubmissionRecord(parsed.data, metadata, classification.status, classification.reasons);

    await storeContactSubmission(submission);

    if (classification.status === "accepted") {
      try {
        const adminReviewUrl = `${new URL(request.url).origin}/admin/contact-submissions`;
        await sendContactSubmissionEmail(submission, adminReviewUrl);
        await updateContactSubmission(submission.id, (record) => ({
          ...record,
          delivery: "sent",
        }));

        return Response.json({ success: true });
      } catch (emailError) {
        console.error("Email sending error:", emailError);
        await updateContactSubmission(submission.id, (record) => ({
          ...record,
          delivery: "failed",
        }));

        if (
          typeof emailError === "object"
          && emailError !== null
          && "responseCode" in emailError
          && emailError.responseCode === 450
        ) {
          return Response.json(
            { error: "Email service temporarily unavailable. Please try again later." },
            { status: 503 },
          );
        }

        throw emailError;
      }
    }

    if (classification.status === "suppressed") {
      return Response.json({ success: true });
    }

    if (
      hasReason(classification.reasons, "rate_limited_10m")
      || hasReason(classification.reasons, "rate_limited_24h")
    ) {
      return Response.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil(classification.retryAfterSeconds / 60),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(classification.retryAfterSeconds),
          },
        },
      );
    }

    if (
      hasReason(classification.reasons, "form_token_invalid")
      || hasReason(classification.reasons, "form_token_expired")
    ) {
      return Response.json(
        {
          error: "This contact form has expired. Please refresh the page and try again.",
          code: "refresh_required",
        },
        { status: 400 },
      );
    }

    return Response.json(
      { error: "This request was blocked." },
      { status: 403 },
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return Response.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 },
    );
  }
}
