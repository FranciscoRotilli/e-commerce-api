export const publicProductSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  weightInGrams: true,
  widthInMm: true,
  heightInMm: true,
  lengthInMm: true,
  oldPrice: true,
  currentPrice: true,
  slug: true,
  images: {
    select: {
      id: true,
      url: true,
      altText: true,
    },
  },
  tags: true,
  categories: {
    select: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
};
