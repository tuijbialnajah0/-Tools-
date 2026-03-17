import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Wrench, Loader2, Mail, Lock, User, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function AuthPage() {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname === "/login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/");
    setIsLogin(location.pathname === "/login");
  }, [user, navigate, location.pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Set a timeout for the auth request
      const authPromise = isLogin 
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
          });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timed out. Please check your connection.")), 15000)
      );

      const { data, error: authError } = await Promise.race([authPromise, timeoutPromise]) as any;
      if (authError) {
        throw authError;
      }
      
      // If signup requires email verification, session will be null
      if (!isLogin && data?.user && !data?.session) {
        setError("Registration successful! Please check your email to verify your account.");
        setLoading(false);
        return;
      }

      // Do not navigate here or set loading to false for successful logins.
      // The onAuthStateChange in AuthContext will fetch the profile,
      // update the user state, and the useEffect above will navigate to "/".
      // Keeping loading=true ensures the button shows a spinner during this process.
    } catch (err: any) {
      setError(err.message || "An error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Premium Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e1b4b,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,#312e81,transparent_50%)]" />
      
      <motion.div 
        className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-2xl relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-500/10 rounded-2xl mb-4">
            <Wrench className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-slate-400 mt-2">
            {isLogin ? "Sign in to access your tools" : "Join us to start building"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={isLogin ? "login" : "signup"}
            initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder-slate-600"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder-slate-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="password"
                placeholder="Password"
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder-slate-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Sign In" : "Sign Up")}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </motion.form>
        </AnimatePresence>

        <div className="mt-8 text-center text-sm">
          <span className="text-slate-500">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </span>
          <button
            onClick={() => navigate(isLogin ? "/register" : "/login")}
            className="ml-2 text-indigo-400 font-semibold hover:text-indigo-300"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
