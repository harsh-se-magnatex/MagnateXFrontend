'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import axios, { type AxiosResponse } from 'axios';
import axiosClient from '@/lib/axios';
import { toast } from 'sonner';
import { BusinessSelectionDialog } from './BusinessSelectionDialog';
import { isBusinessType, type BusinessType } from './types';

type BusinessState = { businessType: BusinessType | null; onboarded: boolean };
type BusinessContextValue = BusinessState & {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  select: (type: BusinessType) => Promise<void>;
};
const BusinessContext = createContext<BusinessContextValue | null>(null);

function readState(response: AxiosResponse): BusinessState {
  const data = response.data?.data;
  if (
    !data ||
    (data.businessType !== null && !isBusinessType(data.businessType)) ||
    typeof data.onboarded !== 'boolean'
  ) {
    throw new Error('Invalid business selection response');
  }
  return data;
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<BusinessState>({
    businessType: null,
    onboarded: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++revision.current;
    try {
      const next = readState(
        await axiosClient.get('/api/v1/user/business-type')
      );
      if (request === revision.current) {
        setState(next);
        setError(null);
      }
    } catch {
      if (request === revision.current)
        setError('We could not load your business type. Please try again.');
    } finally {
      if (request === revision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      // This is a request generation counter, not a DOM ref; invalidate pending reads.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ++revision.current;
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const select = useCallback(
    async (businessType: BusinessType) => {
      try {
        const response = await axiosClient.post('/api/v1/user/business-type', {
          businessType,
        });
        const saved = response.data?.data?.businessType;
        if (!isBusinessType(saved))
          throw new Error('Invalid business selection response');
        ++revision.current;
        setState({ businessType: saved, onboarded: true });
        setLoading(false);
        setError(null);
        toast.success('Your business type has been saved.');
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          await refresh();
          toast.info(
            'Your account has been refreshed. A saved business type cannot be changed.'
          );
        }
        throw err;
      }
    },
    [refresh]
  );

  return (
    <BusinessContext.Provider
      value={{ ...state, loading, error, refresh, select }}
    >
      {children}
      {pathname === '/home' &&
        !loading &&
        !error &&
        state.onboarded &&
        !state.businessType && <BusinessSelectionDialog onSelect={select} />}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const value = useContext(BusinessContext);
  if (!value)
    throw new Error('useBusiness must be used within BusinessProvider');
  return value;
}
