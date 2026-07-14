import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { findStoreWithProduct } from "./queries/stores";
import { generateStoreHtml } from "./services/staticSite";
import { TRPCError } from "@trpc/server";

/* ============================================
   Static Site Generation tRPC Router
   ============================================ */

export const siteRouter = createRouter({
  // Generate static HTML for a store
  generate: authedQuery
    .input(z.object({ storeId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const data = await findStoreWithProduct(input.storeId);
      if (!data) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });
      }
      if (data.store.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const html = generateStoreHtml(data.store, data.product!);
      return { html, storeName: data.store.name };
    }),

  // Export store as downloadable HTML
  export: authedQuery
    .input(z.object({ storeId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const data = await findStoreWithProduct(input.storeId);
      if (!data) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });
      }
      if (data.store.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const html = generateStoreHtml(data.store, data.product!);
      return {
        html,
        filename: `${data.store.slug}-store.html`,
        downloadUrl: `data:text/html;base64,${Buffer.from(html).toString("base64")}`,
      };
    }),
});
