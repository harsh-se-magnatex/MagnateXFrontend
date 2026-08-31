'use client';

import {
  getSupportMessages,
  sendSupportMessage,
} from '@/src/service/api/userService';
import { useState, useEffect } from 'react';
import { ChevronDown, Send, LifeBuoy, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { workspacePageTitleClass } from '@/lib/workspace-ui';
import { showErrorToast } from '@/lib/show-error-toast';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
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
      'Credits unlock on-demand actions: product posts (4 credits), standard posts (2), occasion posts (2), campaign posts (3 credits per day), and regenerated posts (1). Your plan includes a monthly credit allowance; add-on packs are valid for 30 days. Personalized AI does not use this balance.',
  },
  {
    question: 'How do I update my profile information?',
    answer: 'You can edit your profile under the Profile section in the menu.',
  },
];

const inputBase =
  'w-full rounded-xl border border-default bg-element px-4 py-3 text-default placeholder-muted-foreground focus:border-primary-purple focus:outline-none focus:ring-2 focus:ring-strong transition-expo';

export default function HelpSupportPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setMessagesLoading(true);
        const response = await getSupportMessages();
        setMessages(response.data.supportData || []);
      } catch (error: any) {
        console.error('Failed to get support messages', error);
      } finally {
        setMessagesLoading(false);
      }
    };
    fetchMessages();
  }, []);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.message) {
      showErrorToast('Please fill all fields');
      return;
    }
    try {
      setIsSubmitting(true);
      await sendSupportMessage(formData.name, formData.email, formData.message);
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      // Refresh messages
      const response = await getSupportMessages();
      setMessages(response.data.supportData || []);
    } catch {
      showErrorToast('Failed to send support message. Please Try Again Later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-10 text-center max-w-2xl mx-auto">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-purple/10 text-preview mb-6 border border-primary-purple/20">
          <LifeBuoy className="h-8 w-8" />
        </div>
        <h1 className={workspacePageTitleClass}>Help & Support</h1>
        <p className="mt-4 text-base text-secondary leading-relaxed">
          Find answers to common questions below, or reach out to our team
          directly. We are here to help you get the most out of SocioGenie.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Main Column: FAQs & Tickets */}
        <div className="space-y-12">
          {/* FAQs */}
          <section>
            <h2 className="text-section text-default mb-6 flex items-center gap-2">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="glass-card border border-default rounded-2xl overflow-hidden transition-expo bg-default"
                >
                  <button
                    onClick={() => handleToggle(index)}
                    className="w-full text-left px-6 py-4 flex items-center justify-between font-semibold text-default hover:text-preview transition-expo"
                  >
                    {faq.question}
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 text-secondary transition-transform duration-300',
                        openIndex === index && 'rotate-180'
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {openIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-5 text-sm text-secondary leading-relaxed border-t border-default pt-3">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </section>

          {/* Submitted Tickets */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-section text-default flex items-center gap-2">
                <Inbox className="w-5 h-5 text-preview" />
                Your Support Tickets
              </h2>
              {messagesLoading && (
                <Loader2 className="w-5 h-5 text-secondary animate-spin" />
              )}
            </div>

            {!messagesLoading && messages.length === 0 ? (
              <div className="glass-card rounded-2xl border border-default border-dashed p-8 text-center bg-element/50">
                <p className="text-sm font-medium text-secondary">
                  No support tickets found.
                </p>
                <p className="text-xs text-secondary mt-1">
                  If you need help, use the form to submit a new ticket.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="glass-card border border-default rounded-2xl p-5 bg-default hover:border-strong transition-expo group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-medium text-default text-sm leading-relaxed group-hover:text-default">
                        {msg.message}
                      </p>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize',
                          msg.status?.toLowerCase() === 'resolved'
                            ? 'bg-success text-success border border-success'
                            : msg.status?.toLowerCase() === 'in progress'
                              ? 'bg-warning text-warning border border-warning'
                              : 'bg-primary-purple/10 text-preview border border-primary-purple/25'
                        )}
                      >
                        {msg.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: Contact Form */}
        <div className="space-y-6">
          <section className="glass-card rounded-3xl p-6 sm:p-8 border border-default relative overflow-hidden bg-gradient-to-b from-card to-muted/30 lg:sticky lg:top-24">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-[var(--purple-9)] via-[var(--purple-9)] to-[var(--purple-9)]"></div>

            <h2 className="text-section text-default mb-2">Contact Us</h2>
            <p className="text-sm text-secondary mb-6 pb-6 border-b border-default">
              Cannot find what you are looking for? Send us a message and we
              will get back to you shortly.
            </p>

            {submitted ? (
              <div className="bg-success p-6 rounded-2xl border border-success text-center animate-in zoom-in-95 duration-300">
                <div className="w-12 h-12 bg-success text-success rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-subsection text-default mb-1">
                  Message Sent!
                </h3>
                <p className="text-sm text-success">
                  Thanks for reaching out. We will review your ticket and reply
                  to {formData.email}.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-xs font-semibold text-success hover:text-success underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-default mb-1.5 ml-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-default mb-1.5 ml-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-default mb-1.5 ml-1">
                    Message
                  </label>
                  <textarea
                    name="message"
                    placeholder="How can we help you?"
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    className={cn(inputBase, 'resize-y')}
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    !formData.name ||
                    !formData.email ||
                    !formData.message
                  }
                  className="w-full mt-2 flex justify-center items-center gap-2 rounded-full btn-brand-fill px-6 py-3.5 text-sm font-bold transition-expo disabled:transform-none disabled:bg-element disabled:shadow-none disabled:cursor-not-allowed group"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Submit Ticket{' '}
                      <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
//
