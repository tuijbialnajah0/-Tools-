import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Search, Edit2, Check, X, Plus, Minus, RefreshCw, UserX, AlertCircle, Database } from "lucide-react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { adminUpdateCredits } from "../../lib/toolService";

type User = {
  id: string;
  email: string;
  username: string | null;
  age: number | null;
  gender: string | null;
  avatar_url: string | null;
  role: string;
  credit_balance: number;
  total_spent: number;
  created_at: string;
};

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingCredits, setEditingCredits] = useState<string | null>(null);
  const [creditInput, setCreditInput] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const profilesRef = collection(db, "profiles");
      const q = query(profilesRef, orderBy("created_at", "desc"));
      const querySnapshot = await getDocs(q);

      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
      } as User));

      setUsers(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unknown error occurred while fetching users.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCredits = async (userId: string) => {
    try {
      const amount = parseInt(creditInput, 10);
      if (isNaN(amount)) return;

      await adminUpdateCredits(userId, amount, "set", "Admin adjustment");

      setEditingCredits(null);
      fetchUsers();
    } catch (error) {
      console.error(error);
    }
  };

  const handleQuickAdjust = async (userId: string, amount: number) => {
    try {
      await adminUpdateCredits(
        userId, 
        Math.abs(amount), 
        amount > 0 ? "add" : "deduct", 
        "Admin quick adjustment"
      );

      fetchUsers();
    } catch (error) {
      console.error(error);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manage Users</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View and manage user accounts and credits.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px] flex flex-col">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 flex items-center text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Fetching users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <UserX className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No users found</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6">
              {search ? `No users match "${search}"` : "The user database is currently empty."}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={fetchUsers}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Fetch
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Gender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Credits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-indigo-700 dark:text-indigo-400 font-bold">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {user.username || "No username"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {user.email}
                        </div>
                        {user.age && (
                          <div className="text-[10px] text-slate-400">
                            Age: {user.age}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === "admin"
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400"
                          : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">
                      {user.gender || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingCredits === user.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          className="w-24 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                          value={creditInput}
                          onChange={(e) => setCreditInput(e.target.value)}
                        />
                        <button
                          onClick={() => handleUpdateCredits(user.id)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCredits(null)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center text-sm text-slate-900 dark:text-white">
                        <span className="mr-1.5">💳</span>
                        {user.credit_balance}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    💳 {(user.total_spent || 0).toFixed(0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {format(new Date(user.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleQuickAdjust(user.id, 100)}
                        className="p-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                        title="Add 100 Credits"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(user.id, -100)}
                        className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        title="Deduct 100 Credits"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCredits(user.id);
                          setCreditInput(user.credit_balance.toString());
                        }}
                        className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                        title="Edit Manually"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List */}
        <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
          {filteredUsers.map((user) => (
            <div key={user.id} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-indigo-700 dark:text-indigo-400 font-bold">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                      {user.username || user.email.split('@')[0]}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {user.email}
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    user.role === "admin"
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400"
                      : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                  }`}
                >
                  {user.role}
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="mr-1.5">💳</span>
                    {editingCredits === user.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          value={creditInput}
                          onChange={(e) => setCreditInput(e.target.value)}
                        />
                        <button
                          onClick={() => handleUpdateCredits(user.id)}
                          className="p-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCredits(null)}
                          className="p-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span>{user.credit_balance} Credits</span>
                    )}
                  </div>
                  <div className="flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="text-slate-500 dark:text-slate-400 mr-1.5">Spent:</span>
                    💳 {(user.total_spent || 0).toFixed(0)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleQuickAdjust(user.id, 100)}
                    className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleQuickAdjust(user.id, -100)}
                    className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  {editingCredits !== user.id && (
                    <button
                      onClick={() => {
                        setEditingCredits(user.id);
                        setCreditInput(user.credit_balance.toString());
                      }}
                      className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
</div>
);
}
