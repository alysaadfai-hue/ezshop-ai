import type { Store, Product } from "@db/schema";

/* ============================================
   Static Site Generation Service
   Generates HTML for one-product stores
   ============================================ */

export function generateStoreHtml(store: Store, product: Product): string {
  const productImages = (product.images as string[] | null) ?? [];
  const painPoints = (product.painPoints as string[] | null) ?? [];
  const benefits = (product.benefits as string[] | null) ?? [];
  const faqs = (product.faqs as { question: string; answer: string }[] | null) ?? [];
  const reviews = (product.reviews as { author: string; rating: number; text: string; date: string }[] | null) ?? [];
  const specs = (product.specifications as Record<string, string> | null) ?? {};
  const price = parseFloat(product.price?.toString() ?? "0");
  const comparePrice = product.compareAtPrice ? parseFloat(product.compareAtPrice.toString()) : null;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : 0;

  const reviewsHtml = reviews.map((r) => `
    <div class="review-card">
      <div class="review-header">
        <div class="review-avatar">${r.author.charAt(0)}</div>
        <div>
          <div class="review-author">${r.author}</div>
          <div class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
        </div>
      </div>
      <p class="review-text">${r.text}</p>
    </div>`).join("");

  const faqsHtml = faqs.map((f) => `
    <div class="faq-item">
      <button class="faq-question" onclick="this.parentElement.classList.toggle('open')">
        ${f.question}
        <span class="faq-toggle">+</span>
      </button>
      <div class="faq-answer">${f.answer}</div>
    </div>`).join("");

  const benefitsHtml = benefits.map((b) => `
    <li class="benefit-item"><span class="benefit-check">✓</span> ${b}</li>`).join("");

  const painPointsHtml = painPoints.map((p) => `
    <div class="pain-point">${p}</div>`).join("");

  const specsHtml = Object.entries(specs).map(([k, v]) => `
    <div class="spec-row"><span class="spec-key">${k}</span><span class="spec-val">${v}</span></div>`).join("");

  const imageThumbs = productImages.length > 0
    ? productImages.map((img, idx) => `<div class="thumb ${idx === 0 ? "active" : ""}" onclick="document.querySelector('.main-image').src='${img}'"><img src="${img}" alt="" /></div>`).join("")
    : `<div class="thumb active"><div class="placeholder-img">${product.title.charAt(0)}</div></div>`;

  const mainImage = productImages.length > 0
    ? productImages[0]
    : "";

  return `<!DOCTYPE html>
<html lang="${store.primaryLanguage}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${product.seoTitle ?? product.title}</title>
  <meta name="description" content="${product.seoDescription ?? `Buy ${product.title}`}">
  <style>
    :root { --primary: #0ea5e9; --primary-dark: #0284c7; --accent: #10b981; --danger: #ef4444; --bg: #0f172a; --card: #1e293b; --text: #f1f5f9; --text-dim: #94a3b8; --border: #334155; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
    .header { padding: 16px 0; border-bottom: 1px solid var(--border); }
    .header-inner { display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 1.5rem; font-weight: 800; color: var(--primary); }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: rgba(14,165,233,0.1); color: var(--primary); border: 1px solid rgba(14,165,233,0.2); }
    .hero { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; padding: 48px 0; }
    @media (max-width: 768px) { .hero { grid-template-columns: 1fr; } }
    .gallery { display: flex; flex-direction: column; gap: 16px; }
    .main-image-wrap { background: var(--card); border-radius: 16px; border: 1px solid var(--border); aspect-ratio: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .main-image { width: 100%; height: 100%; object-fit: cover; }
    .placeholder-img { width: 120px; height: 120px; border-radius: 20px; background: linear-gradient(135deg, var(--primary), #6366f1); display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: 800; color: white; }
    .thumbs { display: flex; gap: 12px; }
    .thumb { width: 72px; height: 72px; border-radius: 10px; border: 2px solid var(--border); cursor: pointer; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--card); }
    .thumb.active { border-color: var(--primary); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .info { display: flex; flex-direction: column; gap: 20px; }
    .price-row { display: flex; align-items: baseline; gap: 12px; }
    .price { font-size: 2.5rem; font-weight: 800; color: var(--text); }
    .compare-price { font-size: 1.25rem; color: var(--text-dim); text-decoration: line-through; }
    .discount-badge { padding: 4px 12px; border-radius: 20px; background: rgba(16,185,129,0.15); color: var(--accent); font-weight: 700; font-size: 0.875rem; }
    .ai-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 8px; background: rgba(99,102,241,0.1); color: #a5b4fc; font-size: 0.75rem; font-weight: 600; border: 1px solid rgba(99,102,241,0.2); }
    .desc { font-size: 1rem; line-height: 1.7; color: var(--text-dim); white-space: pre-line; }
    .section-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; }
    .benefits { list-style: none; display: flex; flex-direction: column; gap: 10px; }
    .benefit-item { display: flex; align-items: flex-start; gap: 10px; font-size: 0.9375rem; color: var(--text-dim); }
    .benefit-check { width: 22px; height: 22px; border-radius: 50%; background: rgba(16,185,129,0.15); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0; }
    .pain-points { display: flex; flex-direction: column; gap: 10px; }
    .pain-point { padding: 12px 16px; background: rgba(239,68,68,0.05); border-left: 3px solid var(--danger); border-radius: 0 8px 8px 0; color: var(--text-dim); font-size: 0.9375rem; }
    .cta-button { width: 100%; padding: 18px 32px; border-radius: 12px; border: none; background: linear-gradient(135deg, var(--primary), #6366f1); color: white; font-size: 1.125rem; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 20px rgba(14,165,233,0.3); }
    .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 30px rgba(14,165,233,0.4); }
    .trust-badges { display: flex; gap: 20px; flex-wrap: wrap; }
    .trust-badge { display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: var(--text-dim); }
    .trust-icon { width: 18px; height: 18px; }
    .reviews-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .review-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .review-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .review-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), #6366f1); display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; }
    .review-author { font-weight: 600; font-size: 0.875rem; }
    .review-stars { color: #fbbf24; font-size: 0.875rem; }
    .review-text { color: var(--text-dim); font-size: 0.875rem; line-height: 1.6; }
    .faq-item { border-bottom: 1px solid var(--border); }
    .faq-question { width: 100%; padding: 16px 0; background: none; border: none; color: var(--text); font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: space-between; text-align: left; }
    .faq-toggle { color: var(--primary); font-size: 1.25rem; }
    .faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.3s; color: var(--text-dim); font-size: 0.9375rem; }
    .faq-item.open .faq-answer { max-height: 200px; padding-bottom: 16px; }
    .faq-item.open .faq-toggle { transform: rotate(45deg); }
    .spec-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); font-size: 0.9375rem; }
    .spec-key { color: var(--text-dim); }
    .spec-val { color: var(--text); font-weight: 600; }
    .section { padding: 40px 0; }
    .section:not(:last-child) { border-bottom: 1px solid var(--border); }
    .footer { text-align: center; padding: 32px 0; color: var(--text-dim); font-size: 0.8125rem; }
    .urgency-bar { position: fixed; bottom: 0; left: 0; right: 0; background: linear-gradient(90deg, var(--primary), #6366f1); padding: 12px; text-align: center; color: white; font-weight: 600; font-size: 0.875rem; z-index: 100; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    .pulse { animation: pulse 2s infinite; }
  </style>
</head>
<body>
  <div class="urgency-bar pulse">
    🔥 Limited Time: ${discount}% OFF + Free Shipping — Only a few left in stock!
  </div>

  <header class="header">
    <div class="container header-inner">
      <div class="logo">${store.name}</div>
      <div class="badge">⚡ AI-Powered Store</div>
    </div>
  </header>

  <main class="container">
    <section class="hero">
      <div class="gallery">
        <div class="main-image-wrap">
          ${mainImage ? `<img class="main-image" src="${mainImage}" alt="${product.title}" />` : `<div class="placeholder-img">${product.title.charAt(0)}</div>`}
        </div>
        <div class="thumbs">${imageThumbs}</div>
      </div>

      <div class="info">
        <div>
          <div class="ai-badge">✨ AI-Generated Description</div>
        </div>

        <div class="price-row">
          <span class="price">$${price.toFixed(2)}</span>
          ${comparePrice ? `<span class="compare-price">$${comparePrice.toFixed(2)}</span>` : ""}
          ${discount > 0 ? `<span class="discount-badge">Save ${discount}%</span>` : ""}
        </div>

        <p class="desc">${product.aiDescription ?? product.description ?? ""}</p>

        <div>
          <h3 class="section-title">✅ Why You'll Love It</h3>
          <ul class="benefits">${benefitsHtml}</ul>
        </div>

        <button class="cta-button" onclick="alert('PayPal checkout coming soon!')">
          🛒 Buy Now — $${price.toFixed(2)}
        </button>

        <div class="trust-badges">
          <div class="trust-badge">🔒 Secure Checkout</div>
          <div class="trust-badge">🚚 Free Shipping</div>
          <div class="trust-badge">↩️ 30-Day Returns</div>
        </div>
      </div>
    </section>

    ${painPointsHtml.length > 0 ? `
    <section class="section">
      <h2 class="section-title">😤 Tired of These Problems?</h2>
      <div class="pain-points">${painPointsHtml}</div>
    </section>` : ""}

    ${reviewsHtml.length > 0 ? `
    <section class="section">
      <h2 class="section-title">⭐ What Our Customers Say</h2>
      <div class="reviews-grid">${reviewsHtml}</div>
    </section>` : ""}

    ${faqsHtml.length > 0 ? `
    <section class="section">
      <h2 class="section-title">❓ Frequently Asked Questions</h2>
      <div>${faqsHtml}</div>
    </section>` : ""}

    ${specsHtml.length > 0 ? `
    <section class="section">
      <h2 class="section-title">📋 Specifications</h2>
      <div>${specsHtml}</div>
    </section>` : ""}
  </main>

  <footer class="footer">
    <p>© ${new Date().getFullYear()} ${store.name}. All rights reserved.</p>
    <p style="margin-top:8px;opacity:0.6;">Powered by EzShop.ai</p>
  </footer>

  <div style="height:60px"></div>
</body>
</html>`;
}
