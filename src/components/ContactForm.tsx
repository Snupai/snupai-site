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
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      setStatus('submitting');
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to send message');

      setStatus('success');
      reset();
    } catch (error) {
      console.error('Contact form error:', error);
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Name
        </label>
        <input
          {...register('name')}
          type="text"
          id="name"
          className="w-full px-4 py-2 rounded-lg bg-mocha-surface text-mocha-text"
          disabled={status === 'submitting'}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-mocha-red">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email
        </label>
        <input
          {...register('email')}
          type="email"
          id="email"
          className="w-full px-4 py-2 rounded-lg bg-mocha-surface text-mocha-text"
          disabled={status === 'submitting'}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-mocha-red">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-2">
          Message
        </label>
        <textarea
          {...register('message')}
          id="message"
          rows={4}
          className="w-full px-4 py-2 rounded-lg bg-mocha-surface text-mocha-text"
          disabled={status === 'submitting'}
        />
        {errors.message && (
          <p className="mt-1 text-sm text-mocha-red">{errors.message.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full px-4 py-2 rounded-lg bg-mocha-mauve hover:bg-mocha-pink transition-colors disabled:opacity-50"
      >
        {status === 'submitting' ? 'Sending...' : 'Send Message'}
      </button>

      {status === 'success' && (
        <p className="text-mocha-green text-center">Message sent successfully!</p>
      )}
      {status === 'error' && (
        <p className="text-mocha-red text-center">Failed to send message. Please try again.</p>
      )}
    </form>
  );
} 