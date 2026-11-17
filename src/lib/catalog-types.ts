import type { AvailabilityValue } from "./availability";

export type CardImage = { url: string; alt: string | null; width: number | null; height: number | null };

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  shortDescription: string;
  availability: AvailabilityValue;
  isFeatured: boolean;
  isPopular: boolean;
  categoryName: string;
  categorySlug: string;
  categoryIcon: string;
  image: CardImage | null;
  /** Prix affiché en millimes (le plus bas si le produit a plusieurs offres). */
  priceMillimes: number | null;
  hasVariants: boolean;
  orderable: boolean;
};

export type VariantView = {
  id: string;
  name: string;
  priceMillimes: number;
  durationLabel: string | null;
  licenseType: string | null;
  availability: AvailabilityValue;
  isActive: boolean;
};

export type ProductDetailData = ProductCardData & {
  sku: string;
  description: string;
  features: string[];
  requirements: string[];
  quantityEnabled: boolean;
  maxQuantity: number;
  seoTitle: string | null;
  seoDescription: string | null;
  fixedPriceMillimes: number | null;
  variants: VariantView[];
  images: (CardImage & { id: string })[];
  faqs: { id: string; question: string; answer: string }[];
  related: ProductCardData[];
  updatedAt: Date;
};

export type CategoryCardData = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  imageUrl: string | null;
  productCount: number;
};
