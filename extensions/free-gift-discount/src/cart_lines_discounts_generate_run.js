import { ProductDiscountSelectionStrategy } from '../generated/api';

/**
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const lines = input.cart.lines || [];
  if (!lines.length) return { operations: [] };

  const config = JSON.parse(
    input.discount?.metafield?.value || "{}"
  );

  const CART_TOTAL_THRESHOLD = config.threshold ?? 30000;
  const FREE_GIFT_SKU = config.sku ?? 'snowboard-liquid';

  const freeGiftLine = lines.find(
    line => line.merchandise?.sku?.toLowerCase() === FREE_GIFT_SKU.toLowerCase()
  );

  const subtotalExcludingFreeGift = lines
    .filter(line => line.merchandise?.sku?.toLowerCase() !== FREE_GIFT_SKU.toLowerCase())
    .reduce((sum, line) => {
      return sum + Math.round(Number(line.cost?.subtotalAmount?.amount || 0) * 100);
    }, 0);

  if (subtotalExcludingFreeGift < CART_TOTAL_THRESHOLD || !freeGiftLine) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: `FREE GIFT applied!`,
              targets: [{ cartLine: { id: freeGiftLine.id } }],
              value: { percentage: { value: 100 } }
            }
          ],
          selectionStrategy: ProductDiscountSelectionStrategy.First
        }
      }
    ]
  };
}