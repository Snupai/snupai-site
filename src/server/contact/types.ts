export type ContactSubmissionStatus = "accepted" | "suppressed" | "blocked";

export type ContactSubmissionReason =
  | "honeypot_filled"
  | "form_token_invalid"
  | "form_token_expired"
  | "submitted_too_fast"
  | "ip_banned"
  | "rate_limited_10m"
  | "rate_limited_24h";

export type ContactDeliveryStatus = "not_sent" | "sent" | "failed";

export type ContactSubmissionRecord = {
  id: string;
  createdAt: string;
  status: ContactSubmissionStatus;
  reasons: ContactSubmissionReason[];
  name: string;
  email: string;
  message: string;
  ip: string;
  country: string | null;
  userAgent: string | null;
  origin: string | null;
  referer: string | null;
  delivery: ContactDeliveryStatus;
  reviewed: boolean;
};

export type ContactBanRecord = {
  ip: string;
  createdAt: string;
  reason: string;
  sourceSubmissionId: string | null;
};

export type ContactAttemptMetadata = {
  ip: string;
  country: string | null;
  userAgent: string | null;
  origin: string | null;
  referer: string | null;
  createdAt: string;
};

export type ContactRequestMetadata = ContactAttemptMetadata;
