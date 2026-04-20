'use client';

import {
  getSupportMessages,
  sendSupportMessage,
} from '@/src/service/api/userService';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  HelpCircle,
  Mail,
  MessageSquare,
  Shield,
  Bug,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all';

const FAQS = [
  {
    question: 'How does automated posting work?',
    answer:
      'You select festival events, and our system automatically generates and schedules posts using AI, including your business branding.',
  },
  {
    question: 'How many times can I regenerate an image?',
    answer:
      'Each scheduled event allows 2 image regenerations after the original is generated.',
  },
  {
    question: 'What is the credit system?',
    answer:
      'Credits unlock on-demand actions: product advert posts (4 credits), instant generation posts (2), festive posts (2), and regeneration posts (1). Your plan includes a monthly credit allowance; add-on packs are valid for 30 days. Daily automated posting does not use this balance.',
  },
  {
    question: 'How do I update my profile information?',
    answer:
      'You can edit your profile under the Account Settings section in the menu.',
  },
];

const LEGAL_LINKS = [
  {
    label: 'Privacy Policy',
    href: '/legal/privacy',
    description: 'How we collect and use your data.',
  },
  {
    label: 'Terms of Service',
    href: '/legal/terms',
    description: 'Terms governing use of SocioGenie.',
  },
  {
    label: 'Refund Policy',
    href: '/legal/refund',
    description: 'Eligibility and process for refunds.',
  },
];

export default function SupportAndLegalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0); // Default open first
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [contactSending, setContactSending] = useState(false);
  const [bugForm, setBugForm] = useState({ subject: '', description: '' });
  const [bugSending, setBugSending] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error('Please fill all fields.');
      return;
    }
    setContactSending(true);
    try {
      await sendSupportMessage(
        contactForm.name,
        contactForm.email,
        contactForm.message
      );
      setContactForm({ name: '', email: '', message: '' });
      toast.success('Message sent successfully.');
    } catch (err: any) {
      toast.error(err.response.data.message || 'Failed to send message.');
    } finally {
      setContactSending(false);
    }
  };

  const handleBugSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugForm.subject || !bugForm.description) {
      toast.error('Please fill subject and description.');
      return;
    }
    setBugSending(true);
    try {
      await sendSupportMessage(
        user?.displayName || user?.email || 'User',
        user?.email || '',
        `[BUG] ${bugForm.subject}\n\n${bugForm.description}`
      );
      setBugForm({ subject: '', description: '' });
      toast.success('Bug report submitted successfully.');
    } catch (err: any) {
      toast.error(err.response.data.message || 'Failed to submit report.');
    } finally {
      setBugSending(false);
    }
  };

  if (loading) return null;
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Support & Legal
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Get help with your account, report issues, and read our policies.
        </p>
      </div>

      <div className="space-y-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact Support */}
          <section className="glass-card rounded-3xl p-6 sm:p-8 h-fit">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Mail className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Contact Us
              </h2>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Your full name"
                value={contactForm.name}
                onChange={(e) =>
                  setContactForm((p) => ({ ...p, name: e.target.value }))
                }
                className={inputBase}
              />
              <input
                type="email"
                placeholder="Email address"
                value={contactForm.email}
                onChange={(e) =>
                  setContactForm((p) => ({ ...p, email: e.target.value }))
                }
                className={inputBase}
              />
              <textarea
                placeholder="How can we help?"
                rows={4}
                value={contactForm.message}
                onChange={(e) =>
                  setContactForm((p) => ({ ...p, message: e.target.value }))
                }
                className={cn(inputBase, 'resize-none')}
              />
              <button
                type="submit"
                disabled={contactSending}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-all shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
              >
                {contactSending ? 'Sending message...' : 'Send Message'}
              </button>
            </form>
          </section>

          {/* Report a Bug */}
          <section className="glass-card rounded-3xl p-6 sm:p-8 h-fit">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Bug className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Report a Bug
              </h2>
            </div>

            <form onSubmit={handleBugSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Short description of issue"
                value={bugForm.subject}
                onChange={(e) =>
                  setBugForm((p) => ({ ...p, subject: e.target.value }))
                }
                className={inputBase}
              />
              <textarea
                placeholder="Steps to reproduce, expected behavior, what actually happened..."
                rows={6}
                value={bugForm.description}
                onChange={(e) =>
                  setBugForm((p) => ({ ...p, description: e.target.value }))
                }
                className={cn(inputBase, 'resize-none')}
              />
              <button
                type="submit"
                disabled={bugSending}
                className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-600 transition-all hover:bg-amber-100 active:scale-95 disabled:opacity-50"
              >
                {bugSending ? 'Submitting...' : 'Submit Bug Report'}
              </button>
            </form>
          </section>
        </div>

        {/* FAQs */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => (
              <div
                key={index}
                className={cn(
                  'rounded-2xl border transition-all duration-200 overflow-hidden',
                  openFaqIndex === index
                    ? 'border-indigo-200 bg-indigo-50/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenFaqIndex(openFaqIndex === index ? null : index)
                  }
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-slate-900 focus:outline-none"
                >
                  {faq.question}
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-slate-400 transition-transform duration-200',
                      openFaqIndex === index ? 'rotate-180 text-indigo-500' : ''
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'grid transition-all duration-200 ease-in-out',
                    openFaqIndex === index
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Legal */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Legal & Policies
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {LEGAL_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-indigo-300 hover:shadow-md hover:-translate-y-1"
              >
                <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">
                  {item.label}
                </span>
                <span className="text-xs text-slate-500 leading-relaxed">
                  {item.description}
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
