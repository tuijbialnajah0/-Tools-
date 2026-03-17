import React, { useState } from "react";
import { X, Send, AlertCircle, CheckCircle2, Database } from "lucide-react";
import { db } from "../firebase";
import { collection, query, where, getDocs, runTransaction, doc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

interface SendCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SendCreditModal({ isOpen, onClose }: SendCreditModalProps) {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      setError("You must be logged in to send credits.");
      return;
    }

    const creditAmount = parseInt(amount, 10);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    if (user.role !== "admin" && user.credit_balance < creditAmount) {
      setError("Insufficient credits.");
      return;
    }

    if (username.trim() === user.username) {
      setError("You cannot send credits to yourself.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Find receiver by username
      const profilesRef = collection(db, "profiles");
      const q = query(profilesRef, where("username", "==", username.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Username doesn't exist.");
        setIsSubmitting(false);
        return;
      }

      const receiverDoc = querySnapshot.docs[0];
      const receiverId = receiverDoc.id;
      const receiverData = receiverDoc.data();

      // Use a transaction for atomic transfer
      await runTransaction(db, async (transaction) => {
        const senderRef = doc(db, "profiles", user.id);
        const receiverRef = doc(db, "profiles", receiverId);

        const senderSnap = await transaction.get(senderRef);
        if (!senderSnap.exists()) {
          throw new Error("Sender profile not found.");
        }

        const currentSenderBalance = senderSnap.data().credit_balance || 0;
        
        if (user.role !== "admin" && currentSenderBalance < creditAmount) {
          throw new Error("Insufficient credits.");
        }

        // Deduct from sender (if not admin)
        if (user.role !== "admin") {
          transaction.update(senderRef, {
            credit_balance: currentSenderBalance - creditAmount
          });
        }

        // Add to receiver
        const currentReceiverBalance = receiverData.credit_balance || 0;
        transaction.update(receiverRef, {
          credit_balance: currentReceiverBalance + creditAmount
        });

        // Log transaction
        const logRef = doc(collection(db, "credit_transactions"));
        transaction.set(logRef, {
          sender_id: user.id,
          receiver_id: receiverId,
          amount: creditAmount,
          type: "transfer",
          timestamp: new Date().toISOString()
        });
      });

      // Update local user state if not admin
      if (user.role !== "admin") {
        updateUser({ credit_balance: user.credit_balance - creditAmount });
      }

      setSuccess(`Successfully sent ${creditAmount} credits to ${username.trim()}.`);
      setUsername("");
      setAmount("");
    } catch (err: any) {
      console.error("Error sending credits:", err);
      setError(err.message || "An error occurred while sending credits.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copySqlFix = () => {
    const sql = `
-- Run this in Supabase SQL Editor to enable credit transfers:

CREATE OR REPLACE FUNCTION transfer_credits(p_sender_id UUID, p_receiver_id UUID, p_amount INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_balance INT;
BEGIN
  -- Security check: ensure the caller is the sender
  IF auth.uid() != p_sender_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only transfer your own credits';
  END IF;

  -- Check if amount is valid
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  -- Get sender's current balance
  SELECT credit_balance INTO v_sender_balance
  FROM public.profiles
  WHERE id = p_sender_id;

  -- Check if sender has enough credits
  IF v_sender_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Deduct from sender
  UPDATE public.profiles
  SET credit_balance = credit_balance - p_amount
  WHERE id = p_sender_id;

  -- Add to receiver
  UPDATE public.profiles
  SET credit_balance = credit_balance + p_amount
  WHERE id = p_receiver_id;
END;
$$;
    `.trim();
    navigator.clipboard.writeText(sql);
    alert("SQL fix copied to clipboard! Please run it in your Supabase SQL Editor.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <Send className="w-5 h-5 text-indigo-500 mr-2" />
            Send Credits
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex flex-col items-start">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl flex items-start">
              <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Recipient Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Amount
              </label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Send className="w-5 h-5 mr-2" />
                )}
                Send Credits
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
