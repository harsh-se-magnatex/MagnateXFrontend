"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  Mail,
  Hash,
  Activity,
  XCircle,
  RotateCcw,
  LifeBuoy,
  Clock,
  Loader2,
  AlertTriangle,
  Lock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  getOrderPaymentStatus,
  reconcileCheckoutSession,
} from "@/src/service/api/paymentService";

/** Dodo returns to the same URL for both outcomes; payment result is in `status`. */
const CHECKOUT_FAILURE = new Set([
  "failure",
  "failed",
  "fail",
  "error",
  "cancelled",
  "canceled",
  "declined",
]);

/**
 * Dodo uses `pending` when the customer opens a checkout link after it has expired.
 * When `session_id` is present we skip this branch so an active session can reconcile.
 */
const CHECKOUT_EXPIRED_LINK = new Set(["pending"]);

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isCheckoutFailureStatus(status: string): boolean {
  const s = status.trim().toLowerCase();
  return CHECKOUT_FAILURE.has(s);
}

function isCheckoutLinkExpiredStatus(status: string): boolean {
  const s = status.trim().toLowerCase();
  return CHECKOUT_EXPIRED_LINK.has(s);
}

function formatLabelStatus(status: string) {
  return status
    .split(/[-_]/g)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Dodo sometimes leaves template tokens (e.g. `{CHECKOUT_SESSION_ID}`) in the URL unchanged. */
function isLiteralCheckoutPlaceholder(sessionId: string): boolean {
  const s = sessionId.trim();
  if (!s) return false;
  if (s === "{CHECKOUT_SESSION_ID}") return true;
  return /^\{[A-Z0-9_]+\}$/.test(s);
}

type ConfirmPhase =
  | "idle"
  | "needs_auth"
  | "working"
  | "confirmed"
  | "timed_out"
  | "error";

export function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const { subscriptionId, status, email, rawSessionFromUrl, orderIdFromUrl } =
    useMemo(
      () => ({
        subscriptionId: searchParams.get("subscription_id")?.trim() ?? "",
        status: searchParams.get("status")?.trim() ?? "",
        email: searchParams.get("email")?.trim() ?? "",
        rawSessionFromUrl: searchParams.get("session_id")?.trim() ?? "",
        orderIdFromUrl: searchParams.get("order_id")?.trim() ?? "",
      }),
      [searchParams]
    );

  const { user, loading: authLoading } = useAuth();

  const checkoutFailed = isCheckoutFailureStatus(status);
  const checkoutLinkExpired =
    isCheckoutLinkExpiredStatus(status) &&
    !orderIdFromUrl &&
    (!rawSessionFromUrl || isLiteralCheckoutPlaceholder(rawSessionFromUrl));

  const reconcileParams = useMemo(() => {
    if (orderIdFromUrl) return { orderId: orderIdFromUrl };
    if (
      rawSessionFromUrl &&
      !isLiteralCheckoutPlaceholder(rawSessionFromUrl)
    ) {
      return { sessionId: rawSessionFromUrl };
    }
    return null;
  }, [orderIdFromUrl, rawSessionFromUrl]);

  const wantsConfirm = Boolean(reconcileParams) && !checkoutFailed && !checkoutLinkExpired;

  const [confirmPhase, setConfirmPhase] = useState<ConfirmPhase>("idle");

  const runCheckoutConfirmation = useCallback(async () => {
    if (!reconcileParams || !user) return;
    setConfirmPhase("working");
    try {
      const initial = await reconcileCheckoutSession(reconcileParams);
      const initPayload = initial.data;

      if (initPayload.orderStatus === "paid") {
        setConfirmPhase("confirmed");
        return;
      }
      if (initPayload.orderStatus === "failed") {
        setConfirmPhase("error");
        return;
      }

      let pollOrderId = initPayload.orderId;
      const maxPolls = 36;

      for (let i = 0; i < maxPolls; i++) {
        await sleep(1700);

        if (i % 5 === 4) {
          const again = await reconcileCheckoutSession(reconcileParams);
          const p = again.data;
          pollOrderId = p.orderId;
          if (p.orderStatus === "paid") {
            setConfirmPhase("confirmed");
            return;
          }
          if (p.orderStatus === "failed") {
            setConfirmPhase("error");
            return;
          }
        }

        const st = await getOrderPaymentStatus(pollOrderId);
        if (st.data.status === "paid") {
          setConfirmPhase("confirmed");
          return;
        }
      }

      setConfirmPhase("timed_out");
    } catch {
      setConfirmPhase("error");
    }
  }, [reconcileParams, user]);

  useEffect(() => {
    if (!wantsConfirm) return;
    if (authLoading) return;
    if (!user) {
      setConfirmPhase("needs_auth");
      return;
    }
    void runCheckoutConfirmation();
  }, [wantsConfirm, authLoading, user, runCheckoutConfirmation]);

  const displaySessionId =
    rawSessionFromUrl && !isLiteralCheckoutPlaceholder(rawSessionFromUrl)
      ? rawSessionFromUrl
      : "";

  const hasDetails = Boolean(
    subscriptionId || status || email || displaySessionId || orderIdFromUrl
  );

  if (checkoutFailed) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12 font-(--font-sora) text-foreground">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-[10%] right-[-4%] h-[min(460px,80vw)] w-[min(460px,80vw)] rounded-full bg-rose-400/14 blur-[100px] dark:bg-rose-500/12" />
          <div className="absolute -bottom-[12%] left-[-8%] h-[min(340px,72vw)] w-[min(340px,72vw)] rounded-full bg-red-500/10 blur-[95px] dark:bg-red-500/8" />
        </div>

        <div className="relative w-full max-w-lg animate-in fade-in zoom-in-95 duration-500">
          <div className="glass-card rounded-3xl border border-rose-200/70 bg-white/90 p-8 shadow-lg shadow-rose-500/5 dark:border-rose-500/25 dark:bg-card/95 sm:p-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-400 dark:ring-rose-500/35">
              <XCircle className="h-9 w-9" aria-hidden />
            </div>

            <h1 className="text-center text-2xl font-extrabold tracking-tight text-rose-900 sm:text-3xl dark:text-rose-100">
              Payment didn&apos;t go through
            </h1>
            <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground font-(--font-dm-sans)">
              We couldn&apos;t complete the charge. No money was taken. Try again
              with the same or a different payment method, or reach out if the
              problem persists.
            </p>

            {hasDetails ? (
              <dl className="mt-6 space-y-3 rounded-2xl border border-rose-100/90 bg-rose-50/35 p-4 text-sm dark:border-rose-500/25 dark:bg-rose-950/25 font-(--font-dm-sans)">
                {email ? (
                  <div className="flex gap-3">
                    <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                      <Mail className="size-3.5 shrink-0" aria-hidden />
                      <span>Email</span>
                    </dt>
                    <dd className="min-w-0 break-all font-medium text-foreground">
                      {email}
                    </dd>
                  </div>
                ) : null}
                {status ? (
                  <div className="flex gap-3">
                    <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                      <Activity className="size-3.5 shrink-0" aria-hidden />
                      <span>Status</span>
                    </dt>
                    <dd>
                      <span className="inline-flex items-center rounded-full bg-rose-600/15 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-500/25 dark:text-rose-200">
                        {formatLabelStatus(status)}
                      </span>
                    </dd>
                  </div>
                ) : null}
                {subscriptionId ? (
                  <div className="flex gap-3">
                    <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                      <Hash className="size-3.5 shrink-0" aria-hidden />
                      <span>Reference</span>
                    </dt>
                    <dd className="min-w-0 font-mono text-xs font-medium text-foreground break-all">
                      {subscriptionId}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="w-full sm:w-auto gap-2">
                <Link href="/settings/billings">
                  <RotateCcw className="size-4" aria-hidden />
                  Try again
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto gap-2"
              >
                <Link href="/support">
                  <LifeBuoy className="size-4" aria-hidden />
                  Get help
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (checkoutLinkExpired) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12 font-(--font-sora) text-foreground">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-[10%] left-1/2 h-[min(480px,85vw)] w-[min(480px,85vw)] -translate-x-1/2 rounded-full bg-amber-400/12 blur-[100px] dark:bg-amber-500/10" />
          <div className="absolute -bottom-[8%] right-[-6%] h-[min(360px,70vw)] w-[min(360px,70vw)] rounded-full bg-orange-400/10 blur-[90px] dark:bg-orange-500/8" />
        </div>

        <div className="relative w-full max-w-lg animate-in fade-in zoom-in-95 duration-500">
          <div className="glass-card rounded-3xl border border-amber-200/70 bg-white/90 p-8 shadow-lg shadow-amber-500/5 dark:border-amber-500/25 dark:bg-card/95 sm:p-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-500/30">
              <Clock className="h-9 w-9" aria-hidden />
            </div>

            <h1 className="text-center text-2xl font-extrabold tracking-tight text-amber-950 sm:text-3xl dark:text-amber-100">
              Payment link expired
            </h1>
            <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground font-(--font-dm-sans)">
              This checkout session is no longer valid. Payment links expire after a
              set time for security. Nothing was charged. Start a new checkout from
              billings whenever you&apos;re ready.
            </p>

            {hasDetails ? (
              <dl className="mt-6 space-y-3 rounded-2xl border border-amber-100/90 bg-amber-50/40 p-4 text-sm dark:border-amber-500/20 dark:bg-amber-950/20 font-(--font-dm-sans)">
                {email ? (
                  <div className="flex gap-3">
                    <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                      <Mail className="size-3.5 shrink-0" aria-hidden />
                      <span>Email</span>
                    </dt>
                    <dd className="min-w-0 break-all font-medium text-foreground">
                      {email}
                    </dd>
                  </div>
                ) : null}
                {status ? (
                  <div className="flex gap-3">
                    <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                      <Activity className="size-3.5 shrink-0" aria-hidden />
                      <span>Status</span>
                    </dt>
                    <dd>
                      <span className="inline-flex items-center rounded-full bg-amber-600/15 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-500/25 dark:text-amber-200">
                        {formatLabelStatus(status)}
                      </span>
                    </dd>
                  </div>
                ) : null}
                {subscriptionId ? (
                  <div className="flex gap-3">
                    <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                      <Hash className="size-3.5 shrink-0" aria-hidden />
                      <span>Reference</span>
                    </dt>
                    <dd className="min-w-0 font-mono text-xs font-medium text-foreground break-all">
                      {subscriptionId}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="w-full sm:w-auto gap-2">
                <Link href="/settings/billings">
                  <ArrowRight className="size-4" aria-hidden />
                  Billings — new checkout
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                <Link href="/support">
                  <LifeBuoy className="size-4" aria-hidden />
                  Get help
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasBrokenSessionPlaceholder =
    Boolean(rawSessionFromUrl) &&
    isLiteralCheckoutPlaceholder(rawSessionFromUrl) &&
    !orderIdFromUrl;

  if (!checkoutFailed && !checkoutLinkExpired && hasBrokenSessionPlaceholder) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12 font-(--font-sora) text-foreground">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-[10%] left-1/2 h-[min(480px,85vw)] w-[min(480px,85vw)] -translate-x-1/2 rounded-full bg-amber-400/14 blur-[100px] dark:bg-amber-500/10" />
          <div className="absolute -bottom-[8%] right-[-6%] h-[min(360px,70vw)] w-[min(360px,70vw)] rounded-full bg-orange-400/10 blur-[90px] dark:bg-orange-500/8" />
        </div>

        <div className="relative w-full max-w-lg animate-in fade-in zoom-in-95 duration-500">
          <div className="glass-card rounded-3xl border border-amber-200/70 bg-white/90 p-8 shadow-lg shadow-amber-500/5 dark:border-amber-500/25 dark:bg-card/95 sm:p-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-500/30">
              <AlertTriangle className="h-9 w-9" aria-hidden />
            </div>

            <h1 className="text-center text-2xl font-extrabold tracking-tight text-amber-950 sm:text-3xl dark:text-amber-100">
              Checkout link wasn&apos;t finalized
            </h1>
            <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground font-(--font-dm-sans)">
              The payment provider returned a placeholder instead of a real checkout
              session id, so this page can&apos;t confirm your order automatically.
              If Dodo shows your subscription or charge as active, your payment likely
              went through — open Billings to verify. New checkouts use an internal
              order id to avoid this.
            </p>

            {hasDetails ? (
              <dl className="mt-6 space-y-3 rounded-2xl border border-amber-100/90 bg-amber-50/40 p-4 text-sm dark:border-amber-500/20 dark:bg-amber-950/20 font-(--font-dm-sans)">
                {email ? (
                  <div className="flex gap-3">
                    <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                      <Mail className="size-3.5 shrink-0" aria-hidden />
                      <span>Email</span>
                    </dt>
                    <dd className="min-w-0 break-all font-medium text-foreground">
                      {email}
                    </dd>
                  </div>
                ) : null}
                {status ? (
                  <div className="flex gap-3">
                    <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                      <Activity className="size-3.5 shrink-0" aria-hidden />
                      <span>Status</span>
                    </dt>
                    <dd>
                      <span className="inline-flex items-center rounded-full bg-amber-600/15 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-500/25 dark:text-amber-200">
                        {formatLabelStatus(status)}
                      </span>
                    </dd>
                  </div>
                ) : null}
                {subscriptionId ? (
                  <div className="flex gap-3">
                    <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                      <Hash className="size-3.5 shrink-0" aria-hidden />
                      <span>Subscription</span>
                    </dt>
                    <dd className="min-w-0 font-mono text-xs font-medium text-foreground break-all">
                      {subscriptionId}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="w-full sm:w-auto gap-2">
                <Link href="/settings/billings">
                  <ArrowRight className="size-4" aria-hidden />
                  Open billings
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="/home">Back to home</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const signInReturnTo = useMemo(
    () =>
      encodeURIComponent(
        `/payment/context${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
      ),
    [searchParams]
  );

  const isErrorUi = wantsConfirm && confirmPhase === "error";
  const isTimeoutUi = wantsConfirm && confirmPhase === "timed_out";
  const isBusyUi =
    wantsConfirm &&
    (confirmPhase === "working" || confirmPhase === "idle");

  const isNeedsAuthUi = wantsConfirm && confirmPhase === "needs_auth";

  let subtitle = wantsConfirm
    ? "Hang tight while we confirm your payment and update your account."
    : "Thank you. Your transaction completed and your subscription or credits will update shortly. You can review details anytime in billing.";

  if (wantsConfirm) {
    if (confirmPhase === "needs_auth") {
      subtitle =
        "Login with the account you used for checkout so we can confirm your payment and apply your plan or credits.";
    } else if (confirmPhase === "working") {
      subtitle =
        "Confirming payment with our billing provider and updating your account…";
    } else if (confirmPhase === "confirmed") {
      subtitle =
        "You're all set — your subscription or credits are updated in your account.";
    } else if (confirmPhase === "timed_out") {
      subtitle =
        "We're still finalizing your payment. Open billings to verify, or refresh this page in a moment.";
    } else if (confirmPhase === "error") {
      subtitle =
        "We couldn't confirm your payment from this page. Your charge may still succeed — check billings or try confirming again.";
    }
  }

  const showSpinner =
    wantsConfirm &&
    !isErrorUi &&
    !isTimeoutUi &&
    !isNeedsAuthUi &&
    (confirmPhase === "working" ||
      (confirmPhase === "idle" && Boolean(user) && !authLoading));

  const cardRing =
    isErrorUi || isTimeoutUi
      ? "border-amber-200/70 shadow-amber-500/5 dark:border-amber-500/25"
      : isBusyUi || isNeedsAuthUi
        ? "border-indigo-200/55 shadow-indigo-500/5 dark:border-indigo-500/25"
        : "border-emerald-200/60 shadow-emerald-500/5 dark:border-emerald-500/20";

  const iconWrap =
    isErrorUi || isTimeoutUi
      ? "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-500/30"
      : isBusyUi || isNeedsAuthUi
        ? "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:ring-indigo-500/25"
        : "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-500/30";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12 font-(--font-sora) text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-[10%] left-1/2 h-[min(480px,85vw)] w-[min(480px,85vw)] -translate-x-1/2 rounded-full bg-emerald-400/15 blur-[100px] dark:bg-emerald-500/10" />
        <div className="absolute -bottom-[8%] right-[-6%] h-[min(360px,70vw)] w-[min(360px,70vw)] rounded-full bg-teal-400/12 blur-[90px] dark:bg-teal-500/8" />
      </div>

      <div className="relative w-full max-w-lg animate-in fade-in zoom-in-95 duration-500">
        <div
          className={`glass-card rounded-3xl border bg-white/90 p-8 shadow-lg dark:bg-card/95 sm:p-10 ${cardRing}`}
        >
          <div
            className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ring-1 ${iconWrap}`}
          >
            {isErrorUi || isTimeoutUi ? (
              <AlertTriangle className="h-9 w-9" aria-hidden />
            ) : isNeedsAuthUi ? (
              <Lock className="h-9 w-9" aria-hidden />
            ) : (
              <CheckCircle2 className="h-9 w-9" aria-hidden />
            )}
          </div>

          {isErrorUi ? (
            <h1 className="text-center text-2xl font-extrabold tracking-tight text-amber-950 sm:text-3xl dark:text-amber-100">
              Couldn&apos;t verify from this page
            </h1>
          ) : isTimeoutUi ? (
            <h1 className="text-center text-2xl font-extrabold tracking-tight text-amber-950 sm:text-3xl dark:text-amber-100">
              Still confirming
            </h1>
          ) : isNeedsAuthUi ? (
            <h1 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
              <span className="text-indigo-700 dark:text-indigo-400">
                Login
              </span>{" "}
              <span className="bg-gradient-primary-text">to finish</span>
            </h1>
          ) : isBusyUi ? (
            <h1 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
              <span className="text-indigo-700 dark:text-indigo-400">
                Confirming
              </span>{" "}
              <span className="bg-gradient-primary-text">payment</span>
            </h1>
          ) : (
            <h1 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
              <span className="text-emerald-700 dark:text-emerald-400">
                Payment
              </span>{" "}
              <span className="bg-gradient-primary-text">successful</span>
            </h1>
          )}
          <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground font-(--font-dm-sans)">
            {subtitle}
          </p>
          {showSpinner ? (
            <div className="mt-4 flex justify-center">
              <Loader2
                className={`size-8 animate-spin ${isBusyUi ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400"}`}
                aria-hidden
              />
              <span className="sr-only">Confirming payment</span>
            </div>
          ) : null}

          {wantsConfirm && confirmPhase === "needs_auth" ? (
            <div className="mt-6 flex justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href={`/sign-in?returnTo=${signInReturnTo}`}>
                  Login to confirm
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
          ) : null}

          {wantsConfirm && confirmPhase === "error" ? (
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                size="lg"
                className="gap-2"
                onClick={() => void runCheckoutConfirmation()}
              >
                Try again
              </Button>
            </div>
          ) : null}

          {hasDetails ? (
            <dl
              className={`mt-6 space-y-3 rounded-2xl border p-4 text-sm font-(--font-dm-sans) ${
                isErrorUi || isTimeoutUi
                  ? "border-amber-100/90 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-950/20"
                  : "border-emerald-100/80 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-950/20"
              }`}
            >
              {email ? (
                <div className="flex gap-3">
                  <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                    <Mail className="size-3.5 shrink-0" aria-hidden />
                    <span>Email</span>
                  </dt>
                  <dd className="min-w-0 break-all font-medium text-foreground">
                    {email}
                  </dd>
                </div>
              ) : null}
              {status ? (
                <div className="flex gap-3">
                  <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                    <Activity className="size-3.5 shrink-0" aria-hidden />
                    <span>Status</span>
                  </dt>
                  <dd>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isErrorUi || isTimeoutUi
                          ? "bg-amber-600/15 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200"
                          : "bg-emerald-600/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                      }`}
                    >
                      {formatLabelStatus(status)}
                    </span>
                  </dd>
                </div>
              ) : null}
              {subscriptionId ? (
                <div className="flex gap-3">
                  <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                    <Hash className="size-3.5 shrink-0" aria-hidden />
                    <span>Subscription</span>
                  </dt>
                  <dd className="min-w-0 font-mono text-xs font-medium text-foreground break-all">
                    {subscriptionId}
                  </dd>
                </div>
              ) : null}
              {orderIdFromUrl ? (
                <div className="flex gap-3">
                  <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                    <Hash className="size-3.5 shrink-0" aria-hidden />
                    <span>Order</span>
                  </dt>
                  <dd className="min-w-0 font-mono text-xs font-medium text-foreground break-all">
                    {orderIdFromUrl}
                  </dd>
                </div>
              ) : null}
              {displaySessionId ? (
                <div className="flex gap-3">
                  <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                    <Hash className="size-3.5 shrink-0" aria-hidden />
                    <span>Checkout session</span>
                  </dt>
                  <dd className="min-w-0 font-mono text-xs font-medium text-foreground break-all">
                    {displaySessionId}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/settings/billings" className="gap-2">
                View billings
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/home">Back to home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
