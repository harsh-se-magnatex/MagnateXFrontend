import { BadgeDollarSign } from 'lucide-react';
import { LegalDocument, LegalPage } from '../_components/legal-page';

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      subtitle="Effective date: 28 May 2026 · Last updated: 28 May 2026"
      icon={BadgeDollarSign}
      iconTone="emerald"
    >
      <LegalDocument>
        <p>
          This Refund Policy describes when and how refunds are issued for
          purchases made on the SocioGenie platform operated by{' '}
          <strong>MAGNATEX LLP</strong> (LLPIN: ACU-5689), with its registered
          office at 111, Fortune Business Hub, Sola, Nr. Satyamev Elysium,
          Ahmedabad, Gujarat 380060, India. It forms part of, and is
          incorporated into, our <a href="/legal/terms">Terms of Service</a>.
        </p>

        <h2>1. General Principle</h2>
        <p>
          SocioGenie is a digital, AI-powered Software-as-a-Service product.
          Subscription fees and Credit purchases are pre-paid and, as a rule,{' '}
          <strong>non-refundable</strong>. Refunds are not granted for
          dissatisfaction with AI-generated outputs, change of mind, lack of
          engagement on social platforms, third-party platform decisions
          (e.g., account suspension by Meta or LinkedIn), or unused portions of
          a billing cycle. We may, however, issue refunds in the limited
          circumstances described below, on a{' '}
          <strong>case-by-case basis</strong> at our sole discretion.
        </p>

        <h2>2. Merchant of Record &amp; Currency</h2>
        <p>
          All purchases on SocioGenie are processed by our authorised payment
          partner, <strong>Dodo Payments Inc.</strong>, which acts as the{' '}
          <strong>Merchant of Record (“MoR”)</strong>. All charges are billed
          and settled in <strong>United States Dollars (USD)</strong>. Where a
          refund is approved, it is processed by Dodo Payments to the{' '}
          <strong>original payment instrument in USD</strong>. The exact amount
          credited to you in your local currency may vary based on prevailing
          exchange rates, foreign-transaction fees, or bank/card-issuer
          policies, none of which are within our control or reimbursable by
          us.
        </p>

        <h2>3. Free Trial</h2>
        <p>
          Eligible new Users may activate a{' '}
          <strong>10-day free trial of the Elite plan</strong> by providing a
          valid payment method. You will <strong>not</strong> be charged during
          the trial period. If you do not cancel before the trial ends, your
          payment method will be automatically charged the full Elite
          subscription fee and your subscription will begin.
        </p>
        <p>
          To avoid being charged, you must cancel before the end of the 10-day
          trial from your account settings. We do not provide refunds for
          forgetting to cancel before the trial ends. As a courtesy, if you
          notify us within <strong>48 hours</strong> of the initial charge and
          have not consumed any AI Credits or published any posts during the
          paid period, we may at our discretion issue a one-time refund.
        </p>

        <h2>4. Subscription Plans</h2>

        <h3>4.1 Monthly subscriptions</h3>
        <p>
          Monthly subscriptions (<strong>Prime</strong> at USD 24.99,{' '}
          <strong>Elite</strong> at USD 39.99, and <strong>Legacy</strong> at
          USD 59.99 per month) are <strong>non-refundable</strong> once the
          billing cycle has started. You may cancel at any time from your
          account settings to prevent the next renewal; your access continues
          until the end of the current paid cycle.
        </p>

        <h3>4.2 Plan upgrades and downgrades</h3>
        <p>
          Upgrades take effect immediately and are billed on a pro-rated
          basis. Downgrades take effect at the start of the next billing
          cycle; no partial refunds are issued for unused days at the higher
          tier.
        </p>

        <h2>5. Credits</h2>
        <p>
          <strong>All Credits — Base Credits and Top-Up Credits — are strictly
          non-refundable, non-transferable, and have no cash value.</strong>{' '}
          This includes:
        </p>
        <ul>
          <li>
            <strong>Base Credits</strong> included with a subscription. These
            reset on each renewal and expire when the subscription expires or
            is cancelled. Unused Base Credits do not roll over and are not
            refunded.
          </li>
          <li>
            <strong>Top-Up Credits</strong> (Starter — USD 4.99, Basic — USD
            9.99, Growth — USD 19.99, Business — USD 39.99). Top-Up Credits
            expire <strong>30 days</strong> after purchase, require an active
            subscription to be used, and are not refundable for any reason
            including expiry, cancellation, or non-use.
          </li>
        </ul>
        <p>
          The only exception is where Credits were deducted in error due to a
          verified technical failure on our side (see Section 6.2). In such
          cases, we re-credit the affected Credits to your Account; we do not
          refund cash.
        </p>

        <h2>6. Eligible Refund Scenarios</h2>
        <p>
          Refunds may be considered, at our sole discretion, in the following
          limited scenarios:
        </p>

        <h3>6.1 Duplicate or accidental charges</h3>
        <p>
          If you are charged more than once for the same subscription period
          or the same Top-Up Credit purchase due to a billing error, we will
          refund the duplicate amount in full upon verification.
        </p>

        <h3>6.2 Verified technical failure</h3>
        <p>
          If you paid for the Services but were unable to use them for a
          material period due to a reproducible defect or outage attributable
          solely to SocioGenie (not to third-party platforms such as Meta,
          LinkedIn, Google, or your internet connection), and our support team
          is unable to resolve the issue within a reasonable timeframe, we may
          issue a partial or full refund or, alternatively, re-credit affected
          Credits or extend your subscription period.
        </p>

        <h3>6.3 Unauthorised or fraudulent charge</h3>
        <p>
          If a transaction was made on your Account without your authorisation,
          contact us at{' '}
          <a href="mailto:founder@magnatex.co">founder@magnatex.co</a>{' '}
          <strong>within 7 days</strong> of the charge. Following investigation
          (which may require identity verification and may involve our payment
          partner Dodo), we will refund verified unauthorised charges.
        </p>

        <h3>6.4 Statutory rights</h3>
        <p>
          Where applicable law (for example, mandatory consumer-protection
          rules in your country of residence) grants you a right to a refund
          that cannot be excluded by contract, that right prevails over this
          Policy.
        </p>

        <h2>7. Non-Refundable Scenarios</h2>
        <p>
          By way of example and not limitation, refunds will not be issued
          for:
        </p>
        <ul>
          <li>
            change of mind, buyer’s remorse, or accidental purchase after use
            has begun;
          </li>
          <li>
            dissatisfaction with the quality, tone, accuracy, or engagement
            performance of AI-generated content;
          </li>
          <li>failure to cancel before automatic renewal;</li>
          <li>
            unused portions of a billing cycle after cancellation;
          </li>
          <li>
            partial use of Credits or unused Credits that have expired;
          </li>
          <li>
            third-party-platform actions, including account suspensions, content
            takedowns, rate limits, API changes, or algorithmic decisions made
            by Meta, LinkedIn, Google, or any other connected service;
          </li>
          <li>
            inability to use the Services due to your own equipment, network,
            browser, ad-blockers, VPNs, regional restrictions, or
            disconnection of a Connected Account;
          </li>
          <li>
            violation of our <a href="/legal/terms">Terms of Service</a>,
            including suspension or termination of your Account for cause.
          </li>
        </ul>

        <h2>8. How to Request a Refund</h2>
        <p>
          To request a refund, please email{' '}
          <a href="mailto:founder@magnatex.co">founder@magnatex.co</a> from the
          email address registered with your Account, with the following
          information:
        </p>
        <ul>
          <li>Your full name and Account email;</li>
          <li>Date of the charge and amount (USD);</li>
          <li>
            Order / invoice ID from Dodo Payments (visible in your receipt
            email);
          </li>
          <li>Reason for the refund request, with any supporting evidence.</li>
        </ul>
        <p>
          We will acknowledge your request within <strong>48 hours</strong> and
          reach a decision within <strong>7 business days</strong>. We may
          request additional information to verify the claim.
        </p>

        <h2>9. Refund Processing &amp; Timelines</h2>
        <ul>
          <li>
            Approved refunds are issued by <strong>Dodo Payments</strong> to
            the <strong>original payment method</strong> in USD. We cannot
            issue refunds to a different card, bank account, wallet, or via
            cheque.
          </li>
          <li>
            Once approved, refunds are typically processed within{' '}
            <strong>5 – 10 business days</strong>, but the time for the funds
            to appear on your statement depends on your bank or card issuer
            and may take up to 21 business days.
          </li>
          <li>
            Currency-conversion losses, foreign-transaction fees, or any other
            charges imposed by your bank are not reimbursed.
          </li>
        </ul>

        <h2>10. Chargebacks</h2>
        <p>
          If you believe a charge is incorrect, please contact us first at{' '}
          <a href="mailto:founder@magnatex.co">founder@magnatex.co</a> before
          initiating a chargeback or dispute with your card issuer or bank. We
          will work in good faith to resolve any genuine issue promptly.
        </p>
        <p>
          Initiating a chargeback or payment dispute without first attempting
          to resolve the matter with us is a violation of our Terms of Service
          and may result in:
        </p>
        <ul>
          <li>immediate suspension or termination of your Account;</li>
          <li>forfeiture of all remaining subscription time and Credits;</li>
          <li>
            recovery of legal, administrative, and chargeback fees imposed on
            us by Dodo Payments or the card networks;
          </li>
          <li>a permanent ban from future use of the Services.</li>
        </ul>

        <h2>11. Cancellations</h2>
        <p>
          You may cancel your subscription at any time from your account
          settings or by emailing{' '}
          <a href="mailto:support@magnatex.co">support@magnatex.co</a>.
          Cancellation stops future renewals; it does not retroactively refund
          past charges. Your Account remains active and you continue to have
          access to your remaining Base Credits until the end of the current
          paid billing cycle.
        </p>

        <h2>12. Changes to This Policy</h2>
        <p>
          We may update this Refund Policy from time to time. The updated
          version takes effect when posted, and the “Last updated” date at the
          top of this page will be revised accordingly. Material changes will
          be communicated through the Services or via email where required.
          Refund requests are governed by the version of this Policy in effect
          on the date the original charge was made.
        </p>

        <h2>13. Contact</h2>
        <ul>
          <li>
            <strong>Refunds &amp; billing disputes:</strong>{' '}
            <a href="mailto:founder@magnatex.co">founder@magnatex.co</a>
          </li>
          <li>
            <strong>General support:</strong>{' '}
            <a href="mailto:support@magnatex.co">support@magnatex.co</a>
          </li>
          <li>
            <strong>Sales:</strong>{' '}
            <a href="mailto:sales@magnatex.co">sales@magnatex.co</a>
          </li>
          <li>
            <strong>Working hours:</strong> Monday – Friday, 09:00 – 18:00 IST
          </li>
          <li>
            <strong>Postal:</strong> MAGNATEX LLP, 111, Fortune Business Hub,
            Sola, Nr. Satyamev Elysium, Ahmedabad, Gujarat 380060, India
          </li>
        </ul>
      </LegalDocument>
    </LegalPage>
  );
}
