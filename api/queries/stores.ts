import { eq, desc, and, sql } from "drizzle-orm";
import { getDb } from "./connection";
import { stores, products, storeAnalytics } from "@db/schema";
import type { InsertProduct, InsertStoreAnalytics } from "@db/schema";

/* ============================================
   Store Query Functions
   ============================================ */

// Generate a unique subdomain from store name
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return `${base}-${Date.now().toString(36)}`;
}

export async function findStoresByUser(userId: number) {
  return getDb()
    .select()
    .from(stores)
    .where(eq(stores.userId, userId))
    .orderBy(desc(stores.createdAt));
}

export async function findStoreById(storeId: number) {
  const rows = await getDb()
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  return rows.at(0);
}

export async function findStoreBySlug(slug: string) {
  const rows = await getDb()
    .select()
    .from(stores)
    .where(eq(stores.slug, slug))
    .limit(1);
  return rows.at(0);
}

export async function findStoreWithProduct(storeId: number) {
  const store = await findStoreById(storeId);
  if (!store) return null;

  const productRows = await getDb()
    .select()
    .from(products)
    .where(eq(products.storeId, storeId))
    .limit(1);

  return { store, product: productRows.at(0) ?? null };
}

export async function createStore(data: {
  userId: number;
  name: string;
  template?: string;
  primaryLanguage?: string;
}) {
  const slug = generateSlug(data.name);
  const subdomain = slug;

  const result = await getDb()
    .insert(stores)
    .values({
      userId: data.userId,
      name: data.name,
      slug,
      subdomain,
      template: data.template ?? "modern",
      primaryLanguage: data.primaryLanguage ?? "en",
    })
    .$returningId();

  const storeId = result[0].id;
  return findStoreById(storeId);
}

export async function updateStore(
  storeId: number,
  data: Partial<{
    name: string;
    template: string;
    status: "active" | "paused" | "deleted";
    primaryLanguage: string;
    languages: string[];
  }>
) {
  await getDb()
    .update(stores)
    .set(data)
    .where(eq(stores.id, storeId));

  return findStoreById(storeId);
}

export async function deleteStore(storeId: number) {
  await getDb()
    .update(stores)
    .set({ status: "deleted" })
    .where(eq(stores.id, storeId));
}

export async function incrementStoreViews(storeId: number) {
  await getDb()
    .update(stores)
    .set({ views: sql`${stores.views} + 1` })
    .where(eq(stores.id, storeId));
}

export async function incrementStoreClicks(storeId: number) {
  await getDb()
    .update(stores)
    .set({ clicks: sql`${stores.clicks} + 1` })
    .where(eq(stores.id, storeId));
}

export async function incrementStoreConversions(storeId: number, revenue: string) {
  await getDb()
    .update(stores)
    .set({
      conversions: sql`${stores.conversions} + 1`,
      revenue: sql`${stores.revenue} + ${revenue}`,
    })
    .where(eq(stores.id, storeId));
}

// Count stores by user
export async function countStoresByUser(userId: number) {
  const result = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(stores)
    .where(and(eq(stores.userId, userId), eq(stores.status, "active")));
  return result[0]?.count ?? 0;
}

/* ============================================
   Product Query Functions
   ============================================ */

export async function findProductByStoreId(storeId: number) {
  const rows = await getDb()
    .select()
    .from(products)
    .where(eq(products.storeId, storeId))
    .limit(1);
  return rows.at(0);
}

export async function createProduct(data: InsertProduct) {
  const result = await getDb()
    .insert(products)
    .values(data)
    .$returningId();

  const productId = result[0].id;
  const rows = await getDb()
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  return rows.at(0);
}

export async function updateProduct(
  productId: number,
  data: Partial<{
    title: string;
    description: string;
    aiDescription: string;
    painPoints: string[];
    benefits: string[];
    specifications: Record<string, string>;
    price: string;
    compareAtPrice: string;
    images: string[];
    faqs: { question: string; answer: string }[];
    reviews: { author: string; rating: number; text: string; date: string }[];
    seoTitle: string;
    seoDescription: string;
    tags: string[];
  }>
) {
  await getDb()
    .update(products)
    .set(data)
    .where(eq(products.id, productId));

  const rows = await getDb()
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  return rows.at(0);
}

/* ============================================
   Analytics Query Functions
   ============================================ */

export async function findAnalyticsByStore(storeId: number, limit = 30) {
  return getDb()
    .select()
    .from(storeAnalytics)
    .where(eq(storeAnalytics.storeId, storeId))
    .orderBy(desc(storeAnalytics.date))
    .limit(limit);
}

export async function upsertAnalytics(data: InsertStoreAnalytics) {
  const existing = await getDb()
    .select()
    .from(storeAnalytics)
    .where(
      and(
        eq(storeAnalytics.storeId, data.storeId),
        eq(storeAnalytics.date, data.date)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await getDb()
      .update(storeAnalytics)
      .set({
        views: data.views,
        uniqueVisitors: data.uniqueVisitors,
        clicks: data.clicks,
        conversions: data.conversions,
        revenue: data.revenue,
        updatedAt: new Date(),
      })
      .where(eq(storeAnalytics.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await getDb()
      .insert(storeAnalytics)
      .values(data)
      .$returningId();
    return result[0].id;
  }
}

// Get dashboard stats for a user
export async function getUserDashboardStats(userId: number) {
  const db = getDb();

  const storeList = await db
    .select()
    .from(stores)
    .where(and(eq(stores.userId, userId), eq(stores.status, "active")));

  const totalStores = storeList.length;
  const totalViews = storeList.reduce((sum, s) => sum + (s.views ?? 0), 0);
  const totalClicks = storeList.reduce((sum, s) => sum + (s.clicks ?? 0), 0);
  const totalConversions = storeList.reduce((sum, s) => sum + (s.conversions ?? 0), 0);
  const totalRevenue = storeList.reduce(
    (sum, s) => sum + parseFloat(s.revenue?.toString() ?? "0"),
    0
  );

  return {
    totalStores,
    totalViews,
    totalClicks,
    totalConversions,
    totalRevenue: totalRevenue.toFixed(2),
    conversionRate: totalViews > 0 ? ((totalConversions / totalViews) * 100).toFixed(2) : "0",
    stores: storeList,
  };
}
