// @ts-check

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} RunResult
 */

/**
 * Reject all entered discount codes
 * @param {RunInput} input
 * @returns {RunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const codes = input.enteredDiscountCodes || [];

  // Nothing to reject
  if (!codes.length) {
    return { operations: [] };
  }

  // Only reject rejectable codes (Shopify rule)
  const rejectable = codes.filter(c => c.rejectable);

  if (!rejectable.length) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        enteredDiscountCodesReject: {
          codes: rejectable.map(c => ({
            code: c.code,
          })),
          message: "Discount codes are disabled during this campaign",
        },
      },
    ],
  };
}