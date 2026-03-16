import React, { createContext, useContext, useState, useEffect } from "react";
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
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let loadingTimeout: any;

    // Set a safety timeout to prevent infinite loading
    loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth loading timed out, forcing completion");
        setLoading(false);
      }
    }, 5000);

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Error checking session:", err);
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    });

    // Re-check session when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          console.log("Profile missing for user:", userId, "Attempting to create...");
          // Profile missing - try to create it
          const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error("Error getting auth user:", userError);
            throw userError;
          }

          if (authUser?.email) {
            const role = ADMIN_EMAILS.includes(authUser.email) ? "admin" : "user";

            console.log("Inserting profile for:", authUser.email, "with role:", role);
            const { data: newProfile, error: insertError } = await supabase
              .from("profiles")
              .insert([{ 
                id: userId, 
                email: authUser.email, 
                role, 
                credit_balance: 100, 
                total_spent: 0,
                avatar_url: `https://api.dicebear.com/7.x/lorelei/svg?seed=${userId}`
              }])
              .select()
              .single();

            if (insertError) {
              console.error("Failed to create profile in DB:", insertError);
              // If it's a conflict, it might have been created by the trigger, so try fetching again
              if (insertError.code === "23505") {
                console.log("Profile already exists (likely created by trigger), fetching again...");
                return fetchProfile(userId);
              }
              throw insertError;
            }

            if (newProfile) {
              console.log("Successfully created profile in DB:", newProfile);
              setUser(newProfile as User);
              return;
            }
          } else {
            console.error("Auth user has no email, cannot create profile");
          }
        }
        throw error;
      }

      // Force admin role if email is in the list, even if DB says otherwise
      const profile = data as User;
      if (ADMIN_EMAILS.includes(profile.email) && profile.role !== "admin") {
        profile.role = "admin";
      }

      setUser(profile);
    } catch (error: any) {
      console.error("AuthContext Error:", error);

      // Fallback: If we have an auth session but profile fetch failed,
      // set a minimal user object so they aren't stuck on the login page.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
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
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = (userData: User) => setUser(userData);
  
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) setUser({ ...user, ...updates });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
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
