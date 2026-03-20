import nodemailer from "nodemailer";
import { env } from "~/env";
import type { ContactSubmissionRecord } from "~/server/contact/types";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2",
  },
});

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendContactSubmissionEmail(record: ContactSubmissionRecord, adminReviewUrl: string) {
  const safeName = escapeHtml(record.name);
  const safeEmail = escapeHtml(record.email);
  const safeMessage = escapeHtml(record.message).replace(/\n/g, "<br>");
  const safeUserAgent = escapeHtml(record.userAgent ?? "unknown");
  const safeOrigin = escapeHtml(record.origin ?? "unknown");
  const safeReferer = escapeHtml(record.referer ?? "unknown");
  const safeCountry = escapeHtml(record.country ?? "unknown");
  const safeReviewUrl = escapeHtml(adminReviewUrl);

  await transporter.sendMail({
    from: `"Contact Form" <${env.SMTP_USER}>`,
    to: env.SMTP_TO_ADDRESS,
    replyTo: record.email,
    subject: `New Contact Form Submission from ${record.name}`,
    text: [
      "New Contact Form Submission",
      "",
      `Name: ${record.name}`,
      `Email: ${record.email}`,
      "",
      "Message:",
      record.message,
      "",
      "Moderation metadata:",
      `Submission ID: ${record.id}`,
      `IP: ${record.ip}`,
      `Country: ${record.country ?? "unknown"}`,
      `User-Agent: ${record.userAgent ?? "unknown"}`,
      `Origin: ${record.origin ?? "unknown"}`,
      `Referer: ${record.referer ?? "unknown"}`,
      `Review: ${adminReviewUrl}`,
    ].join("\n"),
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Message:</strong></p>
      <p>${safeMessage}</p>
      <hr>
      <p><strong>Submission ID:</strong> ${record.id}</p>
      <p><strong>IP:</strong> ${record.ip}</p>
      <p><strong>Country:</strong> ${safeCountry}</p>
      <p><strong>User-Agent:</strong> ${safeUserAgent}</p>
      <p><strong>Origin:</strong> ${safeOrigin}</p>
      <p><strong>Referer:</strong> ${safeReferer}</p>
      <p><a href="${safeReviewUrl}">Open moderation view</a></p>
    `,
  });
}
