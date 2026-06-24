import { Suspense } from "react";

import { PageLoadingState } from "@/components/shared/PageLoadingState";
import { PaymentReturnContent } from "./payment-return-content";

function ContextFallback() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 font-(--font-sora)">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-[10%] left-1/2 h-[min(420px,75vw)] w-[min(420px,75vw)] -translate-x-1/2 rounded-full bg-muted/40 blur-[100px]" />
        <div className="absolute -bottom-[8%] right-[-6%] h-[min(320px,65vw)] w-[min(320px,65vw)] rounded-full bg-muted/30 blur-[90px]" />
      </div>
      <PageLoadingState className="min-h-0" />
    </div>
  );
}

export default function PaymentContextPage() {
  return (
    <Suspense fallback={<ContextFallback />}>
      <PaymentReturnContent />
    </Suspense>
  );
}
