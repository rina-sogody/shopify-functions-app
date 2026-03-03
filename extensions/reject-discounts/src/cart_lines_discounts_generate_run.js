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

  if (!codes.length) {
    return { operations: [] };
  }

  const rejectable = codes.filter(c => c.rejectable);

  if (!rejectable.length) {
    return { operations: [] };
  }

    let message = "test default";

    const metafieldValue = input.discount?.metafield?.value;
  
    if (metafieldValue) {
      try {
        const parsed = JSON.parse(metafieldValue);
  
        if (parsed?.message && typeof parsed.message === "string") {
          const trimmed = parsed.message.trim();
          if (trimmed.length > 0) {
            message = trimmed;
          }
        }
      } catch {
        // Ignore invalid JSON and keep default message
      }
    }
  return {
    operations: [
      {
        enteredDiscountCodesReject: {
          codes: rejectable.map(c => ({
            code: c.code,
          })),
          message,
        },
      },
    ],
  };
}