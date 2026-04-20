'use client';

import { AppSidebar } from '@/components/sidebar/app-sidebar';
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useUser } from './useUser';

export function AppSidebarWrapper() {
  const [isNeedApproval, setIsNeedApproval] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    // Read cookie on mount
    setIsNeedApproval(Cookies.get('needed_approval') === 'true');
  }, []);

  // ✅ Listen for changes from toggle component
  useEffect(() => {
    const handleApprovalChange = (e: CustomEvent) => {
      setIsNeedApproval(e.detail);
    };

    window.addEventListener(
      'approvalChanged',
      handleApprovalChange as EventListener
    );
    return () =>
      window.removeEventListener(
        'approvalChanged',
        handleApprovalChange as EventListener
      );
  }, []);

  return (
    <AppSidebar
      isAdmin={user?.admin ?? false}
      isNeedApproval={isNeedApproval}
    />
  );
}
