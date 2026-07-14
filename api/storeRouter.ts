import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import {
  findStoresByUser,
  findStoreById,
  findStoreWithProduct,
  createStore,
  updateStore,
  deleteStore,
  getUserDashboardStats,
  countStoresByUser,
  findProductByStoreId,
} from "./queries/stores";
import { TRPCError } from "@trpc/server";

/* ============================================
   Store tRPC Router
   ============================================ */

export const storeRouter = createRouter({
  // List all stores for the authenticated user
  list: authedQuery.query(async ({ ctx }) => {
    return findStoresByUser(ctx.user.id);
  }),

  // Get a single store with its product
  getById: authedQuery
    .input(z.object({ storeId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const result = await findStoreWithProduct(input.storeId);
      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });
      }
      if (result.store.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return result;
    }),

  // Create a new store (used after scraping)
  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(255),
        template: z.string().max(50).optional(),
        primaryLanguage: z.string().max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const storeCount = await countStoresByUser(ctx.user.id);

      // Check plan limits
      const plan = ctx.user.plan ?? "starter";
      const limits: Record<string, number> = {
        starter: 3,
        growth: 15,
        empire: 999,
      };
      const limit = limits[plan] ?? 3;

      if (storeCount >= limit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Your ${plan} plan allows up to ${limit} stores. Upgrade to create more.`,
        });
      }

      const store = await createStore({
        userId: ctx.user.id,
        name: input.name,
        template: input.template,
        primaryLanguage: input.primaryLanguage,
      });

      if (!store) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create store" });
      }

      return store;
    }),

  // Update a store
  update: authedQuery
    .input(
      z.object({
        storeId: z.number().positive(),
        name: z.string().min(1).max(255).optional(),
        template: z.string().max(50).optional(),
        status: z.enum(["active", "paused", "deleted"]).optional(),
        primaryLanguage: z.string().max(10).optional(),
        languages: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { storeId, ...data } = input;
      const existing = await findStoreById(storeId);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });
      }
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return updateStore(storeId, data);
    }),

  // Soft-delete a store
  delete: authedQuery
    .input(z.object({ storeId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await findStoreById(input.storeId);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });
      }
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await deleteStore(input.storeId);
      return { success: true };
    }),

  // Get product for a store
  getProduct: authedQuery
    .input(z.object({ storeId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const store = await findStoreById(input.storeId);
      if (!store) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });
      }
      if (store.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return findProductByStoreId(input.storeId);
    }),

  // Dashboard stats
  dashboard: authedQuery.query(async ({ ctx }) => {
    return getUserDashboardStats(ctx.user.id);
  }),
});
