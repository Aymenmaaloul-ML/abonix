// Données de démonstration Abonix. Tous les produits portent un SKU « DEMO-… » et un nom suffixé « (démo) »
// afin d'être identifiés (et remplacés) facilement. Les prix sont fictifs, en dinars (TND).

type Availability = "IN_STOCK" | "ON_REQUEST" | "OUT_OF_STOCK";

export type DemoVariant = { name: string; priceTnd: number; durationLabel?: string; licenseType?: string; availability?: Availability };
export type DemoProduct = {
  sku: string;
  slug: string;
  name: string;
  category: string;
  brand?: string;
  short: string;
  description: string;
  features: string[];
  requirements?: string[];
  priceTnd?: number;
  variants?: DemoVariant[];
  status?: "PUBLISHED" | "DRAFT";
  availability?: Availability;
  featured?: boolean;
  popular?: boolean;
  quantityMax?: number;
  faqs?: { question: string; answer: string }[];
  related?: string[]; // slugs
};

export const DEMO_CATEGORIES = [
  { slug: "outils-ia", name: "Outils IA", icon: "sparkles", featured: true, description: "Assistants, génération d'images et outils d'automatisation basés sur l'intelligence artificielle." },
  { slug: "abonnements-productivite", name: "Abonnements & productivité", icon: "briefcase", featured: true, description: "Suites bureautiques, stockage cloud, design et outils pour travailler efficacement." },
  { slug: "cartes-cadeaux", name: "Cartes cadeaux", icon: "gift", featured: true, description: "Cartes et codes numériques pour le streaming, les jeux et les boutiques d'applications." },
  { slug: "logiciels-licences", name: "Logiciels & licences", icon: "key-round", featured: true, description: "Licences de logiciels et solutions de sécurité pour votre ordinateur." },
  { slug: "hebergement-domaines", name: "Hébergement & domaines", icon: "server", featured: false, description: "Noms de domaine et hébergement web pour lancer votre site." },
  { slug: "formations-templates", name: "Formations & templates", icon: "graduation-cap", featured: false, description: "Cours en ligne, modèles de documents et templates prêts à l'emploi." },
] as const;

const SAMPLE = "_Produit d'exemple : remplacez ce texte, le prix et les images depuis l'administration._";

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    sku: "DEMO-IA-001",
    slug: "assistant-ia-abonnement-pro-demo",
    name: "Assistant IA – abonnement Pro (démo)",
    category: "outils-ia",
    short: "Un assistant conversationnel pour rédiger, résumer, traduire et analyser, avec un accès prioritaire.",
    description: `## Pour qui ?\n\nÉtudiants, indépendants et équipes qui veulent gagner du temps sur la rédaction, la recherche et l'analyse de documents.\n\n## Ce que vous obtenez\n\nUn accès Pro à un assistant IA pour la durée choisie. Les modalités d'activation sont précisées lors de la confirmation sur WhatsApp.\n\n${SAMPLE}`,
    features: ["Accès Pro pour la durée choisie", "Réponses plus rapides aux heures de forte affluence", "Analyse de documents et de tableaux", "Support en français pour l'activation"],
    requirements: ["Une adresse e-mail valide", "Un navigateur récent ou l'application mobile"],
    variants: [
      { name: "1 mois", priceTnd: 55, durationLabel: "1 mois" },
      { name: "3 mois", priceTnd: 150, durationLabel: "3 mois" },
      { name: "12 mois", priceTnd: 520, durationLabel: "12 mois" },
    ],
    featured: true,
    popular: true,
    faqs: [
      { question: "Puis-je utiliser mon compte existant ?", answer: "Cela dépend de l'offre. Indiquez-le sur WhatsApp : nous vous dirons ce qui est possible avant toute commande." },
      { question: "Que se passe-t-il à la fin de la période ?", answer: "L'abonnement n'est pas renouvelé automatiquement par Abonix. Vous pouvez recommander quand vous le souhaitez." },
    ],
    related: ["generateur-images-ia-credits-demo", "assistant-code-ia-demo"],
  },
  {
    sku: "DEMO-IA-002",
    slug: "generateur-images-ia-credits-demo",
    name: "Générateur d'images IA – crédits (démo)",
    category: "outils-ia",
    short: "Des crédits pour créer des visuels à partir d'une description, pour vos réseaux ou vos présentations.",
    description: `Créez des illustrations et des visuels originaux à partir de quelques mots.\n\n${SAMPLE}`,
    features: ["Crédits utilisables sur la plateforme", "Résolution adaptée aux réseaux sociaux", "Usage selon les conditions de la plateforme"],
    variants: [
      { name: "100 crédits", priceTnd: 29 },
      { name: "500 crédits", priceTnd: 119 },
    ],
    popular: true,
  },
  {
    sku: "DEMO-IA-003",
    slug: "assistant-code-ia-demo",
    name: "Assistant de code IA – licence individuelle (démo)",
    category: "outils-ia",
    short: "Complétion et explication de code directement dans votre éditeur.",
    description: `Un assistant de programmation pour les développeurs et les étudiants en informatique.\n\n${SAMPLE}`,
    features: ["Suggestions de code dans l'éditeur", "Explication et refactorisation", "Compatible avec les principaux éditeurs"],
    requirements: ["Un éditeur de code compatible"],
    variants: [
      { name: "1 mois", priceTnd: 38 },
      { name: "12 mois", priceTnd: 360 },
    ],
  },
  {
    sku: "DEMO-AB-001",
    slug: "suite-bureautique-cloud-1-an-demo",
    name: "Suite bureautique cloud – 1 an (démo)",
    category: "abonnements-productivite",
    short: "Traitement de texte, tableur et présentations, avec stockage en ligne.",
    description: `Tous vos documents au même endroit, accessibles depuis votre ordinateur et votre téléphone.\n\n${SAMPLE}`,
    features: ["Texte, tableur et présentations", "Stockage cloud inclus", "Édition à plusieurs en temps réel"],
    priceTnd: 89,
    featured: true,
    related: ["stockage-cloud-1-to-demo"],
  },
  {
    sku: "DEMO-AB-002",
    slug: "stockage-cloud-1-to-demo",
    name: "Stockage cloud 1 To (démo)",
    category: "abonnements-productivite",
    short: "Sauvegardez et partagez vos photos et documents depuis tous vos appareils.",
    description: `Un grand espace de stockage en ligne avec synchronisation automatique.\n\n${SAMPLE}`,
    features: ["1 To d'espace", "Synchronisation multi-appareils", "Partage de dossiers par lien"],
    variants: [
      { name: "6 mois", priceTnd: 70, durationLabel: "6 mois" },
      { name: "12 mois", priceTnd: 120, durationLabel: "12 mois" },
    ],
  },
  {
    sku: "DEMO-AB-003",
    slug: "outil-design-en-ligne-pro-demo",
    name: "Outil de design en ligne – Pro (démo)",
    category: "abonnements-productivite",
    short: "Créez affiches, publications et présentations avec des modèles professionnels.",
    description: `Idéal pour les associations, les commerçants et les créateurs de contenu.\n\n${SAMPLE}`,
    features: ["Bibliothèque de modèles", "Export haute qualité", "Kit de marque (couleurs et polices)"],
    variants: [
      { name: "3 mois", priceTnd: 45 },
      { name: "12 mois", priceTnd: 140 },
    ],
    popular: true,
  },
  {
    sku: "DEMO-CC-001",
    slug: "carte-cadeau-streaming-25-demo",
    name: "Carte cadeau streaming 25 € (démo)",
    category: "cartes-cadeaux",
    short: "Un code numérique à utiliser sur une plateforme de streaming.",
    description: `Offrez ou utilisez un crédit pour vos films, séries et musiques.\n\n${SAMPLE}`,
    features: ["Code numérique", "Valeur : 25 €", "Instructions d'activation fournies"],
    requirements: ["Vérifiez que la carte est valable dans votre région avant de commander"],
    priceTnd: 95,
    availability: "ON_REQUEST",
    featured: true,
  },
  {
    sku: "DEMO-CC-002",
    slug: "carte-cadeau-jeux-20-demo",
    name: "Carte cadeau jeux vidéo 20 € (démo)",
    category: "cartes-cadeaux",
    short: "Un crédit pour acheter des jeux et du contenu additionnel.",
    description: `Un code à échanger contre des jeux et des extensions.\n\n${SAMPLE}`,
    features: ["Code numérique", "Valeur : 20 €"],
    priceTnd: 78,
    quantityMax: 5,
  },
  {
    sku: "DEMO-CC-003",
    slug: "carte-cadeau-applications-10-demo",
    name: "Carte cadeau boutique d'applications 10 € (démo)",
    category: "cartes-cadeaux",
    short: "Un crédit pour vos applications et achats intégrés.",
    description: `Pratique pour les abonnements et achats dans les applications.\n\n${SAMPLE}`,
    features: ["Code numérique", "Valeur : 10 €"],
    priceTnd: 39,
    quantityMax: 5,
    availability: "OUT_OF_STOCK",
  },
  {
    sku: "DEMO-LG-001",
    slug: "licence-systeme-exploitation-demo",
    name: "Licence système d'exploitation (démo)",
    category: "logiciels-licences",
    short: "Une licence pour activer votre système d'exploitation sur un poste.",
    description: `Activation d'un poste avec une clé de licence.\n\n${SAMPLE}`,
    features: ["Clé de licence pour 1 poste", "Instructions d'activation"],
    requirements: ["Vérifiez la compatibilité avec votre version actuelle"],
    priceTnd: 120,
    featured: true,
  },
  {
    sku: "DEMO-LG-002",
    slug: "antivirus-1-an-demo",
    name: "Antivirus – 1 an (démo)",
    category: "logiciels-licences",
    short: "Protection contre les virus et les sites frauduleux pour vos appareils.",
    description: `Une protection de base pour naviguer et télécharger plus sereinement.\n\n${SAMPLE}`,
    features: ["Analyse en temps réel", "Protection de la navigation", "Mises à jour automatiques"],
    variants: [
      { name: "1 appareil", priceTnd: 35, licenseType: "1 appareil" },
      { name: "3 appareils", priceTnd: 70, licenseType: "3 appareils" },
    ],
  },
  {
    sku: "DEMO-HD-001",
    slug: "hebergement-web-mutualise-demo",
    name: "Hébergement web mutualisé (démo)",
    category: "hebergement-domaines",
    short: "Un espace pour publier votre site vitrine ou votre blog.",
    description: `Un hébergement adapté aux sites de petite et moyenne taille.\n\n${SAMPLE}`,
    features: ["Espace disque SSD", "Certificat SSL", "Messagerie professionnelle"],
    variants: [
      { name: "Starter – 1 an", priceTnd: 60, durationLabel: "1 an" },
      { name: "Business – 1 an", priceTnd: 120, durationLabel: "1 an" },
    ],
    related: ["nom-de-domaine-com-demo"],
  },
  {
    sku: "DEMO-HD-002",
    slug: "nom-de-domaine-com-demo",
    name: "Nom de domaine .com – 1 an (démo)",
    category: "hebergement-domaines",
    short: "Réservez l'adresse de votre site, disponibilité à vérifier avec nous.",
    description: `Donnez-nous le nom souhaité sur WhatsApp : nous vérifions sa disponibilité avant de confirmer.\n\n${SAMPLE}`,
    features: ["Enregistrement pour 1 an", "Gestion DNS"],
    priceTnd: 55,
    availability: "ON_REQUEST",
  },
  {
    sku: "DEMO-FT-001",
    slug: "formation-excel-demo",
    name: "Formation Excel, de zéro à avancé (démo)",
    category: "formations-templates",
    short: "Un parcours en vidéo pour maîtriser les formules, les tableaux croisés et les graphiques.",
    description: `Un cours progressif avec des exercices pratiques.\n\n${SAMPLE}`,
    features: ["Cours en vidéo", "Fichiers d'exercices", "Accès illimité aux contenus"],
    priceTnd: 79,
    popular: true,
  },
  {
    sku: "DEMO-FT-002",
    slug: "pack-templates-cv-presentations-demo",
    name: "Pack de templates CV & présentations (démo)",
    category: "formations-templates",
    short: "Des modèles modifiables pour soigner vos candidatures et vos présentations.",
    description: `Un pack de modèles prêts à personnaliser.\n\n${SAMPLE}`,
    features: ["Modèles de CV", "Modèles de présentations", "Formats modifiables"],
    priceTnd: 25,
  },
  {
    sku: "DEMO-FT-003",
    slug: "template-site-vitrine-demo",
    name: "Template de site vitrine (brouillon) (démo)",
    category: "formations-templates",
    short: "Brouillon non publié : visible uniquement dans l'administration.",
    description: `Ce produit est un brouillon : il n'apparaît pas sur le site public.\n\n${SAMPLE}`,
    features: ["Exemple de produit en brouillon"],
    priceTnd: 49,
    status: "DRAFT",
  },
];

export const DEMO_FAQS = [
  { question: "Comment commander ?", answer: "Choisissez un produit, sélectionnez l'offre qui vous convient puis cliquez sur « Commander via WhatsApp ». Un message prérempli s'ouvre : il vous suffit de l'envoyer. Notre équipe vous répond pour confirmer la disponibilité." },
  { question: "Puis-je payer sur le site ?", answer: "Non. Le site est un catalogue : il n'y a pas de paiement en ligne. Les modalités de paiement vous sont indiquées par l'équipe lors de la confirmation sur WhatsApp." },
  { question: "Le prix affiché est-il définitif ?", answer: "Le prix affiché est celui du moment, en dinars tunisiens (TND). Il est confirmé avec la disponibilité lorsque nous répondons à votre message." },
  { question: "En combien de temps reçois-je mon produit ?", answer: "Le délai dépend du produit. L'équipe vous l'indique en confirmant votre demande sur WhatsApp." },
  { question: "Dois-je créer un compte ?", answer: "Non. Vous pouvez parcourir le catalogue et envoyer votre demande sans compte." },
  { question: "J'ai cliqué sur « Commander » mais je n'ai pas envoyé le message. Que se passe-t-il ?", answer: "Rien n'est commandé tant que vous n'avez pas envoyé le message sur WhatsApp et que nous ne l'avons pas confirmé." },
];
