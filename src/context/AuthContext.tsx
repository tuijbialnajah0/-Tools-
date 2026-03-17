import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export type User = {
  id: string;
  email: string;
  username: string | null;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  avatar_url: string | null;
  role: "user" | "admin";
  credit_balance: number;
  total_spent: number;
  created_at: string;
  theme?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAuthReady: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = [
  "nadiaparveen1526@gmail.com",
  "tuijbialnajah@gmail.com",
  "tuijbialnajah0@gmail.com",
  "pintrestk11@gmail.com",
  "kamranaliarts69@gmail.com",
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("auth-user-profile");
      if (cached) {
        try { return JSON.parse(cached); } catch (e) { return null; }
      }
    }
    return null;
  });
  
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("auth-user-profile");
    }
    return true;
  });
  
  const [isAuthReady, setIsAuthReady] = useState(() => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("auth-user-profile");
    }
    return false;
  });

  const fetchPromiseRef = useRef<Promise<void> | null>(null);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (typeof window !== "undefined") {
      if (newUser) {
        localStorage.setItem("auth-user-profile", JSON.stringify(newUser));
      } else {
        localStorage.removeItem("auth-user-profile");
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async (userId: string) => {
      try {
        // Only show loading if we have absolutely no user data
        if (!user && !localStorage.getItem("auth-user-profile")) {
          setLoading(true);
        }
        
        const fetchPromise = supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Profile fetch timeout")), 8000)
        );

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

        if (error) {
          if (error.code === "PGRST116") {
            console.log("Profile missing for user:", userId, "Attempting to create...");
            const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
            
            if (userError) throw userError;

            if (authUser?.email) {
              const role = ADMIN_EMAILS.includes(authUser.email) ? "admin" : "user";
              
              const profileData: any = { 
                id: userId, 
                email: authUser.email, 
                role, 
                credit_balance: 100, 
                total_spent: 0,
                avatar_url: `https://api.dicebear.com/7.x/lorelei/svg?seed=${userId}`
              };

              const { data: newProfile, error: insertError } = await supabase
                .from("profiles")
                .insert([profileData])
                .select()
                .single();

              if (insertError) {
                if (insertError.code === "23505") {
                  const { data: retryData, error: retryError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", userId)
                    .single();
                    
                  if (!retryError && retryData && mounted) {
                    const profile = retryData as User;
                    if (ADMIN_EMAILS.includes(profile.email) && profile.role !== "admin") {
                      profile.role = "admin";
                    }
                    setUser(profile);
                    return;
                  }
                }
                throw insertError;
              }

              if (newProfile && mounted) {
                setUser(newProfile as User);
              }
            }
          } else {
            throw error;
          }
        } else {
          const profile = data as User;
          if (ADMIN_EMAILS.includes(profile.email) && profile.role !== "admin") {
            profile.role = "admin";
          }
          if (mounted) setUser(profile);
        }
      } catch (error: any) {
        console.error("AuthContext Error:", error);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          console.warn("Using fallback user profile due to fetch error");
          const email = session.user.email || "";
          const role = ADMIN_EMAILS.includes(email) ? "admin" : "user";
          setUser({
            id: session.user.id,
            email,
            username: null,
            age: null,
            gender: null,
            avatar_url: `https://api.dicebear.com/7.x/lorelei/svg?seed=${session.user.id}`,
            role,
            credit_balance: 0,
            total_spent: 0,
            created_at: new Date().toISOString(),
          });
        } else if (mounted) {
          // Verify session is actually gone before logging out
          const { data: { session: checkSession } } = await supabase.auth.getSession();
          if (!checkSession) {
            setUser(null);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setIsAuthReady(true);
        }
      }
    };

    const handleFetchProfile = (userId: string) => {
      if (!fetchPromiseRef.current) {
        fetchPromiseRef.current = fetchProfile(userId).finally(() => {
          fetchPromiseRef.current = null;
        });
      }
      return fetchPromiseRef.current;
    };

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user) {
          if (mounted) {
            setUser(null);
            setLoading(false);
            setIsAuthReady(true);
          }
          return;
        }
        await handleFetchProfile(session.user.id);
      } catch (err) {
        if (mounted) {
          // Do not immediately log out on network errors
          setLoading(false);
          setIsAuthReady(true);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        // Do NOT set isAuthReady to false here, it causes the loading screen to flash on token refresh
        await handleFetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (mounted && session?.user && !user) {
            handleFetchProfile(session.user.id);
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const login = (userData: User) => setUser(userData);
  
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) setUser({ ...user, ...updates });
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthReady, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
