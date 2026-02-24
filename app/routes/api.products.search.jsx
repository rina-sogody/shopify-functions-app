import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  if (!query) {
    return new Response(JSON.stringify({ variants: [] }), { status: 200 });
  }

  const gql = `
    query searchVariants($query: String!) {
      productVariants(first: 10, query: $query) {
        nodes {
          id
          title
          sku
          product {
            title
          }
        }
      }
    }
  `;

  const res = await admin.graphql(gql, {
    variables: { query },
  });

  const json = await res.json();

  const variants = json.data.productVariants.nodes.map(v => ({
    id: v.id,
    title: `${v.product.title} - ${v.title}`,
    sku: v.sku,
  }));

  return new Response(JSON.stringify({ variants }), { status: 200 });
}
