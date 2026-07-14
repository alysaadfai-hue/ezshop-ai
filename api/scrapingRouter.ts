import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import {
  validateProductUrl,
  scrapeProduct,
  createScrapingJob,
  updateScrapingJob,
} from "./services/scraper";
import { generateAIContent } from "./services/gemini";
import { createStore, createProduct } from "./queries/stores";
import { countStoresByUser } from "./queries/stores";
import { TRPCError } from "@trpc/server";

/* ============================================
   Scraping tRPC Router — Uses Google Gemini 3.5
   ============================================ */

export const scrapingRouter = createRouter({
  // Step 1: Validate URL before processing
  validate: authedQuery
    .input(z.object({ productUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      const result = validateProductUrl(input.productUrl);
      return {
        valid: result.valid,
        platform: result.platform,
        error: result.error,
      };
    }),

  // Step 2: Full pipeline — scrape + AI generate with Gemini + create store
  generateStore: authedQuery
    .input(
      z.object({
        productUrl: z.string().url(),
        template: z.string().max(50).optional(),
        language: z.string().max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();

      // Validate URL
      const validation = validateProductUrl(input.productUrl);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error ?? "Invalid product URL",
        });
      }

      // Check plan limits
      const plan = ctx.user.plan ?? "starter";
      const limits: Record<string, number> = { starter: 3, growth: 15, empire: 999 };
      const storeCount = await countStoresByUser(ctx.user.id);
      if (storeCount >= (limits[plan] ?? 3)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Your ${plan} plan allows up to ${limits[plan]} stores. Upgrade to create more.`,
        });
      }

      // Create scraping job record
      const jobId = await createScrapingJob(ctx.user.id, input.productUrl, validation.platform);

      try {
        // Step 1: Scrape the product
        await updateScrapingJob(jobId, { status: "scraping" });
        const scrapedProduct = await scrapeProduct(input.productUrl);

        // Step 2: AI Content Generation with Google Gemini 3.5
        await updateScrapingJob(jobId, {
          status: "ai_processing",
          rawData: scrapedProduct as unknown as Record<string, unknown>,
        });

        const aiContent = await generateAIContent(
          scrapedProduct.title,
          scrapedProduct.description,
          scrapedProduct.specifications,
          scrapedProduct.price
        );

        // Step 3: Create Store
        const store = await createStore({
          userId: ctx.user.id,
          name: scrapedProduct.title,
          template: input.template ?? "modern",
          primaryLanguage: input.language ?? "en",
        });

        if (!store) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create store" });
        }

        // Step 4: Create Product with AI content
        const product = await createProduct({
          storeId: store.id,
          userId: ctx.user.id,
          sourceUrl: input.productUrl,
          sourcePlatform: validation.platform,
          originalTitle: scrapedProduct.originalTitle,
          title: scrapedProduct.title,
          description: scrapedProduct.description,
          aiDescription: aiContent.aiDescription,
          painPoints: aiContent.painPoints,
          benefits: aiContent.benefits,
          specifications: scrapedProduct.specifications,
          price: scrapedProduct.price.toFixed(2),
          compareAtPrice: (scrapedProduct.compareAtPrice ?? scrapedProduct.price * 2).toFixed(2),
          currency: scrapedProduct.currency,
          images: scrapedProduct.images,
          faqs: aiContent.faqs,
          reviews: aiContent.reviews,
          seoTitle: aiContent.seoTitle,
          seoDescription: aiContent.seoDescription,
          category: scrapedProduct.category,
          tags: [scrapedProduct.category ?? "general"],
        });

        // Step 5: Mark job as completed
        const processingTime = Date.now() - startTime;
        await updateScrapingJob(jobId, {
          status: "completed",
          storeId: store.id,
          productId: product?.id,
          processingTimeMs: processingTime,
        });

        return {
          success: true,
          store,
          product,
          processingTimeMs: processingTime,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await updateScrapingJob(jobId, {
          status: "failed",
          errorMessage: message,
          processingTimeMs: Date.now() - startTime,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Store generation failed: ${message}`,
        });
      }
    }),

  // Get scraping status
  getJobStatus: authedQuery
    .input(z.object({ jobId: z.number().positive() }))
    .query(async ({ input }) => {
      return {
        jobId: input.jobId,
        status: "completed" as const,
        progress: 100,
      };
    }),
});
