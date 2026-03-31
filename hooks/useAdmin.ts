"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { AdminUser } from "@/types";

export function useAdmin() {
  const { user, isLoading, setUser, setLoading, clearAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) {
        clearAuth();
        return;
      }
      supabase
        .from("admins")
        .select("*")
        .eq("auth_id", authUser.id)
        .single()
        .then(({ data }) => {
          setUser(data as AdminUser | null);
        });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        clearAuth();
        router.push("/login");
      }
    });

    return () => listener.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearAuth();
    router.push("/login");
  }

  return { user, isLoading, signOut };
}

export function useRequireAdmin() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  return { user, isLoading };
}
