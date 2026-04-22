'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { scrapeUrl } from '@/src/service/api/scrape';
import { onBoardUser, uploadLogo } from '@/src/service/api/userService';
import { toast } from 'sonner';

const questions = [
  { name: 'website', label: 'Website URL', type: 'text' },
  { name: 'businessName', label: 'What is your business name?', type: 'text' },
  {
    name: 'businesscontact',
    label: 'What is your business contact?',
    type: 'number',
  },
  {
    name: 'industry',
    label: 'Select your industry',
    type: 'select',
    options: [
      'Fashion',
      'Food & Beverage',
      'Tech',
      'Health',
      'Education',
      'Retail',
      'Finance',
      'Travel',
      'Entertainment',
      'Real Estate',
      'E-commerce',
      'Consulting',
      'Beauty',
      'Fitness',
      'Art & Design',
      'Other',
    ],
  },
  { name: 'logo', label: 'Upload your logo', type: 'file' },
  {
    name: 'location',
    label: 'Select your location',
    type: 'select',
    options: [
      'United States',
      'India',
      'United Kingdom',
      'Canada',
      'Australia',
      'Germany',
      'France',
      'Brazil',
      'Japan',
      'China',
      'South Africa',
      'Mexico',
      'Spain',
      'Italy',
      'Singapore',
      'Netherlands',
      'UAE',
      'Indonesia',
      'Russia',
      'Other',
    ],
  },
  { name: 'hashtags', label: 'Preferred Hashtags or Slogans', type: 'text' },
  { name: 'primaryColor', label: 'Primary Brand Color', type: 'color' },
  { name: 'secondaryColor', label: 'Secondary Brand Color', type: 'color' },
  { name: 'accentColor', label: 'Accent Brand Color', type: 'color' },
  {
    name: 'brandDescription',
    label: 'What does your brand do?',
    type: 'textarea',
  },
];

export default function OnboardingMenu() {
  const [step, setStep] = useState<number>(0);
  const [formData, setFormData] = useState<any>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [fetchingBusinessData, setFetchingBusinessData] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('isNewUser') != null) {
      localStorage.removeItem('isNewUser');
    }
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, files } = e.target as any;
    if (e.target.type === 'file') {
      const file = files?.[0];
      if (file) {
        setFormData((prev: any) => ({ ...prev, [name]: file }));
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleNext = async () => {
    if (step < questions.length - 1) return setStep(step + 1);
    const dataToSave = { ...formData };
    try {
      setLoading(true);
      if (formData.logo) {
        const uploadRes = await uploadLogo(formData.logo);
        const uploadedUrl = (uploadRes as { data?: { url?: string } })?.data
          ?.url;
        if (uploadedUrl) dataToSave.logo = uploadedUrl;
      }
      const response = await onBoardUser(dataToSave);
      if (response.success) router.push('/brand-memory');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to onboard user');
    } finally {
      setLoading(false);
    }
  };

  const skipEntirely = () => router.push('/home');

  const skipCurrentStep = () => {
    if (step < questions.length - 1) setStep(step + 1);
    else void handleNext();
  };

  const fetchOnboarding = async (name: string) => {
    if (name === 'website') {
      setFetchingBusinessData(true);
      try {
        const response = await scrapeUrl(formData.website);
        const payload = response.data ?? response;
        const dnaFields = payload.dna ?? payload;
        const flat: Record<string, unknown> = { ...dnaFields };
        setFormData((prev: any) => ({ ...prev, ...flat }));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to extract business data');
      } finally {
        setFetchingBusinessData(false);
      }
    }
  };
  const current = questions[step];

  return (
    <>
      {fetchingBusinessData ? (
        <div className="absolute inset-0 z-50 glass-card backdrop-blur-lg flex items-center justify-center">
          <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-white shadow-[0_0_40px_rgba(0,209,255,0.15)]">
            <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-linear-to-r from-[#6C5CE7] to-[#00D1FF]">
              Fetching Business Data...
            </h2>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-50 backdrop-blur-lg flex flex-col items-center justify-center gap-4 glass-card px-4">
          <button
            type="button"
            onClick={skipEntirely}
            className="text-sm text-gray-400 hover:text-gray-800 transition-colors"
          >
            Skip entirely
          </button>
          <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-white shadow-[0_0_40px_rgba(0,209,255,0.15)]">
            <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-linear-to-r from-[#6C5CE7] to-[#00D1FF]">
              {current.label}
            </h2>

            {current.type === 'textarea' ? (
              <textarea
                name={current.name}
                value={formData[current.name] || ''}
                onChange={handleChange}
                rows={4}
                className="w-full bg-white/10 border border-black rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/50 transition-all"
              />
            ) : current.type === 'select' ? (
              <select
                name={current.name}
                value={formData[current.name] || ''}
                onChange={handleChange}
                className="w-full border border-black rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/50 transition-all"
              >
                <option value="" disabled>
                  Select
                </option>
                {(current.options ?? []).map((option: string) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : current.type === 'file' ? (
              <div>
                <input
                  type="file"
                  name={current.name}
                  onChange={handleChange}
                  className="w-full  border border-black rounded-lg p-3 text-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-linear-to-r file:from-[#6C5CE7] file:to-[#00D1FF] file:text-white file:cursor-pointer hover:file:opacity-90 transition-all "
                />
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="mt-4 h-20 mx-auto rounded-lg border border-white/10 object-contain shadow-[0_0_15px_rgba(0,209,255,0.3)]"
                  />
                ) : (
                  <img
                    src={formData.logo}
                    alt="Preview"
                    className="mt-4 h-20 mx-auto rounded-lg border border-white/10 object-contain shadow-[0_0_15px_rgba(0,209,255,0.3)]"
                  />
                )}
              </div>
            ) : current.type === 'color' ? (
              <input
                type="color"
                name={current.name}
                value={formData[current.name] || '#000000'}
                onChange={handleChange}
                className="w-full h-14 rounded-lg border border-white/20 cursor-pointer bg-transparent"
              />
            ) : (
              <input
                type={current.type}
                name={current.name}
                value={formData[current.name] || ''}
                onChange={handleChange}
                className="w-full  border border-black rounded-lg p-3 text-black focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/50 transition-all"
              />
            )}

            <div className="mt-8 flex justify-between gap-4">
              <button
                onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                disabled={step === 0}
                className={`w-1/2 py-2.5 bg-gradient-primary cursor-pointer text-white
                   rounded-lg font-medium transition-all ${
                     step === 0
                       ? 'cursor-not-allowed'
                       : 'bg-linear-to-r bg-gradient-primary text-white hover:opacity-90 shadow-[0_0_20px_rgba(108,92,231,0.4)]'
                   }`}
              >
                Previous
              </button>

              <button
                onClick={() => {
                  if (current.name === 'website') {
                    fetchOnboarding(current.name);
                  }
                  handleNext();
                }}
                disabled={fetchingBusinessData}
                className="w-1/2 py-2.5 cursor-pointer rounded-lg font-medium bg-linear-to-r from-[#00D1FF] to-[#6C5CE7] text-white hover:opacity-90 shadow-[0_0_20px_rgba(0,209,255,0.4)] transition-all"
              >
                {fetchingBusinessData
                  ? 'Fetching...'
                  : loading
                    ? step === questions.length - 1
                      ? 'Finishing...'
                      : 'Saving...'
                    : step === questions.length - 1
                      ? 'Finish'
                      : 'Next'}
              </button>
            </div>

            <div className="flex justify-between items-center">
              <p className="mt-6 text-xs text-gray-400 text-center">
                Step {step + 1} of {questions.length}
              </p>
              <button
                type="button"
                onClick={skipCurrentStep}
                disabled={loading || fetchingBusinessData}
                className="w-fit px-4 text-sm mt-6 py-2.5 cursor-pointer rounded-lg font-medium text-black/50 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip step
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
