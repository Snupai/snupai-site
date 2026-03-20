import { z } from "zod";

export const CONTACT_RENDER_MIN_MS = 3_000;
export const CONTACT_RENDER_MAX_AGE_MS = 2 * 60 * 60 * 1000;

function hasMinimumWords(message: string) {
  return message
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length >= 3;
}

function hasMinimumAlphabeticCharacters(message: string) {
  const matches = message.match(/[A-Za-z]/g);
  return (matches?.length ?? 0) >= 10;
}

export const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name must be 80 characters or fewer"),
  email: z.string().trim().email("Invalid email address").max(254, "Email must be 254 characters or fewer"),
  message: z.string()
    .trim()
    .min(20, "Message must be at least 20 characters")
    .max(2000, "Message must be 2000 characters or fewer")
    .refine(hasMinimumWords, "Message must contain at least 3 words")
    .refine(hasMinimumAlphabeticCharacters, "Message must contain at least 10 letters"),
  website: z.string().max(200).optional().transform((value) => value?.trim() ?? ""),
  formToken: z.string().min(1, "Missing form token").max(512, "Invalid form token"),
  renderedAt: z.number().int().positive("Missing render timestamp"),
});

export type ContactFormPayload = z.infer<typeof contactFormSchema>;
