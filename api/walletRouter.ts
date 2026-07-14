import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import {
  getOrCreateWallet,
  addFunds,
  chargeCommission,
  findTransactionsByUser,
  calculateCommission,
} from "./queries/wallets";
import { TRPCError } from "@trpc/server";

/* ============================================
   Wallet tRPC Router
   ============================================ */

export const walletRouter = createRouter({
  // Get current user's wallet
  get: authedQuery.query(async ({ ctx }) => {
    return getOrCreateWallet(ctx.user.id);
  }),

  // Add funds to wallet (MVP: simulated deposit)
  deposit: authedQuery
    .input(
      z.object({
        amount: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0 && num <= 10000;
        }, "Amount must be between 0 and 10000"),
        description: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return addFunds(
        ctx.user.id,
        input.amount,
        input.description ?? "Wallet deposit"
      );
    }),

  // Calculate commission for an order (preview only)
  previewCommission: authedQuery
    .input(z.object({ orderValue: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const plan = ctx.user.plan ?? "starter";
      return calculateCommission(plan, input.orderValue);
    }),

  // Charge commission (called when order is confirmed)
  charge: authedQuery
    .input(
      z.object({
        amount: z.string(),
        storeId: z.number().positive().optional(),
        orderId: z.number().positive().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await chargeCommission(
        ctx.user.id,
        input.amount,
        input.storeId,
        input.orderId,
        input.description
      );

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error ?? "Insufficient wallet balance",
        });
      }

      return result.wallet;
    }),

  // Get transaction history
  transactions: authedQuery
    .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return findTransactionsByUser(ctx.user.id, input?.limit ?? 50);
    }),
});
