import { redis } from "~/server/redis";
import type { ContactBanRecord, ContactSubmissionRecord } from "~/server/contact/types";

const CONTACT_SUBMISSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const CONTACT_RECENT_KEY = "contact:recent";
const CONTACT_RECENT_LIMIT = 200;

function getContactSubmissionKey(id: string) {
  return `contact:submission:${id}`;
}

function getContactBanKey(ip: string) {
  return `contact:ban:ip:${ip}`;
}

export async function storeContactSubmission(record: ContactSubmissionRecord) {
  await redis.set(getContactSubmissionKey(record.id), record, { ex: CONTACT_SUBMISSION_TTL_SECONDS });
  await redis.lpush(CONTACT_RECENT_KEY, record.id);
  await redis.ltrim(CONTACT_RECENT_KEY, 0, CONTACT_RECENT_LIMIT - 1);
}

export async function updateContactSubmission(
  id: string,
  updater: (record: ContactSubmissionRecord) => ContactSubmissionRecord,
) {
  const existing = await getContactSubmission(id);
  if (!existing) {
    return null;
  }

  const updated = updater(existing);
  await redis.set(getContactSubmissionKey(id), updated, { ex: CONTACT_SUBMISSION_TTL_SECONDS });
  return updated;
}

export async function getContactSubmission(id: string) {
  return await redis.get<ContactSubmissionRecord>(getContactSubmissionKey(id));
}

export async function listRecentContactSubmissions(limit = 100) {
  const ids = await redis.lrange<string>(CONTACT_RECENT_KEY, 0, Math.max(0, limit - 1));
  const records = await Promise.all(ids.map((id) => getContactSubmission(id)));
  return records.filter((record): record is ContactSubmissionRecord => record !== null);
}

export async function getContactBan(ip: string) {
  return await redis.get<ContactBanRecord>(getContactBanKey(ip));
}

export async function setContactBan(record: ContactBanRecord) {
  await redis.set(getContactBanKey(record.ip), record);
}

export async function deleteContactBan(ip: string) {
  await redis.del(getContactBanKey(ip));
}

export async function isContactIpBanned(ip: string) {
  return (await getContactBan(ip)) !== null;
}
