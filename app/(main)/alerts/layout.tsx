import { ArrowLeft } from "lucide-react";
import Link from "next/link";


export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>

      <Link href="/settings/notifications">
        <ArrowLeft/>
      </Link>
      </div>
      {children}  
    </div>
  );
}
