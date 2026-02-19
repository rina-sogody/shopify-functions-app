export const metadata = {
  name: 'Tiered Discount',
  description: 'Applies tiered percentage discounts based on eligible product SKUs.',
  settings: [
    {
      key: 'eligibleSkus',
      label: 'Eligible SKUs',
      default: []
    },
    {
      key: 'tiers',
      label: 'Discount Tiers',
      default: [
        { threshold: 75000, percent: 10, message: '10% off' },
        { threshold: 150000, percent: 15, message: '15% off' }
      ]
    }
  ]
};
