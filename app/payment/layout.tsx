import { ReactNode } from 'react';

interface PaymentLayoutProps {
  children: ReactNode;
}

export default function PaymentLayout({ children }: PaymentLayoutProps) {
  return <div>{children}</div>;
}