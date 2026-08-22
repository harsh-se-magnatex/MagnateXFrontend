'use client';

import { AppSidebar } from '@/components/sidebar/app-sidebar';
import { useUser } from './useUser';
import { useUserPlanCredits } from './UserPlanCreditsProvider';

export function AppSidebarWrapper() {
  const { user } = useUser();
  const { billing } = useUserPlanCredits();
  const isNeedApproval = billing?.preferences.approvalMode === 'manual';
  const isAccountFrozen = billing?.isAccountFrozen === true;
  return (
    <AppSidebar
      isAdmin={user?.admin ?? false}
      isNeedApproval={isNeedApproval}
      isAccountFrozen={isAccountFrozen}
    />
  );
}
