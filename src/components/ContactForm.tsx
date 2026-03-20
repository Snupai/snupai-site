"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { contactFormSchema } from "~/lib/contact-form";

const clientContactFormSchema = contactFormSchema.omit({
  formToken: true,
  renderedAt: true,
});

type ContactFormData = z.infer<typeof clientContactFormSchema>;

export default function ContactForm({
  formToken,
  renderedAt,
}: {
  formToken: string;
  renderedAt: number;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(clientContactFormSchema),
  });

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "rate-limited"
  >("idle");
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (data: ContactFormData) => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          website: data.website ?? "",
          formToken,
          renderedAt,
        }),
      });

      const responseData = (await response.json().catch(() => null)) as {
        retryAfter?: number;
        error?: string;
        code?: string;
      } | null;

      if (response.status === 429) {
        setRetryAfter(responseData?.retryAfter ?? null);
        setStatus("rate-limited");
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          responseData?.code === "refresh_required"
            ? "This form expired. Reload the page and try again."
            : (responseData?.error ?? "Failed to send message."),
        );
        throw new Error(responseData?.error ?? "Failed to send message");
      }

      reset({
        name: "",
        email: "",
        message: "",
        website: "",
      });
      setStatus("success");
    } catch (error) {
      console.error("Contact form error:", error);
      if (status !== "rate-limited") {
        setStatus("error");
      }
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  if (status === "success") {
    return (
      <div className="bg-mocha-mantle space-y-4 rounded-xl p-8 text-center">
        <div className="text-6xl">✉️</div>
        <h3 className="text-mocha-green text-2xl font-bold">
          Thanks for contacting me!
        </h3>
        <p className="text-mocha-subtext1">
          I&apos;ll get back to you as soon as possible.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5">
      {/* Honeypot */}
      <div
        className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          autoComplete="off"
          tabIndex={-1}
          {...register("website")}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="contact-name"
          className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider"
        >
          Name
        </label>
        <input
          id="contact-name"
          type="text"
          placeholder="Your name"
          {...register("name")}
          className="border-mocha bg-mocha-mantle text-mocha-text placeholder:text-mocha-subtext0/50 focus:border-mocha-lavender focus:ring-mocha-lavender/30 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1"
        />
        {errors.name && (
          <p className="text-mocha-red text-xs">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="contact-email"
          className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider"
        >
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          placeholder="your@email.com"
          {...register("email")}
          className="border-mocha bg-mocha-mantle text-mocha-text placeholder:text-mocha-subtext0/50 focus:border-mocha-lavender focus:ring-mocha-lavender/30 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1"
        />
        {errors.email && (
          <p className="text-mocha-red text-xs">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="contact-message"
          className="text-mocha-subtext0 text-xs font-medium uppercase tracking-wider"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          placeholder="What's on your mind?"
          {...register("message")}
          className="border-mocha bg-mocha-mantle text-mocha-text placeholder:text-mocha-subtext0/50 focus:border-mocha-lavender focus:ring-mocha-lavender/30 min-h-[150px] w-full resize-y rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1"
        />
        {errors.message && (
          <p className="text-mocha-red text-xs">{errors.message.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="bg-mocha-surface-1 text-mocha-text hover:bg-mocha-surface-2 w-full rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50"
      >
        {status === "loading" ? "Sending..." : "Send Message"}
      </button>

      {status === "rate-limited" && (
        <div className="bg-[var(--yellow)]/10 text-mocha-yellow rounded-lg border border-[var(--yellow)] px-4 py-3 text-center text-sm">
          Too many messages sent. Please try again in {retryAfter} minutes.
        </div>
      )}

      {status === "error" && (
        <div className="bg-[var(--red)]/10 text-mocha-red rounded-lg border border-[var(--red)] px-4 py-3 text-center text-sm">
          {errorMessage ?? "Failed to send message. Please try again."}
        </div>
      )}
    </form>
  );
}
