import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { createOrder, captureOrder } from "./services/paypal";

/* ============================================
   PayPal tRPC Router
   ============================================ */

export const paypalRouter = createRouter({
  // Create a new PayPal order
  createOrder: publicQuery
    .input(
      z.object({
        storeId: z.number().positive(),
        productName: z.string().min(1),
        amount: z.number().positive(),
        currency: z.string().length(3).default("USD"),
        buyerEmail: z.string().email(),
        buyerName: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return createOrder(input);
    }),

  // Capture payment
  captureOrder: publicQuery
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input }) => {
      return captureOrder(input.orderId);
    }),

  // Get PayPal connect URL
  connectUrl: publicQuery.query(() => {
    return { url: "https://www.paypal.com/business/signup" };
  }),
});
