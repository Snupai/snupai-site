'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function ContactForm() {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema)
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'rate-limited'>('idle');
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const onSubmit = async (data: ContactFormData) => {
    setStatus('loading');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.status === 429) {
        const responseData = await response.json() as { retryAfter: number };
        setRetryAfter(responseData.retryAfter);
        setStatus('rate-limited');
        return;
      }

      if (!response.ok) throw new Error('Failed to send message');
      
      reset(); // Clear the form
      setStatus('success');
    } catch (error) {
      console.error('Contact form error:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const inputClasses = "w-full p-2 rounded-lg bg-mocha-surface border border-mocha-overlay0 focus:border-mocha-lavender focus:outline-none focus:ring-1 focus:ring-mocha-lavender transition-colors";
  const errorClasses = "text-sm text-mocha-red mt-1";

  if (status === 'success') {
    return (
      <div className="text-center space-y-4 p-8 bg-mocha-surface rounded-lg">
        <div className="text-6xl mb-4">✉️</div>
        <h3 className="text-2xl font-bold text-mocha-green">Thanks for contacting me!</h3>
        <p className="text-mocha-text">I&apos;ll get back to you as soon as possible.</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full max-w-md mx-auto">
        <div>
          <input
            type="text"
            placeholder="Name"
            {...register('name')}
            className={inputClasses}
          />
          {errors.name && <p className={errorClasses}>{errors.name.message}</p>}
        </div>

        <div>
          <input
            type="email"
            placeholder="Email"
            {...register('email')}
            className={inputClasses}
          />
          {errors.email && <p className={errorClasses}>{errors.email.message}</p>}
        </div>

        <div>
          <textarea
            placeholder="Message"
            {...register('message')}
            className={`${inputClasses} min-h-[150px] resize-y`}
          />
          {errors.message && <p className={errorClasses}>{errors.message.message}</p>}
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full py-2 px-4 bg-mocha-surface hover:bg-mocha-surface-1 text-mocha-text rounded-lg border border-mocha-overlay0 transition-colors disabled:opacity-50"
        >
          {status === 'loading' ? 'Sending...' : 'Send Message'}
        </button>

        {status === 'rate-limited' && (
          <p className="text-mocha-red text-center">
            Too many messages sent. Please try again in {retryAfter} minutes.
          </p>
        )}
        
        {status === 'error' && (
          <p className="text-mocha-red text-center">
            Failed to send message. Please try again.
          </p>
        )}
      </form>
    </div>
  );
} 