"use client";

import { useEffect, useState } from "react";
import axiosClient from "@/lib/axios";
import { useUser } from "./useUser";
import { useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { setUser } = useUser();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await axiosClient.get("/api/v1/user/auth/me");
        setUser(res.data.user);
        setLoading(false);
      } catch (error) {
        router.push("/sign-in");
      }
    };

    checkSession();
  }, [router, setUser]);

  if (loading) return null;

  return <>{children}</>;
}