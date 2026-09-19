/**
 * Default homepage CMS content for Get started tabs + Indexed platforms.
 * Used as fallbacks when the DB is empty, and to seed admin CMS.
 */

export type GoalTabLink = { label: string; href: string };

export type GoalTabContent = {
  key: string;
  label: string;
  title: string;
  body: string;
  story: string;
  imageUrl: string;
  imageAlt: string;
  imageCaption: string;
  links: GoalTabLink[];
  sortOrder: number;
};

export type IndexedPlatformContent = {
  name: string;
  blurb: string;
  href: string;
  logoUrl: string;
  sortOrder: number;
};

export type HomeSectionContent = {
  key: "goals" | "indexed";
  eyebrow: string;
  title: string;
  body: string;
};

export const DEFAULT_GOALS_SECTION: HomeSectionContent = {
  key: "goals",
  eyebrow: "Get started",
  title: "Find the right resources for your goals",
  body: "Whether you are submitting a manuscript, reading open research, or guiding peer review, Nahda Publications supports every stage of scholarly communication.",
};

export const DEFAULT_INDEXED_SECTION: HomeSectionContent = {
  key: "indexed",
  eyebrow: "Indexed & discoverable",
  title: "Our publications appear on leading scholarly platforms",
  body: "",
};

export const DEFAULT_GOAL_TABS: GoalTabContent[] = [
  {
    key: "publish",
    label: "Research & publish",
    title: "Move ideas from manuscript to open publication",
    body: "Submit through our guided workflow, track peer review, and publish with a Nahda Identifier across our journal portfolio.",
    story: "Experiment → peer-reviewed paper",
    imageUrl:
      "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1400&q=80",
    imageAlt: "Scientist examining specimens under a laboratory microscope",
    imageCaption:
      "From the lab bench to a citable record—publish discoveries that other researchers can build on.",
    links: [
      { label: "Start a submission", href: "/submissions/new" },
      { label: "Author guidelines", href: "/authors/guidelines" },
      { label: "Article types", href: "/authors/article-types" },
    ],
    sortOrder: 0,
  },
  {
    key: "journals",
    label: "Explore journals",
    title: "Find the right home for your research",
    body: "Browse open-access titles across science, health, education, business, and the social sciences—each with clear aims and peer-review standards.",
    story: "Match field → right journal",
    imageUrl:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1400&q=80",
    imageAlt: "Rows of scholarly volumes in a research library",
    imageCaption:
      "Choose a journal that matches your field—open titles spanning science, health, education, and society.",
    links: [
      { label: "All journals", href: "/journals" },
      { label: "Current issues", href: "/articles/current-issues" },
      { label: "Past issues", href: "/articles/past-issues" },
    ],
    sortOrder: 1,
  },
  {
    key: "authors",
    label: "For authors",
    title: "Support at every stage of your paper",
    body: "From fees and waivers to production proofs, Nahda keeps the pathway transparent so you can focus on the science.",
    story: "Draft → supported submission",
    imageUrl:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80",
    imageAlt: "Researcher drafting a manuscript with charts and notes at a desk",
    imageCaption:
      "Write with clarity: fees, waivers, proofs, and tracking stay visible while you focus on the science.",
    links: [
      { label: "APC & fees", href: "/authors/fees" },
      { label: "Help center", href: "/help" },
      { label: "Create an account", href: "/register" },
    ],
    sortOrder: 2,
  },
  {
    key: "discover",
    label: "Discover research",
    title: "Read the latest open scholarship",
    body: "Search published articles, follow volume and issue archives, and resolve Nahda Identifiers for citable records.",
    story: "Search → cite open work",
    imageUrl:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80",
    imageAlt: "Scientific data charts and analytics on a research screen",
    imageCaption:
      "Explore open findings—search articles, follow issues, and resolve NIDs for trusted citations.",
    links: [
      { label: "Browse articles", href: "/articles" },
      { label: "Search catalog", href: "/search" },
      { label: "About Nahda", href: "/about" },
    ],
    sortOrder: 3,
  },
  {
    key: "pathway",
    label: "Publishing pathway",
    title: "A clear path from upload to indexing",
    body: "Technical screening, peer review, decision, production, and DOI assignment—structured so authors always know the next step.",
    story: "Upload → review → indexed",
    imageUrl:
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1400&q=80",
    imageAlt: "Editorial colleagues reviewing work together around a table",
    imageCaption:
      "See every stage—screening, review, decision, production, and indexing—in one clear timeline.",
    links: [
      { label: "Author dashboard", href: "/dashboard" },
      { label: "Submit a manuscript", href: "/submissions/new" },
      { label: "Contact & help", href: "/help" },
    ],
    sortOrder: 4,
  },
];

export const DEFAULT_INDEXED_PLATFORMS: IndexedPlatformContent[] = [
  {
    name: "Google Scholar",
    blurb:
      "Citation profiles and indexed Nahda articles for discovery worldwide.",
    href: "https://scholar.google.com/scholar?q=%22Nahda+Publications%22",
    logoUrl: "/brand/google-scholar-clean.png",
    sortOrder: 0,
  },
  {
    name: "ResearchGate",
    blurb:
      "Share full texts, track reads, and connect with co-authors and peers.",
    href: "https://www.researchgate.net/",
    logoUrl: "/brand/researchgate.svg",
    sortOrder: 1,
  },
  {
    name: "Academia.edu",
    blurb: "Reach readers across universities with open scholarly profiles.",
    href: "https://www.academia.edu/",
    logoUrl: "/brand/academia.svg",
    sortOrder: 2,
  },
];

export function parseGoalTabLinks(value: unknown): GoalTabLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is GoalTabLink =>
        !!item &&
        typeof item === "object" &&
        typeof (item as GoalTabLink).label === "string" &&
        typeof (item as GoalTabLink).href === "string",
    )
    .map((item) => ({
      label: item.label.trim(),
      href: item.href.trim(),
    }))
    .filter((item) => item.label && item.href);
}
