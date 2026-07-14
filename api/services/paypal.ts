/* ============================================
   PayPal Integration Service
   MVP: Simulated payments
   Production: PayPal REST API
   ============================================ */

export type PayPalOrder = {
  id: string;
  storeId: number;
  productName: string;
  amount: number;
  currency: string;
  buyerEmail: string;
  buyerName: string;
  status: "created" | "approved" | "captured" | "refunded";
  createdAt: Date;
};

// Create a PayPal order (MVP: simulated)
export async function createOrder(params: {
  storeId: number;
  productName: string;
  amount: number;
  currency: string;
  buyerEmail: string;
  buyerName: string;
}): Promise<PayPalOrder> {
  // In production:
  // const response = await fetch('https://api.paypal.com/v2/checkout/orders', {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${accessToken}` },
  //   body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [...] })
  // });

  // MVP: Simulate PayPal order creation
  await new Promise((r) => setTimeout(r, 500));

  return {
    id: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    storeId: params.storeId,
    productName: params.productName,
    amount: params.amount,
    currency: params.currency,
    buyerEmail: params.buyerEmail,
    buyerName: params.buyerName,
    status: "created",
    createdAt: new Date(),
  };
}

// Capture payment (MVP: simulated)
export async function captureOrder(orderId: string): Promise<{ success: boolean; order?: PayPalOrder }> {
  // In production:
  // const response = await fetch(`https://api.paypal.com/v2/checkout/orders/${orderId}/capture`, ...);

  await new Promise((r) => setTimeout(r, 300));

  return {
    success: true,
    order: {
      id: orderId,
      storeId: 1,
      productName: "Product",
      amount: 29.99,
      currency: "USD",
      buyerEmail: "customer@example.com",
      buyerName: "Customer",
      status: "captured",
      createdAt: new Date(),
    },
  };
}

// Get PayPal connect URL for store owner
export function getPayPalConnectUrl(): string {
  // In production:
  // return `https://www.paypal.com/connect?...`;
  return "https://www.paypal.com/business/signup";
}

// Verify PayPal webhook (MVP: always true)
export function verifyWebhook(body: unknown): boolean {
  // In production: verify PayPal webhook signature
  console.log("PayPal webhook received:", body);
  return true;
}
