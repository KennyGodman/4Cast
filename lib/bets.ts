/**
 * Copyright 2026 Circle Internet Group, Inc.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserBet {
  id: string;
  txHash: string;
  marketId: string;
  marketTitle: string;
  side: "YES" | "NO";
  amount: number;
  placedAt: string;
  status: "open" | "settled";
  outcome?: "YES" | "NO" | "Undetermined";
  claimed?: boolean;
}

export const USER_BETS_STORAGE_KEY = "4cast_user_bets";
const LEGACY_BETS_STORAGE_KEY = "4cast_bets";

/**
 * Retrieve all user bets from localStorage.
 * Automatically migrates legacy "4cast_bets" entries if found.
 */
export function getUserBets(): UserBet[] {
  if (typeof window === "undefined") return [];

  try {
    const rawUserBets = localStorage.getItem(USER_BETS_STORAGE_KEY);
    const rawLegacyBets = localStorage.getItem(LEGACY_BETS_STORAGE_KEY);

    let bets: UserBet[] = rawUserBets ? JSON.parse(rawUserBets) : [];

    // Migrate any legacy bets stored under "4cast_bets"
    if (rawLegacyBets) {
      try {
        const legacyBets: UserBet[] = JSON.parse(rawLegacyBets);
        if (Array.isArray(legacyBets) && legacyBets.length > 0) {
          const existingIds = new Set(bets.map((b) => b.id));
          const toAdd = legacyBets.filter((b) => !existingIds.has(b.id));
          bets = [...toAdd, ...bets];
          localStorage.setItem(USER_BETS_STORAGE_KEY, JSON.stringify(bets));
          localStorage.removeItem(LEGACY_BETS_STORAGE_KEY);
        }
      } catch (e) {
        console.warn("Failed to parse legacy bets:", e);
      }
    }

    return Array.isArray(bets) ? bets : [];
  } catch (err) {
    console.warn("Failed to read user bets from localStorage:", err);
    return [];
  }
}

/**
 * Save a new or updated bet to localStorage and notify listeners.
 */
export function saveUserBet(bet: UserBet): UserBet[] {
  if (typeof window === "undefined") return [bet];

  try {
    const current = getUserBets();
    const filtered = current.filter((b) => b.id !== bet.id);
    const updated = [bet, ...filtered];

    localStorage.setItem(USER_BETS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("4cast_bets_updated", { detail: updated }));
    return updated;
  } catch (err) {
    console.warn("Failed to save user bet:", err);
    return [bet];
  }
}

/**
 * Update an existing bet by ID.
 */
export function updateUserBet(id: string, updates: Partial<UserBet>): UserBet[] {
  if (typeof window === "undefined") return [];

  try {
    const current = getUserBets();
    const updated = current.map((b) => (b.id === id ? { ...b, ...updates } : b));

    localStorage.setItem(USER_BETS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("4cast_bets_updated", { detail: updated }));
    return updated;
  } catch (err) {
    console.warn("Failed to update user bet:", err);
    return [];
  }
}

/**
 * Helper to generate a realistic testnet transaction hash if one is not provided by a wallet.
 */
export function generateTxHash(): string {
  const chars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}
