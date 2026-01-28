/* eslint-disable no-undef */
import { authenticate } from "./shopify.server";

/* eslint-disable no-undef */
export async function shopifyGraphQLQuery({ query, variables = {}, request }) {
  if (request) {
    // ✅ Correct for public app
    const { admin } = await authenticate.admin(request);
    const res = await admin.graphql(query, { variables });
    return await res.json();
  }

  // ❌ fallback (only for scripts, NOT app routes)
  throw new Error("Missing request context for Admin API call");
}

