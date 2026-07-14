import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { translateContent } from "./services/gemini";
import { getAllCurrencies, convertCurrency, formatCurrency } from "./services/currency";

/* ============================================
   Translation & Currency tRPC Router
   ============================================ */

export const translateRouter = createRouter({
  // Translate content to target language
  translate: publicQuery
    .input(
      z.object({
        content: z.string().min(1).max(10000),
        targetLanguage: z.string().length(2),
      })
    )
    .mutation(async ({ input }) => {
      const translated = await translateContent(input.content, input.targetLanguage);
      return { translated };
    }),

  // Get list of supported currencies
  currencies: publicQuery.query(() => {
    return getAllCurrencies();
  }),

  // Convert currency
  convert: publicQuery
    .input(
      z.object({
        amount: z.number().positive(),
        from: z.string().length(3).toUpperCase(),
        to: z.string().length(3).toUpperCase(),
      })
    )
    .query(({ input }) => {
      const converted = convertCurrency(input.amount, input.from, input.to);
      return {
        original: { amount: input.amount, currency: input.from },
        converted: { amount: converted, currency: input.to },
        formatted: formatCurrency(converted, input.to),
      };
    }),

  // Batch convert (for a store price to multiple currencies)
  batchConvert: publicQuery
    .input(
      z.object({
        amount: z.number().positive(),
        from: z.string().length(3).toUpperCase(),
        targets: z.array(z.string().length(3).toUpperCase()),
      })
    )
    .query(({ input }) => {
      const results = input.targets.map((to) => ({
        currency: to,
        amount: convertCurrency(input.amount, input.from, to),
        formatted: formatCurrency(convertCurrency(input.amount, input.from, to), to),
      }));
      return results;
    }),
});
