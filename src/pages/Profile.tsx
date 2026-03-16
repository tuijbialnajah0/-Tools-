import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { User as UserIcon, Save, CheckCircle2, AlertCircle, Sparkles, Trophy, Star, Zap, X, ChevronRight } from "lucide-react";
import { calculateExp, getRank, getNextRank, RANKS } from "../lib/ranks";

const MALE_AVATARS = Array.from({ length: 250 }, (_, i) => ({
  id: `m-${i}`,
  url: `https://api.dicebear.com/7.x/adventurer/svg?seed=M${i + 500}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
}));

const FEMALE_AVATARS = Array.from({ length: 250 }, (_, i) => ({
  id: `f-${i}`,
  url: `https://api.dicebear.com/7.x/lorelei/svg?seed=F${i + 500}&backgroundColor=ffdfbf,ffd5dc,d1d4f9`,
}));

export function Profile() {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [age, setAge] = useState(user?.age?.toString() || "");
  const [gender, setGender] = useState<"male" | "female" | "other">(user?.gender || "other");
  const [avatarTab, setAvatarTab] = useState<"male" | "female">(user?.gender === "female" ? "female" : "male");
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar_url || MALE_AVATARS[0].url);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showRankModal, setShowRankModal] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setAge(user.age?.toString() || "");
      setGender(user.gender || "other");
      setSelectedAvatar(user.avatar_url || (user.gender === "female" ? FEMALE_AVATARS[0].url : MALE_AVATARS[0].url));
      if (user.gender === "female") setAvatarTab("female");
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim() || null,
          age: age ? parseInt(age, 10) : null,
          gender: gender,
          avatar_url: selectedAvatar,
        })
        .eq("id", user.id);

      if (error) {
        if (error.code === "23505") {
          throw new Error("Username is already taken. Please choose another one.");
        }
        throw error;
      }

      updateUser({
        username: username.trim() || null,
        age: age ? parseInt(age, 10) : null,
        gender: gender,
        avatar_url: selectedAvatar,
      });

      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setMessage({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setIsSaving(false);
    }
  };

  const exp = calculateExp(user?.total_spent || 0);
  const currentRank = getRank(exp);
  const nextRank = getNextRank(exp);
  const progress = nextRank 
    ? ((exp - currentRank.minExp) / (nextRank.minExp - currentRank.minExp)) * 100 
    : 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center">
            Your Profile
            <UserIcon className="w-6 h-6 ml-2 text-indigo-500" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Customize how you appear on the platform.
          </p>
        </div>
        
        {/* Rank Badge */}
        <button 
          onClick={() => setShowRankModal(true)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
            <Trophy className={`w-6 h-6 ${currentRank.color}`} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Rank</div>
            <div className={`text-xl font-black ${currentRank.color}`}>{currentRank.name}</div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 ml-4 group-hover:text-indigo-500 transition-colors" />
        </button>
      </div>

      {/* Experience & Progress Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Zap className="w-32 h-32 text-indigo-500" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg mr-3">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Experience Points</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">10 Credits Spent = 1 EXP</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Passive Income</div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-end">
                <span className="mr-1">💳</span>
                +{currentRank.reward} <span className="text-[10px] ml-1 text-slate-400">/ 20m</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-slate-900 dark:text-white">{exp.toLocaleString()} <span className="text-sm font-bold text-slate-400 uppercase">EXP</span></div>
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{currentRank.category}</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
            <span className="text-slate-400">Progress to {nextRank?.name || "Max Rank"}</span>
            <span className="text-indigo-600 dark:text-indigo-400">{Math.floor(progress)}%</span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(79,70,229,0.4)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          {nextRank && (
            <div className="text-[10px] text-center text-slate-400 font-medium">
              Need {(nextRank.minExp - exp).toLocaleString()} more EXP for <span className={`font-bold ${nextRank.color}`}>{nextRank.name}</span>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-start ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-lg overflow-hidden">
                  <img src={selectedAvatar} alt="Profile Preview" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-1.5 rounded-full shadow-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a unique username"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-all"
                />
                <p className="text-[10px] text-slate-500 mt-1">Must be unique across all users.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gender
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["male", "female", "other"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all capitalize ${
                        gender === g
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Your age"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Profile
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Avatar Grid */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                Choose Avatar
                <span className="ml-2 text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  500+ Aesthetic Styles
                </span>
              </h3>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setAvatarTab("male")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    avatarTab === "male"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab("female")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    avatarTab === "female"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  Female
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {(avatarTab === "male" ? MALE_AVATARS : FEMALE_AVATARS).map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar.url)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${
                    selectedAvatar === avatar.url
                      ? "border-indigo-600 ring-2 ring-indigo-500/20"
                      : "border-transparent bg-slate-50 dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <img src={avatar.url} alt={`Avatar ${avatar.id}`} className="w-full h-full object-cover" />
                  {selectedAvatar === avatar.url && (
                    <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                      <div className="bg-indigo-600 text-white p-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rank Modal */}
      {showRankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Rank Progression</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">See all available ranks and requirements</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRankModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-4">
                {RANKS.map((rank, index) => {
                  const isCurrentRank = rank.name === currentRank.name;
                  const isPastRank = exp >= rank.minExp;
                  
                  return (
                    <div 
                      key={rank.name}
                      className={`flex items-center p-4 rounded-2xl border transition-all ${
                        isCurrentRank 
                          ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm" 
                          : isPastRank
                            ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-50"
                      }`}
                    >
                      <div className="w-12 text-center font-bold text-slate-400 dark:text-slate-500">
                        #{index + 1}
                      </div>
                      
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 flex-shrink-0 ${
                        isCurrentRank ? "bg-indigo-100 dark:bg-indigo-900/40" : "bg-slate-100 dark:bg-slate-800"
                      }`}>
                        <Trophy className={`w-6 h-6 ${rank.color}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className={`text-lg font-black truncate ${rank.color}`}>
                            {rank.name}
                          </h3>
                          {isCurrentRank && (
                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-full">
                              You are here
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {rank.category}
                        </div>
                      </div>
                      
                      <div className="text-right ml-4 flex-shrink-0">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          {rank.minExp.toLocaleString()} <span className="text-[10px] text-slate-500 uppercase">EXP</span>
                        </div>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end">
                          <span className="mr-1">💳</span>
                          +{rank.reward} <span className="text-[10px] ml-1 text-slate-400">/ 20m</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Earn 1 EXP for every 10 credits spent. Higher ranks grant more passive income!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
