import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  decimal,
  json,
  index,
} from "drizzle-orm/mysql-core";

/* ============================================
   EzShop.ai — Complete Database Schema
   ============================================ */

/**
 * Users table — managed by OAuth auth system
 * The auth feature auto-creates this, we extend it
 */
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  plan: mysqlEnum("plan", ["starter", "growth", "empire"]).default("starter").notNull(),
  paypalEmail: varchar("paypal_email", { length: 320 }),
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("en"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Stores — each user can have multiple one-product stores
 */
export const stores = mysqlTable(
  "stores",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    template: varchar("template", { length: 50 }).default("modern").notNull(),
    primaryLanguage: varchar("primary_language", { length: 10 }).default("en").notNull(),
    languages: json("languages").$type<string[]>(),
    status: mysqlEnum("status", ["active", "paused", "deleted"]).default("active").notNull(),
    subdomain: varchar("subdomain", { length: 100 }).notNull().unique(),
    customDomain: varchar("custom_domain", { length: 255 }),
    views: int("views").default(0).notNull(),
    clicks: int("clicks").default(0).notNull(),
    conversions: int("conversions").default(0).notNull(),
    revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("stores_user_id_idx").on(table.userId),
    statusIdx: index("stores_status_idx").on(table.status),
  })
);

export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;

/**
 * Products — each store has one product (one-product store model)
 */
export const products = mysqlTable(
  "products",
  {
    id: serial("id").primaryKey(),
    storeId: bigint("storeId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    sourceUrl: text("sourceUrl").notNull(),
    sourcePlatform: varchar("source_platform", { length: 50 }).notNull(), // aliexpress, cjdropshipping, etc.
    originalTitle: varchar("original_title", { length: 500 }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    aiDescription: text("ai_description"),
    painPoints: json("pain_points").$type<string[]>(),
    benefits: json("benefits").$type<string[]>(),
    specifications: json("specifications").$type<Record<string, string>>(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    images: json("images").$type<string[]>(),
    faqs: json("faqs").$type<{ question: string; answer: string }[]>(),
    reviews: json("reviews").$type<{ author: string; rating: number; text: string; date: string }[]>(),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: varchar("seo_description", { length: 500 }),
    category: varchar("category", { length: 100 }),
    tags: json("tags").$type<string[]>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    storeIdIdx: index("products_store_id_idx").on(table.storeId),
    userIdIdx: index("products_user_id_idx").on(table.userId),
  })
);

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Wallets — user's prepaid balance for commission payments
 */
export const wallets = mysqlTable(
  "wallets",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
    balance: decimal("balance", { precision: 12, scale: 2 }).default("0").notNull(),
    totalDeposited: decimal("total_deposited", { precision: 12, scale: 2 }).default("0").notNull(),
    totalCharged: decimal("total_charged", { precision: 12, scale: 2 }).default("0").notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    status: mysqlEnum("status", ["active", "frozen", "closed"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("wallets_user_id_idx").on(table.userId),
  })
);

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = typeof wallets.$inferInsert;

/**
 * Wallet Transactions — every deposit, charge, or refund
 */
export const walletTransactions = mysqlTable(
  "wallet_transactions",
  {
    id: serial("id").primaryKey(),
    walletId: bigint("walletId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    type: mysqlEnum("type", ["deposit", "charge", "refund", "bonus"]).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    description: varchar("description", { length: 255 }),
    relatedStoreId: bigint("related_store_id", { mode: "number", unsigned: true }),
    relatedOrderId: bigint("related_order_id", { mode: "number", unsigned: true }),
    metadata: json("metadata").$type<Record<string, unknown>>(), // optional extra data
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    walletIdIdx: index("wt_wallet_id_idx").on(table.walletId),
    userIdIdx: index("wt_user_id_idx").on(table.userId),
    typeIdx: index("wt_type_idx").on(table.type),
  })
);

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = typeof walletTransactions.$inferInsert;

/**
 * Orders — track sales on each store for analytics & commission
 */
export const orders = mysqlTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    storeId: bigint("storeId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
    commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
    commissionRate: varchar("commission_rate", { length: 20 }).notNull(),
    orderValue: decimal("order_value", { precision: 10, scale: 2 }).notNull(),
    customerCurrency: varchar("customer_currency", { length: 3 }).default("USD").notNull(),
    customerCountry: varchar("customer_country", { length: 2 }),
    status: mysqlEnum("status", ["pending", "confirmed", "refunded", "cancelled"]).default("pending").notNull(),
    customerEmail: varchar("customer_email", { length: 320 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    storeIdIdx: index("orders_store_id_idx").on(table.storeId),
    userIdIdx: index("orders_user_id_idx").on(table.userId),
    statusIdx: index("orders_status_idx").on(table.status),
  })
);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Store Analytics — daily aggregated stats for dashboards
 */
export const storeAnalytics = mysqlTable(
  "store_analytics",
  {
    id: serial("id").primaryKey(),
    storeId: bigint("storeId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
    views: int("views").default(0).notNull(),
    uniqueVisitors: int("unique_visitors").default(0).notNull(),
    clicks: int("clicks").default(0).notNull(),
    conversions: int("conversions").default(0).notNull(),
    revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0").notNull(),
    avgTimeOnPage: int("avg_time_on_page").default(0),
    bounceRate: decimal("bounce_rate", { precision: 5, scale: 2 }).default("0"),
    topCountries: json("top_countries").$type<Record<string, number>>(),
    topReferrers: json("top_referrers").$type<Record<string, number>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    storeDateIdx: index("analytics_store_date_idx").on(table.storeId, table.date),
    storeIdIdx: index("analytics_store_id_idx").on(table.storeId),
  })
);

export type StoreAnalytics = typeof storeAnalytics.$inferSelect;
export type InsertStoreAnalytics = typeof storeAnalytics.$inferInsert;

/**
 * Scraping Jobs — track and queue URL scraping tasks
 */
export const scrapingJobs = mysqlTable(
  "scraping_jobs",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    sourceUrl: text("sourceUrl").notNull(),
    sourcePlatform: varchar("source_platform", { length: 50 }).notNull(),
    status: mysqlEnum("status", ["queued", "scraping", "ai_processing", "completed", "failed"]).default("queued").notNull(),
    storeId: bigint("storeId", { mode: "number", unsigned: true }),
    productId: bigint("productId", { mode: "number", unsigned: true }),
    errorMessage: text("error_message"),
    rawData: json("raw_data").$type<Record<string, unknown>>(),
    processingTimeMs: int("processing_time_ms"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("scraping_user_id_idx").on(table.userId),
    statusIdx: index("scraping_status_idx").on(table.status),
  })
);

export type ScrapingJob = typeof scrapingJobs.$inferSelect;
export type InsertScrapingJob = typeof scrapingJobs.$inferInsert;
