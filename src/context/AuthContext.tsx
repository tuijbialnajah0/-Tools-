import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { auth, db } from "../firebase";

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

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
  "kamronbazoz@gmail.com",
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid, firebaseUser.email || "");
      } else {
        setUser(null);
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    const profileRef = doc(db, "profiles", userId);
    
    try {
      const docSnap = await getDoc(profileRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profile = {
          id: userId,
          ...data,
          created_at: data.created_at instanceof Timestamp ? data.created_at.toDate().toISOString() : data.created_at
        } as User;

        // Force admin role if email is in the list
        if (ADMIN_EMAILS.includes(profile.email) && profile.role !== "admin") {
          profile.role = "admin";
        }
        setUser(profile);
      } else {
        // Create profile if it doesn't exist
        const role = ADMIN_EMAILS.includes(email) ? "admin" : "user";
        const newProfile: User = {
          id: userId,
          email: email,
          username: null,
          age: null,
          gender: null,
          avatar_url: `https://api.dicebear.com/7.x/lorelei/svg?seed=${userId}`,
          role,
          credit_balance: 100,
          total_spent: 0,
          created_at: new Date().toISOString()
        };

        await setDoc(profileRef, {
          ...newProfile,
          created_at: Timestamp.now()
        });
        setUser(newProfile);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `profiles/${userId}`);
    } finally {
      setLoading(false);
      setIsAuthReady(true);
    }
  };

  const login = (userData: User) => setUser(userData);
  
  const logout = async () => {
    await signOut(auth);
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
