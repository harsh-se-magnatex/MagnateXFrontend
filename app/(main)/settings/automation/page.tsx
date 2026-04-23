'use client';

import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Bot, Type, Smile, CheckSquare, Clock, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { editUserPreferences, getUserPreferences } from '@/features/user/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all';

const InstagramOptions = [
  {
    id: 'instagram-short',
    value: 'short',
    platform: 'instagram',
    description: 'upto 15 words',
  },
  {
    id: 'instagram-medium',
    value: 'medium',
    platform: 'instagram',
    description: '20-30 words',
  },
  {
    id: 'instagram-long',
    value: 'long',
    platform: 'instagram',
    description: '40-60 words',
  },
];

const FacebookOptions = [
  {
    id: 'facebook-short',
    value: 'short',
    platform: 'facebook',
    description: 'upto 10 words',
  },
  {
    id: 'facebook-medium',
    value: 'medium',
    platform: 'facebook',
    description: '15-25 words',
  },
  {
    id: 'facebook-long',
    value: 'long',
    platform: 'facebook',
    description: '40-80 words',
  },
];

const LinkedInOptions = [
  {
    id: 'linkedin-short',
    value: 'short',
    platform: 'linkedin',
    description: '25-40 words',
  },
  {
    id: 'linkedin-medium',
    value: 'medium',
    platform: 'linkedin',
    description: '80-120 words',
  },
  {
    id: 'linkedin-long',
    value: 'long',
    platform: 'linkedin',
    description: '200-300 words',
  },
];

const Timezone = Intl.supportedValuesOf('timeZone');

export default function AutomationPreferencePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [captionObject, setCaptionObject] = useState({
    instagram: '',
    facebook: '',
    linkedin: '',
  });
  const [logoPreference, setLogoPreference] = useState('center');
  const [emojiUsage, setEmojiUsage] = useState(true);
  const [socialSalesEmailUsage, setSocialSalesEmailUsage] = useState(true);
  const [needApproval, setNeedApproval] = useState(true);
  const [timeZone, setTimeZone] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [preferencesLoading, setPreferencesLoading] = useState(true);

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  useEffect(() => {
    const getPreferences = async () => {
      try {
        setPreferencesLoading(true);
        const response = await getUserPreferences();

        if (response.success) {
          setEmojiUsage(response.data.preferences.emojiUsage ?? true);
          setCaptionObject(
            response.data.preferences.Caption_Length || {
              instagram: '',
              facebook: '',
              linkedin: '',
            }
          );
          setNeedApproval(response.data.preferences.Need_Approval ?? true);
          setTimeZone(response.data.preferences.TimeZone || userTimeZone);
          setPreferredTime(response.data.preferences.preferredTime || '');
          setLogoPreference(
            response.data.preferences.logoPreference || 'center'
          );
        }
      } finally {
        setPreferencesLoading(false);
      }
    };
    getPreferences();
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  useEffect(() => {
    try {
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      setTimeZone('UTC');
    }
  }, []);

  const handleSubmit = async (
    currentLogoPreference = logoPreference,
    currentEmojiUsage = emojiUsage,
    currentSalesEmailUsage = socialSalesEmailUsage,
    currentApproval = needApproval,
    curentTimeZone = timeZone,
    currentCaptionObject = captionObject,
    currentPreferredTime = preferredTime
  ) => {
    if (currentApproval !== needApproval) {
      window.dispatchEvent(
        new CustomEvent('approvalChanged', { detail: currentApproval })
      );
    }
    try {
      await editUserPreferences(
        currentLogoPreference,
        currentEmojiUsage,
        currentSalesEmailUsage,
        currentCaptionObject,
        currentApproval,
        curentTimeZone,
        currentPreferredTime
      );
    } catch (error: any) {
      alert(error.message || 'Failed to update preferences');
    }
  };

  if (loading) return null;
  if (!user) return null;

  if (preferencesLoading)
    return (
      <div className="flex items-center justify-center w-full h-full text-slate-500">
        Loading...
      </div>
    );
  if (!preferencesLoading && !user) return <div>Not found</div>;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Automation Preferences
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Configure how SocioGenie generated content behaves, default languages,
          and auto-posting rules.
        </p>
      </div>

      <div className="space-y-8">
        {/* Language & Output Section */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Bot className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              AI Output Settings
            </h2>
          </div>

          <div className="flex sm:flex-row-reverse flex-col-reverse gap-4 justify-between">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Emoji Usage
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Include emojis in generated captions automatically.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={emojiUsage}
                  onClick={() => {
                    const newValue = !emojiUsage;
                    setEmojiUsage(newValue);
                    handleSubmit(
                      logoPreference,
                      newValue,
                      socialSalesEmailUsage,
                      needApproval,
                      timeZone,
                      captionObject,
                      preferredTime
                    );
                  }}
                  className={cn(
                    'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                    emojiUsage ? 'bg-indigo-600' : 'bg-slate-200'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform',
                      emojiUsage ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
                <span className="text-sm font-medium text-slate-700">
                  {emojiUsage ? 'Enabled' : 'Disabled'}
                </span>
                <Smile
                  className={cn(
                    'h-4 w-4 ml-1',
                    emojiUsage ? 'text-indigo-500' : 'text-slate-400'
                  )}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Logo Preference
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Where to place the logo in the generated image.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Select
                  value={logoPreference}
                  onValueChange={(value) => {
                    setLogoPreference(value);
                    handleSubmit(
                      value,
                      emojiUsage,
                      socialSalesEmailUsage,
                      needApproval,
                      timeZone,
                      captionObject,
                      preferredTime
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a logo preference" />
                    <SelectContent>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    </SelectContent>
                  </SelectTrigger>
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <label className="text-sm font-semibold text-slate-700 block mb-2">
              Social Sales Email and contact number Usage
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Include your social sales email and contact number in the
              generated captions automatically.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={socialSalesEmailUsage}
                onClick={() => {
                  const newValue = !socialSalesEmailUsage;
                  setSocialSalesEmailUsage(newValue);
                  handleSubmit(
                    logoPreference,
                    emojiUsage,
                    newValue,
                    needApproval,
                    timeZone,
                    captionObject,
                    preferredTime
                  );
                }}
                className={cn(
                  'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                  socialSalesEmailUsage ? 'bg-indigo-600' : 'bg-slate-200'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform',
                    socialSalesEmailUsage ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
              <span className="text-sm font-medium text-slate-700">
                {socialSalesEmailUsage ? 'Enabled' : 'Disabled'}
              </span>
              <Mail
                className={cn(
                  'h-4 w-4 ml-1',
                  socialSalesEmailUsage ? 'text-indigo-500' : 'text-slate-400'
                )}
              />
            </div>
          </div>
        </section>

        {/* Content Length Section */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-2 bg-pink-50 rounded-lg text-pink-600">
              <Type className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Caption Length
            </h2>
          </div>

          <p className="text-sm text-slate-500 mb-5">
            Preferred length for AI auto-generated captions across your posts.
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            {InstagramOptions.map((len) => {
              const isSelected = captionObject.instagram === len.value;
              return (
                <button
                  key={len.id}
                  type="button"
                  onClick={() => {
                    setCaptionObject({
                      instagram: len.value,
                      facebook: captionObject.facebook,
                      linkedin: captionObject.linkedin,
                    });
                    handleSubmit(
                      logoPreference,
                      emojiUsage,
                      socialSalesEmailUsage,
                      needApproval,
                      timeZone,
                      {
                        instagram: len.value,
                        facebook: captionObject.facebook,
                        linkedin: captionObject.linkedin,
                      },
                      preferredTime
                    );
                  }}
                  className={cn(
                    'flex-1 rounded-2xl border px-6 py-4 text-center transition-all bg-white relative overflow-hidden',
                    isSelected
                      ? 'border-indigo-600 ring-1 ring-indigo-600 shadow-md shadow-indigo-500/10'
                      : 'border-slate-200/60 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-indigo-600" />
                  )}
                  <span
                    className={cn(
                      'block text-sm font-bold capitalize',
                      isSelected ? 'text-indigo-700' : 'text-slate-700'
                    )}
                  >
                    {len.id}
                  </span>
                  <span className="block mt-1 text-xs text-slate-500">
                    {len.id === 'instagram-short' && len.description}
                    {len.id === 'instagram-medium' && len.description}
                    {len.id === 'instagram-long' && len.description}
                  </span>
                </button>
              );
            })}
            {FacebookOptions.map((len) => {
              const isSelected = captionObject.facebook === len.value;
              return (
                <button
                  key={len.id}
                  type="button"
                  onClick={() => {
                    setCaptionObject({
                      instagram: captionObject.instagram,
                      facebook: len.value,
                      linkedin: captionObject.linkedin,
                    });
                    handleSubmit(
                      logoPreference,
                      emojiUsage,
                      socialSalesEmailUsage,
                      needApproval,
                      timeZone,
                      {
                        instagram: captionObject.instagram,
                        facebook: len.value,
                        linkedin: captionObject.linkedin,
                      },
                      preferredTime
                    );
                  }}
                  className={cn(
                    'flex-1 rounded-2xl border px-6 py-4 text-center transition-all bg-white relative overflow-hidden',
                    isSelected
                      ? 'border-indigo-600 ring-1 ring-indigo-600 shadow-md shadow-indigo-500/10'
                      : 'border-slate-200/60 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-indigo-600" />
                  )}
                  <span
                    className={cn(
                      'block text-sm font-bold capitalize',
                      isSelected ? 'text-indigo-700' : 'text-slate-700'
                    )}
                  >
                    {len.id}
                  </span>
                  <span className="block mt-1 text-xs text-slate-500">
                    {len.id === 'facebook-short' && len.description}
                    {len.id === 'facebook-medium' && len.description}
                    {len.id === 'facebook-long' && len.description}
                  </span>
                </button>
              );
            })}
            {LinkedInOptions.map((len) => {
              const isSelected = captionObject.linkedin === len.value;
              return (
                <button
                  key={len.id}
                  type="button"
                  onClick={() => {
                    setCaptionObject({
                      instagram: captionObject.instagram,
                      facebook: captionObject.facebook,
                      linkedin: len.value,
                    });
                    handleSubmit(
                      logoPreference,
                      emojiUsage,
                      socialSalesEmailUsage,
                      needApproval,
                      timeZone,
                      {
                        instagram: captionObject.instagram,
                        facebook: captionObject.facebook,
                        linkedin: len.value,
                      },
                      preferredTime
                    );
                  }}
                  className={cn(
                    'flex-1 rounded-2xl border px-6 py-4 text-center transition-all bg-white relative overflow-hidden',
                    isSelected
                      ? 'border-indigo-600 ring-1 ring-indigo-600 shadow-md shadow-indigo-500/10'
                      : 'border-slate-200/60 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-indigo-600" />
                  )}
                  <span
                    className={cn(
                      'block text-sm font-bold capitalize',
                      isSelected ? 'text-indigo-700' : 'text-slate-700'
                    )}
                  >
                    {len.id}
                  </span>
                  <span className="block mt-1 text-xs text-slate-500">
                    {len.id === 'linkedin-short' && len.description}
                    {len.id === 'linkedin-medium' && len.description}
                    {len.id === 'linkedin-long' && len.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Workflow Section */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckSquare className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Approval Workflow & Scheduling
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Post Approval Mode
              </label>
              <p className="text-xs text-slate-500 mb-4">
                Auto approve scheduled posts or require manual review.
              </p>
              <div className="flex rounded-xl bg-slate-100/80 p-1 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => {
                    const newValue = !needApproval;
                    setNeedApproval(newValue);
                    handleSubmit(
                      logoPreference,
                      emojiUsage,
                      socialSalesEmailUsage,
                      newValue,
                      timeZone,
                      captionObject,
                      preferredTime
                    );
                  }}
                  className={cn(
                    'flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200',
                    needApproval === true
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  )}
                >
                  Manual Review
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newValue = !needApproval;
                    setNeedApproval(newValue);
                    handleSubmit(
                      logoPreference,
                      emojiUsage,
                      socialSalesEmailUsage,
                      newValue,
                      timeZone,
                      captionObject,
                      preferredTime
                    );
                  }}
                  className={cn(
                    'flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200',
                    needApproval === false
                      ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-600/20'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  )}
                >
                  Auto Approve
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <label className="text-sm font-semibold text-slate-700 block">
                  Default Timezone
                </label>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Used when generating schedules and publishing posts.
              </p>
              <select
                value={timeZone}
                onChange={(e) => {
                  setTimeZone(e.target.value);
                  handleSubmit(
                    logoPreference,
                    emojiUsage,
                    socialSalesEmailUsage,
                    needApproval,
                    e.target.value,
                    captionObject,
                    preferredTime
                  );
                }}
                className={inputBase}
              >
                {Timezone.map((timezone) => (
                  <option value={timezone} key={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Preferred Time
                <p className="text-xs text-slate-500 mb-3">
                  Preferred time to post your content.
                </p>
              </label>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => {
                  setPreferredTime(e.target.value);
                  handleSubmit(
                    logoPreference,
                    emojiUsage,
                    socialSalesEmailUsage,
                    needApproval,
                    timeZone,
                    captionObject,
                    e.target.value
                  );
                }}
                className={inputBase}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
