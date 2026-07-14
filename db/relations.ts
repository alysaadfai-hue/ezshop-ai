import { relations } from "drizzle-orm";
import { users, stores, products, wallets, walletTransactions, orders, storeAnalytics, scrapingJobs } from "./schema";

/* ============================================
   EzShop.ai — Database Relations
   ============================================ */

export const usersRelations = relations(users, ({ many, one }) => ({
  stores: many(stores),
  products: many(products),
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId],
  }),
  orders: many(orders),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  user: one(users, {
    fields: [stores.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [stores.id],
    references: [products.storeId],
  }),
  orders: many(orders),
  analytics: many(storeAnalytics),
}));

export const productsRelations = relations(products, ({ one }) => ({
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [products.userId],
    references: [users.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [walletTransactions.walletId],
    references: [wallets.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));

export const storeAnalyticsRelations = relations(storeAnalytics, ({ one }) => ({
  store: one(stores, {
    fields: [storeAnalytics.storeId],
    references: [stores.id],
  }),
}));

export const scrapingJobsRelations = relations(scrapingJobs, ({ one }) => ({
  user: one(users, {
    fields: [scrapingJobs.userId],
    references: [users.id],
  }),
}));
