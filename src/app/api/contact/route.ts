import { type NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";
import { env } from "@/env.js";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

// Create the transport config
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  }
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const result = contactFormSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Invalid form data" },
        { status: 400 }
      );
    }

    const { name, email, message } = result.data;

    try {
      await transporter.sendMail({
        from: `"Contact Form" <${env.SMTP_USER}>`,
        to: env.SMTP_TO_ADDRESS,
        subject: `New Contact Form Submission from ${name}`,
        text: `
Name: ${name}
Email: ${email}

Message:
${message}
        `,
        html: `
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<br>
<p><strong>Message:</strong></p>
<p>${message.replace(/\n/g, '<br>')}</p>
        `,
      });

      return Response.json({ success: true });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // Check for rate limit or quota exceeded
      if (typeof emailError === 'object' && 
          emailError !== null && 
          'responseCode' in emailError && 
          emailError.responseCode === 450) {
        return Response.json(
          { error: "Email service temporarily unavailable. Please try again later." },
          { status: 503 }
        );
      }

      throw emailError; // Re-throw for general error handling
    }
  } catch (error) {
    console.error('Contact form error:', error);
    return Response.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
} 