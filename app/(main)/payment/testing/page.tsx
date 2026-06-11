'use client';

import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createTestOrder } from '@/src/service/api/paymentService';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';

const TEST_PRODUCTS = [
  { label: 'Test subcription', dodoProductId: 'pdt_0NeAmj3QkGAlqLyMArl9F' },
  { label: 'Test one time', dodoProductId: 'pdt_0NeAmcsDwnGZM7RNG5w1L' },
] as const;

export default function PaymentTestingPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const startCheckout = useCallback(async (dodoProductId: string) => {
    if (loadingId) return;
    setLoadingId(dodoProductId);
    try {
      const res = await createTestOrder(dodoProductId);
      window.location.href = res.data.checkoutUrl;
    } catch (e: unknown) {
      console.error('Test checkout failed', e);
      showErrorToast(e instanceof Error ? e.message : 'Failed to start checkout');
    } finally {
      setLoadingId(null);
    }
  }, [loadingId]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Payment testing
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Dodo checkout for whitelisted test products (signed-in users only).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Test products</CardTitle>
          <CardDescription>
            Each button creates an order and redirects to Dodo checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {TEST_PRODUCTS.map(({ label, dodoProductId }) => (
            <Button
              key={dodoProductId}
              variant="outline"
              className="h-auto justify-between py-3"
              disabled={loadingId !== null}
              onClick={() => void startCheckout(dodoProductId)}
            >
              <span className="font-medium">{label}</span>
              {loadingId === dodoProductId ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
