// Types des blocs JSON stockés dans les réglages du site (validés côté serveur avec Zod).

export type SocialLink = { platform: string; url: string };
export type TrustItem = { icon: string; title: string; text: string };
export type StepItem = { title: string; text: string };
export type FooterLink = { label: string; href: string; group: "navigation" | "legal" };

export type HomepageSections = {
  categories: boolean;
  featured: boolean;
  popular: boolean;
  trust: boolean;
  steps: boolean;
  faq: boolean;
};

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSections = {
  categories: true,
  featured: true,
  popular: true,
  trust: true,
  steps: true,
  faq: true,
};

export const SOCIAL_PLATFORMS = ["facebook", "instagram", "tiktok", "youtube", "linkedin", "x", "telegram"] as const;
