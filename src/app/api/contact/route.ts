import { type NextRequest } from "next/server";
import nodemailer, { type TransportOptions } from "nodemailer";
import { z } from "zod";
import { env } from "../../../env.js";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

// Define the transport config type
type SMTPTransport = TransportOptions & {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  authMethod: string;
  tls: {
    rejectUnauthorized: boolean;
    minVersion: string;
  };
  debug: boolean;
  logger: boolean;
};

// Create the transport config
const transportConfig: SMTPTransport = {
  host: "smtp.ionos.de",
  port: 587,
  secure: false,
  auth: {
    user: "contact@snupai.me",
    pass: env.SMTP_PASS
  },
  authMethod: 'PLAIN',
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  debug: true,
  logger: true
};

const transporter = nodemailer.createTransport(transportConfig);

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

    await transporter.sendMail({
      from: `"Contact Form" <${env.SMTP_USER}>`,
      to: "nya@snupai.me",
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
  } catch (error) {
    console.error('Contact form error:', error);
    return Response.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
} 