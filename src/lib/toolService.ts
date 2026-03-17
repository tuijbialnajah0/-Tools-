import { 
  doc, 
  runTransaction, 
  collection, 
  addDoc, 
  Timestamp,
  getDoc
} from "firebase/firestore";
import { db } from "../firebase";

export async function executeTool(userId: string, toolId: string, customCost?: number) {
  const userRef = doc(db, "profiles", userId);
  const toolRef = doc(db, "tools", toolId);

  try {
    return await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const toolDoc = await transaction.get(toolRef);

      if (!userDoc.exists()) throw new Error("User profile not found");
      if (!toolDoc.exists()) throw new Error("Tool not found");

      const userData = userDoc.data();
      const toolData = toolDoc.data();
      const cost = customCost !== undefined ? customCost : toolData.credit_cost;

      if (!toolData.enabled) throw new Error("Tool is disabled");
      if (userData.credit_balance < cost) {
        throw new Error("Insufficient credits");
      }

      // Deduct credits
      transaction.update(userRef, {
        credit_balance: userData.credit_balance - cost,
        total_spent: (userData.total_spent || 0) + cost
      });

      // Log usage
      const usageRef = doc(collection(db, "tool_usage"));
      transaction.set(usageRef, {
        user_id: userId,
        tool_id: toolId,
        credits_spent: cost,
        created_at: Timestamp.now()
      });

      // Log history
      const historyRef = doc(collection(db, "credit_history"));
      transaction.set(historyRef, {
        user_id: userId,
        amount: cost,
        type: "deduct",
        reason: `Used tool: ${toolData.tool_name}`,
        created_at: Timestamp.now()
      });

      return { success: true, toolName: toolData.tool_name };
    });
  } catch (error) {
    console.error("Error executing tool:", error);
    throw error;
  }
}

export async function adminUpdateCredits(userId: string, amount: number, action: 'add' | 'deduct' | 'set', reason: string) {
  const userRef = doc(db, "profiles", userId);

  try {
    return await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("User not found");

      const userData = userDoc.data();
      let newBalance = userData.credit_balance;
      let diff = 0;
      let type: 'add' | 'deduct' | 'set' = action;

      if (action === 'add') {
        newBalance += amount;
        diff = amount;
      } else if (action === 'deduct') {
        newBalance = Math.max(0, newBalance - amount);
        diff = userData.credit_balance - newBalance;
      } else if (action === 'set') {
        newBalance = amount;
        diff = Math.abs(amount - userData.credit_balance);
        type = amount > userData.credit_balance ? 'add' : 'deduct';
      }

      transaction.update(userRef, { credit_balance: newBalance });

      if (diff > 0) {
        const historyRef = doc(collection(db, "credit_history"));
        transaction.set(historyRef, {
          user_id: userId,
          amount: diff,
          type: type,
          reason: reason || "Admin adjustment",
          created_at: Timestamp.now()
        });
      }

      return { success: true, newBalance };
    });
  } catch (error) {
    console.error("Error updating credits:", error);
    throw error;
  }
}
