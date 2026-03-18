export type RankInfo = {
  name: string;
  minExp: number;
  category: "Hunter / Warrior" | "Supernatural" | "Rulers & Divine" | "Cosmic";
  color: string;
  reward: number;
};

export const RANKS: RankInfo[] = [
  { name: "Ash", minExp: 0, category: "Hunter / Warrior", color: "text-slate-500", reward: 10 },
  { name: "Fang", minExp: 100, category: "Hunter / Warrior", color: "text-emerald-500", reward: 15 },
  { name: "Claw", minExp: 250, category: "Hunter / Warrior", color: "text-teal-500", reward: 23 },
  { name: "Hunter", minExp: 500, category: "Hunter / Warrior", color: "text-cyan-500", reward: 35 },
  { name: "Slayer", minExp: 800, category: "Hunter / Warrior", color: "text-blue-500", reward: 53 },
  { name: "Reaper", minExp: 1200, category: "Supernatural", color: "text-indigo-500", reward: 80 },
  { name: "Phantom", minExp: 1700, category: "Supernatural", color: "text-violet-500", reward: 120 },
  { name: "Wraith", minExp: 2400, category: "Supernatural", color: "text-purple-500", reward: 180 },
  { name: "Demon", minExp: 3200, category: "Supernatural", color: "text-fuchsia-500", reward: 270 },
  { name: "Abyss", minExp: 4500, category: "Supernatural", color: "text-pink-500", reward: 405 },
  { name: "Overlord", minExp: 6000, category: "Rulers & Divine", color: "text-rose-500", reward: 608 },
  { name: "Tyrant", minExp: 8000, category: "Rulers & Divine", color: "text-orange-500", reward: 912 },
  { name: "Mythic", minExp: 11111, category: "Rulers & Divine", color: "text-amber-500", reward: 1368 },
  { name: "Celestial", minExp: 15000, category: "Rulers & Divine", color: "text-yellow-500", reward: 2052 },
  { name: "Astral", minExp: 20000, category: "Rulers & Divine", color: "text-lime-500", reward: 3078 },
  { name: "Eternal", minExp: 50000, category: "Cosmic", color: "text-green-500", reward: 4617 },
  { name: "Cosmic", minExp: 100000, category: "Cosmic", color: "text-sky-500", reward: 6926 },
  { name: "Omni", minExp: 250000, category: "Cosmic", color: "text-blue-600", reward: 10389 },
  { name: "Singularity", minExp: 750000, category: "Cosmic", color: "text-indigo-600", reward: 15584 },
  { name: "Void", minExp: 10000000, category: "Cosmic", color: "text-slate-900 dark:text-white", reward: 23376 },
];

export function calculateExp(totalSpent: number): number {
  if (typeof totalSpent !== 'number' || isNaN(totalSpent)) return 0;
  return Math.floor(totalSpent / 10);
}

export function getRank(exp: number): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (exp >= RANKS[i].minExp) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function getNextRank(exp: number): RankInfo | null {
  for (let i = 0; i < RANKS.length; i++) {
    if (exp < RANKS[i].minExp) {
      return RANKS[i];
    }
  }
  return null;
}
