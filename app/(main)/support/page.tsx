'use client';

import {
  getSupportMessages,
  sendSupportMessage,
} from '@/src/service/api/userService';
import { useState, useEffect } from 'react';
import { ChevronDown, Send, LifeBuoy, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
      'Credits unlock on-demand actions: product advert posts (4 credits), instant generation posts (2), festive posts (2), and regeneration posts (1). Your plan includes a monthly credit allowance; add-on packs are valid for 30 days. Daily automated posting does not use this balance.',
  },
  {
    question: 'How do I update my profile information?',
    answer: 'You can edit your profile under the Profile section in the menu.',
  },
];

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.message)
      return alert('Please fill all fields');
    try {
      setIsSubmitting(true);
      await sendSupportMessage(formData.name, formData.email, formData.message);
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      // Refresh messages
      const response = await getSupportMessages();
      setMessages(response.data.supportData || []);
    } catch (error: any) {
      alert(error.message || 'Failed to send support message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-10 text-center max-w-2xl mx-auto">
         <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-6 shadow-sm border border-indigo-100">
           <LifeBuoy className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Help & Support
        </h1>
        <p className="mt-4 text-base text-slate-500 leading-relaxed">
          Find answers to common questions below, or reach out to our team directly. We are here to help you get the most out of SocioGenie.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
         {/* Main Column: FAQs & Tickets */}
         <div className="space-y-12">
            {/* FAQs */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                 Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="glass-card border border-slate-200 rounded-2xl overflow-hidden transition-all shadow-sm hover:shadow-md bg-white"
                  >
                    <button
                      onClick={() => handleToggle(index)}
                      className="w-full text-left px-6 py-4 flex items-center justify-between font-semibold text-slate-800 hover:text-indigo-600 transition-colors"
                    >
                      {faq.question}
                      <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", openIndex === index && "rotate-180")} />
                    </button>
                    <AnimatePresence>
                       {openIndex === index && (
                         <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: 'auto', opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           transition={{ duration: 0.2 }}
                         >
                           <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100/50 pt-3">
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
                 <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-indigo-500" />
                    Your Support Tickets
                 </h2>
                 {messagesLoading && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
              </div>
              
              {!messagesLoading && messages.length === 0 ? (
                <div className="glass-card rounded-2xl border border-slate-200 border-dashed p-8 text-center bg-slate-50/50">
                   <p className="text-sm font-medium text-slate-500">No support tickets found.</p>
                   <p className="text-xs text-slate-400 mt-1">If you need help, use the form to submit a new ticket.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="glass-card border border-slate-200 rounded-2xl p-5 shadow-sm bg-white hover:border-indigo-200 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                         <p className="font-medium text-slate-800 text-sm leading-relaxed group-hover:text-slate-900">{msg.message}</p>
                         <span className={cn(
                            "inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize",
                            msg.status?.toLowerCase() === 'resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            msg.status?.toLowerCase() === 'in progress' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-indigo-50 text-indigo-700 border border-indigo-200'
                         )}>
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
            <section className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden bg-gradient-to-b from-white to-slate-50 lg:sticky lg:top-24">
               <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
               
               <h2 className="text-xl font-bold text-slate-900 mb-2">
                 Contact Us
               </h2>
               <p className="text-sm text-slate-500 mb-6 pb-6 border-b border-slate-100">
                  Cannot find what you are looking for? Send us a message and we will get back to you shortly.
               </p>

              {submitted ? (
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center animate-in zoom-in-95 duration-300">
                   <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                   </div>
                  <h3 className="text-emerald-800 font-bold mb-1">Message Sent!</h3>
                  <p className="text-sm text-emerald-600">
                    Thanks for reaching out. We will review your ticket and reply to {formData.email}.
                  </p>
                  <button 
                     onClick={() => setSubmitted(false)}
                     className="mt-4 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                  >
                     Send another message
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1">Name</label>
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
                     <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1">Email</label>
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
                     <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1">Message</label>
                    <textarea
                      name="message"
                      placeholder="How can we help you?"
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className={cn(inputBase, "resize-y")}
                    />
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !formData.name || !formData.email || !formData.message}
                    className="w-full mt-2 flex justify-center items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] disabled:transform-none disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed group"
                  >
                    {isSubmitting ? (
                       <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                       </>
                    ) : (
                       <>
                          Submit Ticket <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
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
