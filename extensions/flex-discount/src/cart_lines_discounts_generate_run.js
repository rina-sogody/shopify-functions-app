import { ProductDiscountSelectionStrategy } from '../generated/api';

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

function normalizeEligibleEntries(entries = []) {
  return entries
    .map((entry) => {
      if (typeof entry === 'string') {
        const sku = entry.toLowerCase().trim();
        return sku ? { sku, variantId: null } : null;
      }

      if (!entry || typeof entry !== 'object') return null;

      const sku =
        typeof entry.sku === 'string' && entry.sku.trim()
          ? entry.sku.toLowerCase().trim()
          : null;

      const variantId = entry.variantId || entry.id || null;

      if (!sku && !variantId) return null;

      return { sku, variantId };
    })
    .filter(Boolean);
}

/**
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const lines = input.cart.lines || [];
  if (!lines.length) return { operations: [] };

  const config = JSON.parse(input.discount?.metafield?.value || '{}');

  const eligibleEntries = normalizeEligibleEntries(config.eligibleSkus || []);
  const eligibleSkuSet = new Set(
    eligibleEntries.map((entry) => entry.sku).filter(Boolean)
  );
  const eligibleVariantSet = new Set(
    eligibleEntries.map((entry) => entry.variantId).filter(Boolean)
  );

  const tiers = config.tiers || [];

  if (!tiers.length) return { operations: [] };

  const eligibleLines =
    eligibleEntries.length === 0
      ? lines
      : lines.filter((line) => {
          const lineSku = line.merchandise?.sku
            ? line.merchandise.sku.toLowerCase().trim()
            : null;

          const lineVariantId = line.merchandise?.id || null;

          return (
            (lineSku && eligibleSkuSet.has(lineSku)) ||
            (lineVariantId && eligibleVariantSet.has(lineVariantId))
          );
        });

  if (!eligibleLines.length) return { operations: [] };

  const discountableTotal = eligibleLines.reduce(
    (total, line) =>
      total + Math.round(Number(line.cost.totalAmount.amount || 0) * 100),
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
              targets: eligibleLines.map((line) => ({
                cartLine: { id: line.id },
              })),
              value: {
                percentage: { value: applicableTier.percent },
              },
            },
          ],
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}
