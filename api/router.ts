import { authRouter } from "./auth-router";
import { storeRouter } from "./storeRouter";
import { scrapingRouter } from "./scrapingRouter";
import { walletRouter } from "./walletRouter";
import { translateRouter } from "./translateRouter";
import { paypalRouter } from "./paypalRouter";
import { siteRouter } from "./siteRouter";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  store: storeRouter,
  scraping: scrapingRouter,
  wallet: walletRouter,
  translate: translateRouter,
  paypal: paypalRouter,
  site: siteRouter,
});

export type AppRouter = typeof appRouter;
