/**
 * Utility for formatting and calculating dynamic 20-30% discount pricing across all products
 */

export const getPriceDetails = (item, currentPrice) => {
  const price = currentPrice !== undefined ? Number(currentPrice) : Number(item?.basePrice || item?.price || 0);

  if (item?.originalPrice && Number(item.originalPrice) > price) {
    const orig = Number(item.originalPrice);
    const discount = Math.round(((orig - price) / orig) * 100);
    return {
      price,
      originalPrice: orig,
      discountPercent: discount > 0 ? discount : 25,
    };
  }

  if (item?.discountPercentage && item.discountPercentage > 0) {
    const disc = Number(item.discountPercentage);
    const calculatedOrig = Math.round((price / (1 - disc / 100)) / 5) * 5;
    return {
      price,
      originalPrice: calculatedOrig > price ? calculatedOrig : price + 30,
      discountPercent: disc,
    };
  }

  // Realistic deterministic discount between 20% and 30%
  let multiplier = 1.32; // ~24% off by default
  if (price <= 50) {
    multiplier = 1.40; // 28% off for low-cost seasonings/dips
  } else if (price <= 150) {
    multiplier = 1.35; // ~26% off
  } else if (price <= 350) {
    multiplier = 1.30; // ~23% off
  } else {
    multiplier = 1.33; // ~25% off (e.g. ₹360 -> ₹479)
  }

  let calculatedOriginal = Math.round(price * multiplier);
  if (calculatedOriginal >= 100) {
    calculatedOriginal = Math.round(calculatedOriginal / 5) * 5;
  }
  if (calculatedOriginal <= price) {
    calculatedOriginal = price + 20;
  }

  const discountPercent = Math.round(((calculatedOriginal - price) / calculatedOriginal) * 100);

  return {
    price,
    originalPrice: calculatedOriginal,
    discountPercent: discountPercent >= 15 ? discountPercent : 20,
  };
};
