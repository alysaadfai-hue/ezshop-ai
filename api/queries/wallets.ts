import { eq, desc } from "drizzle-orm";
import { getDb } from "./connection";
import { wallets, walletTransactions } from "@db/schema";

/* ============================================
   Wallet Query Functions
   ============================================ */

export async function findWalletByUser(userId: number) {
  const rows = await getDb()
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);
  return rows.at(0);
}

export async function createWallet(userId: number) {
  await getDb()
    .insert(wallets)
    .values({ userId, balance: "0", totalDeposited: "0", totalCharged: "0" });

  return findWalletByUser(userId);
}

export async function getOrCreateWallet(userId: number) {
  const wallet = await findWalletByUser(userId);
  if (wallet) return wallet;
  return createWallet(userId);
}

export async function addFunds(userId: number, amount: string, description?: string) {
  let wallet = await getOrCreateWallet(userId);
  wallet = wallet!; // guaranteed after getOrCreate

  const newBalance = (parseFloat(wallet.balance.toString()) + parseFloat(amount)).toFixed(2);
  const newDeposited = (parseFloat(wallet.totalDeposited.toString()) + parseFloat(amount)).toFixed(2);

  await getDb()
    .update(wallets)
    .set({
      balance: newBalance,
      totalDeposited: newDeposited,
    })
    .where(eq(wallets.id, wallet.id));

  await getDb().insert(walletTransactions).values({
    walletId: wallet.id,
    userId,
    type: "deposit",
    amount,
    description: description ?? "Wallet deposit",
  });

  return findWalletByUser(userId);
}

export async function chargeCommission(
  userId: number,
  amount: string,
  storeId?: number,
  orderId?: number,
  description?: string
) {
  let wallet = await getOrCreateWallet(userId);
  wallet = wallet!;
  const currentBalance = parseFloat(wallet.balance.toString());
  const chargeAmount = parseFloat(amount);

  if (currentBalance < chargeAmount) {
    return { success: false, error: "Insufficient balance", wallet };
  }

  const newBalance = (currentBalance - chargeAmount).toFixed(2);
  const newCharged = (parseFloat(wallet.totalCharged.toString()) + chargeAmount).toFixed(2);

  await getDb()
    .update(wallets)
    .set({
      balance: newBalance,
      totalCharged: newCharged,
    })
    .where(eq(wallets.id, wallet.id));

  await getDb().insert(walletTransactions).values({
    walletId: wallet.id,
    userId,
    type: "charge",
    amount,
    description: description ?? "Commission charge",
    relatedStoreId: storeId,
    relatedOrderId: orderId,
  });

  const updated = await findWalletByUser(userId);
  return { success: true, wallet: updated };
}

export async function findTransactionsByUser(userId: number, limit = 50) {
  return getDb()
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, userId))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(limit);
}

// Commission calculation based on plan
export function calculateCommission(plan: string, orderValue: number): { flat: number; percentage: number; total: number } {
  const rates: Record<string, { flat: number; pct: number }> = {
    starter: { flat: 3.49, pct: 0.07 },
    growth: { flat: 1.99, pct: 0.045 },
    empire: { flat: 0.99, pct: 0.025 },
  };

  const rate = rates[plan] ?? rates.starter;
  const percentage = orderValue * rate.pct;
  const total = rate.flat + percentage;

  return { flat: rate.flat, percentage, total };
}
