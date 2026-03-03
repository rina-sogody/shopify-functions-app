import { ProductDiscountSelectionStrategy } from "../generated/api";

/**
 * @param {import("../generated/api").CartInput} input
 * @returns {import("../generated/api").CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const lines = input.cart.lines || [];
  if (!lines.length) return { operations: [] };

  const config = JSON.parse(
    input.discount?.metafield?.value || "{}"
  );

  const triggerSku = config.triggerSku?.toLowerCase();
  const giftSku = config.giftSku?.toLowerCase();

  if (!triggerSku || !giftSku) {
    return { operations: [] };
  }

  const hasTrigger = lines.some(
    (line) =>
      line.merchandise?.sku?.toLowerCase() === triggerSku
  );

  if (!hasTrigger) return { operations: [] };

  const giftLine = lines.find(
    (line) =>
      line.merchandise?.sku?.toLowerCase() === giftSku
  );

  if (!giftLine) return { operations: [] };

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: "Free gift!",
              targets: [{ cartLine: { id: giftLine.id } }],
              value: { percentage: { value: 100 } },
            },
          ],
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}
