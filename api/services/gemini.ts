import { GoogleGenAI } from "@google/genai";

/* ============================================
   Google Gemini 3.5 AI Service
   Free tier: 1500 requests/day
   ============================================ */

const apiKey = process.env.GEMINI_API_KEY ?? "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const MODEL = "gemini-2.0-flash-lite";

export type AIProductContent = {
  aiDescription: string;
  painPoints: string[];
  benefits: string[];
  faqs: { question: string; answer: string }[];
  reviews: { author: string; rating: number; text: string; date: string }[];
  seoTitle: string;
  seoDescription: string;
};

function getFallbackContent(productName: string): AIProductContent {
  return {
    aiDescription: `Transform your daily routine with the ${productName}. Engineered with cutting-edge technology and premium materials, this product delivers exceptional performance that exceeds expectations. Whether you're a professional seeking reliability or someone who values quality, the ${productName} is designed to make your life easier, more efficient, and more enjoyable.`,
    painPoints: [
      `Tired of products that promise everything but deliver nothing?`,
      `Frustrated with cheap alternatives that break within weeks?`,
      `Sick of complicated setups that waste your valuable time?`,
      `Fed up with poor customer service when you need help?`,
    ],
    benefits: [
      `Premium quality construction built to last for years`,
      `Intuitive design — works right out of the box`,
      `Engineered for maximum efficiency and performance`,
      `Sleek, modern aesthetic that complements any space`,
      `Backed by our 30-day satisfaction guarantee`,
      `Free worldwide shipping on every order`,
    ],
    faqs: [
      { question: `What is the ${productName}?`, answer: `The ${productName} is a premium-quality product designed to make your life easier and more efficient.` },
      { question: `How long does shipping take?`, answer: `We ship worldwide within 24 hours. Most orders arrive within 7-14 business days with free shipping.` },
      { question: `Is there a warranty?`, answer: `Yes! We offer a 30-day money-back guarantee and a 1-year manufacturer warranty.` },
      { question: `Can I return it if I don't like it?`, answer: `Absolutely. If you're not 100% satisfied, return it within 30 days for a full refund. No questions asked.` },
    ],
    reviews: [
      { author: "Michael R.", rating: 5, text: `I was skeptical at first but the ${productName} completely exceeded my expectations. This is by far the best purchase I've made this year. Highly recommend!`, date: "2025-06-15" },
      { author: "Sarah K.", rating: 5, text: `Bought this for my family and everyone loves it. The quality is incredible and it works exactly as described. Great purchase!`, date: "2025-06-10" },
      { author: "David L.", rating: 4, text: `Solid product at a great price. Works exactly as described. Only wish I had bought it sooner.`, date: "2025-05-28" },
      { author: "Emma T.", rating: 5, text: `The best product I've ever owned. Customer service was excellent too when I had a question.`, date: "2025-05-20" },
    ],
    seoTitle: `${productName} | Premium Quality | Free Shipping`,
    seoDescription: `Buy ${productName} at the best price. Free worldwide shipping. Premium quality with 30-day satisfaction guarantee. Order now!`,
  };
}

export async function generateAIContent(
  productName: string,
  description: string,
  specs: Record<string, string>,
  price: number
): Promise<AIProductContent> {
  if (!ai) {
    console.warn("Gemini API key not configured, using fallback");
    return getFallbackContent(productName);
  }

  try {
    const specsText = Object.entries(specs)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const prompt = `You are a professional e-commerce copywriter. Create high-converting marketing content for this product.

Product: ${productName}
Description: ${description}
Price: $${price}
Specifications:
${specsText}

Generate the following JSON object exactly:
{
  "aiDescription": "A compelling 3-paragraph sales description (200 words) focusing on pain points, transformation, and emotional connection.",
  "painPoints": ["5 specific frustration points this product solves"],
  "benefits": ["6 bullet-point benefits starting with emojis"],
  "faqs": [
    { "question": "FAQ question 1", "answer": "Answer 1 (2-3 sentences)" },
    { "question": "FAQ question 2", "answer": "Answer 2" },
    { "question": "FAQ question 3", "answer": "Answer 3" },
    { "question": "FAQ question 4", "answer": "Answer 4" },
    { "question": "FAQ question 5", "answer": "Answer 5" },
    { "question": "FAQ question 6", "answer": "Answer 6" }
  ],
  "reviews": [
    { "author": "First name + initial", "rating": 5, "text": "Detailed 2-sentence review", "date": "2025-06-01" },
    { "author": "First name + initial", "rating": 5, "text": "Review text", "date": "2025-05-28" },
    { "author": "First name + initial", "rating": 4, "text": "Review text", "date": "2025-05-20" },
    { "author": "First name + initial", "rating": 5, "text": "Review text", "date": "2025-05-15" }
  ],
  "seoTitle": "SEO title under 60 chars",
  "seoDescription": "Meta description under 160 chars"
}`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });

    const text = response.text ?? "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Gemini response");
    }

    const result = JSON.parse(jsonMatch[0]) as AIProductContent;
    return result;
  } catch (err) {
    console.error("Gemini generation failed:", err);
    return getFallbackContent(productName);
  }
}

// Translate content using Gemini
export async function translateContent(
  content: string,
  targetLanguage: string
): Promise<string> {
  if (!ai) return content;

  const langNames: Record<string, string> = {
    ar: "Arabic", fr: "French", es: "Spanish", de: "German",
    it: "Italian", pt: "Portuguese", ru: "Russian", zh: "Chinese",
    ja: "Japanese", ko: "Korean", hi: "Hindi", tr: "Turkish",
    nl: "Dutch", pl: "Polish", sv: "Swedish", th: "Thai",
    vi: "Vietnamese", id: "Indonesian", ms: "Malay", sw: "Swahili",
  };

  const langName = langNames[targetLanguage] ?? targetLanguage;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Translate the following e-commerce marketing content to ${langName}. Maintain the marketing tone, emotional appeal, and persuasive style. Do not just translate literally — adapt it to feel natural and compelling for ${langName} speakers.

Content to translate:
${content}

Provide ONLY the translated text, no explanations.`,
    });

    return response.text ?? content;
  } catch {
    return content;
  }
}
