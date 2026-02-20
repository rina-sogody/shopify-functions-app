import { useNavigate } from "react-router";

export default function CreateDiscountPage() {
  const navigate = useNavigate();

  return (
    <s-page heading="Create Discount" backAction={{ content: "Back", url: "/app" }}>
      <s-section>

        <s-stack direction="block" gap="base">

          <s-card>
            <s-heading>Free Gift</s-heading>
            <s-paragraph>
              Give a free product when cart total exceeds a threshold.
            </s-paragraph>
            <s-button onClick={() => navigate("/app/free-gift")}>
              Create Free Gift
            </s-button>
          </s-card>

          <s-card>
            <s-heading>Tiered Discount</s-heading>
            <s-paragraph>
              Apply tiered discount based on cart total tiers.
            </s-paragraph>
            <s-button onClick={() => navigate("/app/flex-discount")}>
              Create Tiered Discount
            </s-button>
          </s-card>

          <s-card>
            <s-heading>Free Gift (Variant Trigger)</s-heading>
            <s-paragraph>
              Make a product free when a specific trigger variant is in the cart.
            </s-paragraph>
            <s-button onClick={() => navigate("/app/free-gift-by-variant")}>
              Create Variant Gift
            </s-button>
          </s-card>

        </s-stack>

      </s-section>
    </s-page>
  );
}
