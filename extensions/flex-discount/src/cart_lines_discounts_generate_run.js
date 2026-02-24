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
export function cartLinesDiscountsGenerateRun(input) {
  const lines = input.cart.lines || [];
  if (!lines.length) return { operations: [] };

  const config = JSON.parse(
    input.discount?.metafield?.value || "{}"
  );

  const eligibleSkus = (config.eligibleSkus || [])
    .map(s => s.toLowerCase().trim())
    .filter(Boolean);

  const tiers = config.tiers || [];

  if (!tiers.length) return { operations: [] };

  const eligibleLines =
    eligibleSkus.length === 0
      ? lines
      : lines.filter(
          line =>
            line.merchandise?.sku &&
            eligibleSkus.includes(line.merchandise.sku.toLowerCase())
        );

  if (!eligibleLines.length) return { operations: [] };

  const discountableTotal = eligibleLines.reduce(
    (total, line) =>
      total +
      Math.round(Number(line.cost.totalAmount.amount || 0) * 100),
    0
  );

  let applicableTier = null;
  for (const tier of tiers) {
    if (discountableTotal >= tier.threshold) {
      applicableTier = tier;
    }
  }

  if (!applicableTier) return { operations: [] };

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: applicableTier.message,
              targets: eligibleLines.map(line => ({
                cartLine: { id: line.id },
              })),
              value: {
                percentage: { value: applicableTier.percent },
              },
            },
          ],
          selectionStrategy:
            ProductDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}

