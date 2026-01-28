import { ProductDiscountSelectionStrategy } from '../generated/api';

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

/**
 * @param {RunInput} input
 * @param {Object} settings
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input, settings = {}) {
  const lines = input.cart.lines || [];
  if (!lines.length) return { operations: [] };

  // Eligible SKUs for tiered discounts
  const eligibleSkus = [
    "pfanne-20cm-klassisch-beschichtet-gift",
    "pfanne-24x4_8cm-beschichtet",
    "pfanne-26cm-klassisch-beschichtet",
    "pfanne-28x5_8cm-beschichtet",
    "pfanne-30cm-klassisch-beschichtet",
    "pfanne-32x5_8cm-beschichtet",
    "servierpfanne-26cm-klassisch-beschichtet",
    "servierpfanne-30cm-klassisch-beschichtet",
    "pfanne-20cm-klassisch-unbeschichtet",
    "pfanne-24x4_8cm-unbeschichtet",
    "pfanne-26cm-klassisch-unbeschichtet",
    "pfanne-28x5_8cm-unbeschichtet",
    "pfanne-30cm-klassisch-unbeschichtet",
    "pfanne-32x5_8cm-unbeschichtet",
    "servierer-26cm-klassisch-unbeschichtet",
    "servierpfanne-30cm-klassisch-unbeschichtet",
    "kupferpfanne-20x4_8-beschichtet",
    "kupferpfanne-24x4_8-beschichtet",
    "kupferpfanne-28x5_8-beschichtet",
    "kupferpfanne-20x4_8-unbeschichtet",
    "kupferpfanne-24x4_8-unbeschichtet",
    "kupferpfanne-28x5_8-unbeschichtet",
    "grillpfanne-24cm-rot",
    "grillpfanne-24cm-petrol",
    "grillpfanne-24cm-grau",
    "crepes-pan-30x2.25-beschichtet",
    "minipan-16x4_8-beschichtet",
    "minipan-saute-16x4_8-beschichtet",
    "minipan-16x4_8-unbeschichtet",
    "minipan-saute-16x4_8-unbeschichtet",
    "fish-pan-30x22x4-beschichtet",
    "fish-pan-30x22x4-unbeschichtet",
    "wok-30cm-beschichtet-stielpfanne",
    "wok-30cm-beschichtet-servierer",
    "wok-36cm-beschichtet-stielpfann",
    "wok-36cm-beschichtet-servierer",
    "wok-30cm-unbeschichtet-stielpfanne",
    "wok-30cm-unbeschichtet-servierer",
    "wok-36cm-unbeschichtet-stielpfanne",
    "wok-36cm-unbeschichtet-servierer",
    "schmor-pfanne-klassisch-28cm-beschichtet",
    "schmor-servierer-klassisch-28cm-besch",
    "schmor-pfanne-klassisch-28cm-unbesch",
    "schmor-servierer-klassisch-28cm-unbesch",
    "topf-klassisch-16x9_5cm",
    "topf-klassisch-20x9_5cm",
    "topf-klassisch-20x11_5cm",
    "topf-klassisch-24x13cm",
    "topf-klassisch-26cm",
    "topf-klassisch-26x15cm",
    "topf-beschichtet-16x9_5cm",
    "topf-beschichtet-20x11_5cm",
    "topf-beschichtet-26x11_5cm",
    "kupfertopf-pure_edition-16x9_5cm",
    "kupfertopf-pure_edition-20x9_5cm",
    "kupfertopf-pure_edition-24x13cm",
    "saucier-klassisch",
    "saucier-beschichtet",
    "kupfersaucier-pure_edition-16x7cm",
    "brick-blouse",
    "coastal-vibes-set"
  ];

  // Discount tiers from settings or default
  const tiers = settings.tiers || [
    { threshold: 75000, percent: 10, message: "10% off" },
    { threshold: 150000, percent: 15, message: "15% off" }
  ];

  const eligibleLines = lines.filter(
    line => line.merchandise.sku && eligibleSkus.includes(line.merchandise.sku.toLowerCase())
  );

  if (!eligibleLines.length) return { operations: [] };

  const discountableTotal = eligibleLines.reduce(
    (total, line) => total + Math.round(Number(line.cost.totalAmount.amount || 0) * 100),
    0
  );

  // Find highest applicable tier
  let applicableTier = null;
  for (const tier of tiers) {
    if (discountableTotal >= tier.threshold) applicableTier = tier;
  }

  if (!applicableTier) return { operations: [] };

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: applicableTier.message,
              targets: eligibleLines.map(line => ({ cartLine: { id: line.id } })),
              value: { percentage: { value: applicableTier.percent } }
            }
          ],
          selectionStrategy: ProductDiscountSelectionStrategy.First
        }
      }
    ]
  };
}

// Metadata for the dashboard
export const metadata = {
  name: 'Tiered Discount',
  description: 'Applies tiered percentage discounts based on eligible product SKUs.',
  settings: [
    {
      key: 'tiers',
      label: 'Discount Tiers',
      type: 'json',
      default: JSON.stringify([
        { threshold: 75000, percent: 10, message: '10% off' },
        { threshold: 150000, percent: 15, message: '15% off' }
      ])
    }
  ]
};
