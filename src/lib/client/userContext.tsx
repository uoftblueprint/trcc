"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/client/supabase/client";

interface UserContextValue {
  user: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
});

export function UserProvider({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Fetch the initial session
    supabase.auth
      .getUser()
      .then(({ data }: { data: { user: User | null } }) => {
        setUser(data.user);
      })
      .catch((error: unknown) => {
        console.error("Error fetching user:", error);
      })
      .finally(() => {
        setLoading(false);
      });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return (): void => {
      subscription.unsubscribe();
    };
  }, []);

  return <UserContext value={{ user, loading }}>{children}</UserContext>;
}

export function useUser(): UserContextValue {
  return useContext(UserContext);
}
