'use client';

import { sendSupportMessage } from '@/src/service/api/userService';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  HelpCircle,
  Mail,
  Shield,
  Bug,
  ChevronDown,
  BadgeDollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';

import {
  workspaceInputClass,
  workspacePageDescriptionSmClass,
  workspacePageTitleClass,
  workspaceSectionCardClass,
  workspaceSectionTitleClass,
} from '@/lib/workspace-ui';

const inputBase = workspaceInputClass;

const FAQS = [
  {
    question: 'How does automated posting work?',
    answer:
      'You select festival events, and our system automatically generates and schedules posts, including your business branding.',
  },
  {
    question: 'How many times can I regenerate an image?',
    answer:
      'Each scheduled event allows 2 image regenerations after the original is generated.',
  },
  {
    question: 'What is the credit system?',
    answer:
      'Credits unlock on-demand actions: product posts 4 credits, standard posts 2 credits, Bulk Creator 2 credits (Studio plans), occasion posts 2 credits, campaign posts 3 credits per day, and regenerated posts 1 credit (first regeneration free). Your plan includes a monthly credit allowance; add-on packs are valid for 30 days. Personalized AI (AI plans) does not use this balance.',
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

const DATA_DELETION_LINKS = [
  {
    label: 'Facebook Data Deletion',
    href: '/legal/facebook-data-deletion-instruction',
    description:
      'Instructions to remove Facebook connection data from SocioGenie.',
    accent: 'facebook' as const,
  },
  {
    label: 'Instagram Data Deletion',
    href: '/legal/instagram-data-deletion-instruction',
    description:
      'Instructions to remove Instagram connection data from SocioGenie.',
    accent: 'instagram' as const,
  },
];

export default function SupportAndLegalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [contactSending, setContactSending] = useState(false);
  const [bugForm, setBugForm] = useState({ subject: '', description: '' });
  const [bugSending, setBugSending] = useState(false);
  const [refundForm, setRefundForm] = useState({ reason: '', details: '' });
  const [refundSending, setRefundSending] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      showErrorToast('Please fill all fields.');
      return;
    }
    setContactSending(true);
    try {
      await sendSupportMessage(
        contactForm.name,
        contactForm.email,
        contactForm.message,
        'support'
      );
      setContactForm({ name: '', email: '', message: '' });
      toast.success('Message sent successfully.');
    } catch (err: any) {
      showErrorToast('Failed to send message. Please Try Again Later.');
    } finally {
      setContactSending(false);
    }
  };

  const handleBugSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugForm.subject || !bugForm.description) {
      showErrorToast('Please fill subject and description.');
      return;
    }
    setBugSending(true);
    try {
      await sendSupportMessage(
        user?.displayName || user?.email || 'User',
        user?.email || '',
        `${bugForm.subject}\n\n${bugForm.description}`,
        'bug'
      );
      setBugForm({ subject: '', description: '' });
      toast.success('Bug report submitted successfully.');
    } catch (err: any) {
      showErrorToast('Failed to submit report. Please Try Again Later.');
    } finally {
      setBugSending(false);
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundForm.reason || !refundForm.details) {
      showErrorToast('Please fill reason and details.');
      return;
    }
    setRefundSending(true);
    try {
      await sendSupportMessage(
        user?.displayName || user?.email || 'User',
        user?.email || '',
        `Reason: ${refundForm.reason}\n\n${refundForm.details}`,
        'refund'
      );
      setRefundForm({ reason: '', details: '' });
      toast.success('Refund request submitted successfully.');
    } catch (err: any) {
      showErrorToast('Failed to submit refund request. Please Try Again Later.');
    } finally {
      setRefundSending(false);
    }
  };

  if (loading) return <PageLoadingState />;
  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className={workspacePageTitleClass}>
          Support & Legal
        </h1>
        <p className={workspacePageDescriptionSmClass}>
          Get help with your account, report issues, request refunds, and read
          our policies.
        </p>
      </div>

      <div className="space-y-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Contact Support */}
          <section className={cn(workspaceSectionCardClass, 'h-fit')}>
            <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <h2 className={workspaceSectionTitleClass}>
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
                className="w-full rounded-xl bg-gradient-action px-4 py-3 text-sm font-semibold text-white transition-all shadow-md shadow-primary-purple/25 hover:brightness-105 active:scale-95 disabled:opacity-50"
              >
                {contactSending ? 'Sending message...' : 'Send Message'}
              </button>
            </form>
          </section>

          {/* Report a Bug */}
          <section className="glass-card rounded-3xl p-6 sm:p-8 h-fit">
            <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Bug className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
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

          {/* Request a Refund */}
          <section className="glass-card rounded-3xl p-6 sm:p-8 h-fit">
            <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <BadgeDollarSign className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Request a Refund
              </h2>
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Reason (e.g. duplicate payment)"
                value={refundForm.reason}
                onChange={(e) =>
                  setRefundForm((p) => ({ ...p, reason: e.target.value }))
                }
                className={inputBase}
              />
              <textarea
                placeholder="Payment details, subscription info, and any other context..."
                rows={6}
                value={refundForm.details}
                onChange={(e) =>
                  setRefundForm((p) => ({ ...p, details: e.target.value }))
                }
                className={cn(inputBase, 'resize-none')}
              />
              <button
                type="submit"
                disabled={refundSending}
                className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100 active:scale-95 disabled:opacity-50"
              >
                {refundSending ? 'Submitting...' : 'Submit Refund Request'}
              </button>
            </form>
          </section>
        </div>

        {/* FAQs */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
            <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
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
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-border bg-card hover:border-border hover:bg-accent/40'
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenFaqIndex(openFaqIndex === index ? null : index)
                  }
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-foreground focus:outline-none"
                >
                  {faq.question}
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-muted-foreground transition-transform duration-200',
                      openFaqIndex === index ? 'rotate-180 text-primary-purple' : ''
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
                    <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data Deletion */}
        <section className="glass-card rounded-3xl p-6 sm:p-8 border-2 border-indigo-100">
          <div className="flex items-center gap-3 mb-2 border-b border-border pb-4">
            <div className="p-2 bg-primary-purple/10 rounded-lg text-primary-purple">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Data Deletion
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Remove platform connection data stored by SocioGenie when you
            disconnect an account or submit a Meta deletion request.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {DATA_DELETION_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex flex-col rounded-2xl border-2 p-5 transition-all hover:shadow-md hover:-translate-y-1',
                  item.accent === 'facebook'
                    ? 'border-blue-200 bg-blue-50/60 hover:border-blue-300'
                    : 'border-pink-200 bg-pink-50/60 hover:border-pink-300',
                )}
              >
                <span
                  className={cn(
                    'font-semibold transition-colors mb-2',
                    item.accent === 'facebook'
                      ? 'text-blue-800 group-hover:text-blue-900'
                      : 'text-pink-800 group-hover:text-pink-900',
                  )}
                >
                  {item.label}
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </span>
                <span
                  className={cn(
                    'mt-4 text-xs font-semibold underline underline-offset-2',
                    item.accent === 'facebook'
                      ? 'text-blue-700'
                      : 'text-pink-700',
                  )}
                >
                  View instructions →
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Legal */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
            <div className="p-2 bg-muted rounded-lg text-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Legal & Policies
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {LEGAL_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-1"
              >
                <span className="font-semibold text-foreground group-hover:text-primary-purple transition-colors mb-2">
                  {item.label}
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">
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
