
export const metadata = {
    name: 'Free Gift Discount',
    description: 'Applies a free gift when the cart total exceeds a threshold.',
    settings: [
      { key: 'CART_TOTAL_THRESHOLD', label: 'Cart total threshold (€)', type: 'number', default: 0 },
      { key: 'FREE_GIFT_SKU', label: 'Free gift SKU', type: 'text', default: '' }
    ]
  };