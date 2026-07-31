import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

type SeedJournal = {
  slug: string;
  oldSlugs: string[];
  title: string;
  /** Abbreviation for spines, manuscript IDs, and compact UI */
  shortTitle: string;
  issn: string;
  eIssn: string;
  doiPrefix: string;
  frequency: string;
  reviewType: "DOUBLE_BLIND" | "SINGLE_BLIND" | "OPEN_REVIEW";
  description: string;
  aims: string;
  subjects: string[];
  impactFactor: string | null;
  acceptanceRate: string;
  avgReviewDays: number;
  openAccess: boolean;
  apc: string;
  editorInChief: string;
  coverColor: string;
  indexedIn: string[];
  foundedYear: number;
  sortOrder: number;
};

/** Official Nahda Publications journal portfolio. */
const JOURNALS: SeedJournal[] = [
  {
    slug: "nahda-journal-of-science-and-technology",
    oldSlugs: ["nahda-journal-of-science", "atlas-journal-of-science"],
    title: "Nahda Journal of Science and Technology",
    shortTitle: "NJST",
    issn: "2456-1120",
    eIssn: "2456-1139",
    doiPrefix: "10.58000/njst",
    frequency: "Monthly",
    reviewType: "DOUBLE_BLIND",
    description:
      "Original research across the natural sciences, engineering, and emerging technologies.",
    aims: "To advance rigorous scientific and technological discovery with open scholarly communication.",
    subjects: ["Science", "Engineering", "Technology", "Applied Research"],
    impactFactor: "3.42",
    acceptanceRate: "22%",
    avgReviewDays: 28,
    openAccess: true,
    apc: "$1,200",
    editorInChief: "Prof. Helen Markovic",
    coverColor: "#1E6847",
    indexedIn: ["DOAJ", "Google Scholar", "CrossRef", "OpenAlex"],
    foundedYear: 2014,
    sortOrder: 1,
  },
  {
    slug: "nahda-journal-of-health-and-biomedical-research",
    oldSlugs: [
      "nahda-african-health-systems-review",
      "african-health-systems-review",
    ],
    title: "Nahda Journal of Health and Biomedical Research",
    shortTitle: "NJHBR",
    issn: "2789-4412",
    eIssn: "2789-4420",
    doiPrefix: "10.58000/njhbr",
    frequency: "Quarterly",
    reviewType: "DOUBLE_BLIND",
    description:
      "Peer-reviewed work in clinical science, public health, biomedicine, and health systems.",
    aims: "To strengthen evidence-based health research and biomedical innovation.",
    subjects: [
      "Public Health",
      "Biomedicine",
      "Clinical Research",
      "Health Systems",
    ],
    impactFactor: "2.18",
    acceptanceRate: "28%",
    avgReviewDays: 32,
    openAccess: true,
    apc: "$1,000",
    editorInChief: "Prof. Kwame Mensah",
    coverColor: "#1A5F4A",
    indexedIn: ["DOAJ", "Google Scholar", "CrossRef", "BASE"],
    foundedYear: 2018,
    sortOrder: 2,
  },
  {
    slug: "nahda-journal-of-agriculture-food-and-sustainability",
    oldSlugs: [],
    title: "Nahda Journal of Agriculture, Food and Sustainability",
    shortTitle: "NJAFS",
    issn: "2810-2201",
    eIssn: "2810-221X",
    doiPrefix: "10.58000/njafs",
    frequency: "Quarterly",
    reviewType: "DOUBLE_BLIND",
    description:
      "Research on agriculture, food systems, nutrition, climate-smart practice, and sustainability.",
    aims: "To publish solutions that strengthen food security and sustainable agriculture.",
    subjects: ["Agriculture", "Food Science", "Sustainability", "Environment"],
    impactFactor: null,
    acceptanceRate: "30%",
    avgReviewDays: 30,
    openAccess: true,
    apc: "$900",
    editorInChief: "Prof. Amina Diallo",
    coverColor: "#3D6B3A",
    indexedIn: ["DOAJ", "Google Scholar", "CrossRef"],
    foundedYear: 2020,
    sortOrder: 3,
  },
  {
    slug: "nahda-journal-of-education-learning-and-development",
    oldSlugs: ["nahda-education-and-society", "education-and-society"],
    title: "Nahda Journal of Education, Learning and Development",
    shortTitle: "NJELD",
    issn: "2398-0044",
    eIssn: "2398-0052",
    doiPrefix: "10.58000/njeld",
    frequency: "Continuous",
    reviewType: "OPEN_REVIEW",
    description:
      "Research on pedagogy, higher education, curriculum design, learning technologies, and human development.",
    aims: "To connect educational research with classroom practice and institutional policy.",
    subjects: ["Education", "Pedagogy", "EdTech", "Development"],
    impactFactor: null,
    acceptanceRate: "27%",
    avgReviewDays: 30,
    openAccess: true,
    apc: "$600",
    editorInChief: "Dr. Priya Natarajan",
    coverColor: "#4A3728",
    indexedIn: ["DOAJ", "Google Scholar", "CrossRef", "ERIC"],
    foundedYear: 2021,
    sortOrder: 4,
  },
  {
    slug: "nahda-journal-of-business-economics-and-innovation",
    oldSlugs: [],
    title: "Nahda Journal of Business, Economics and Innovation",
    shortTitle: "NJBEI",
    issn: "2822-1104",
    eIssn: "2822-1112",
    doiPrefix: "10.58000/njbei",
    frequency: "Bimonthly",
    reviewType: "DOUBLE_BLIND",
    description:
      "Scholarship in management, economics, entrepreneurship, finance, and innovation studies.",
    aims: "To advance research that informs markets, policy, and entrepreneurial practice.",
    subjects: ["Business", "Economics", "Innovation", "Management"],
    impactFactor: "2.65",
    acceptanceRate: "24%",
    avgReviewDays: 28,
    openAccess: true,
    apc: "$1,100",
    editorInChief: "Prof. Elena Vargas",
    coverColor: "#0B3A53",
    indexedIn: ["DOAJ", "Google Scholar", "CrossRef", "Dimensions"],
    foundedYear: 2016,
    sortOrder: 5,
  },
  {
    slug: "nahda-journal-of-social-sciences-and-humanities",
    oldSlugs: [],
    title: "Nahda Journal of Social Sciences and Humanities",
    shortTitle: "NJSSH",
    issn: "2831-4408",
    eIssn: "2831-4416",
    doiPrefix: "10.58000/njssh",
    frequency: "Quarterly",
    reviewType: "DOUBLE_BLIND",
    description:
      "Research across sociology, anthropology, history, languages, culture, and the humanities.",
    aims: "To foster critical inquiry into society, culture, and the human experience.",
    subjects: ["Sociology", "Humanities", "Culture", "History"],
    impactFactor: null,
    acceptanceRate: "29%",
    avgReviewDays: 35,
    openAccess: true,
    apc: "$800",
    editorInChief: "Prof. Samuel Okeke",
    coverColor: "#5C3D2E",
    indexedIn: ["DOAJ", "Google Scholar", "CrossRef"],
    foundedYear: 2019,
    sortOrder: 6,
  },
  {
    slug: "nahda-journal-of-interdisciplinary-research",
    oldSlugs: [
      "nahda-journal-of-computational-methods",
      "journal-of-computational-methods",
    ],
    title: "Nahda Journal of Interdisciplinary Research",
    shortTitle: "NJIR",
    issn: "2610-8893",
    eIssn: "2610-8907",
    doiPrefix: "10.58000/njir",
    frequency: "Continuous",
    reviewType: "DOUBLE_BLIND",
    description:
      "Cross-cutting research that bridges disciplines, methods, and applied problem spaces.",
    aims: "To publish high-quality interdisciplinary work with clear methods and societal relevance.",
    subjects: [
      "Interdisciplinary Studies",
      "Methods",
      "Applied Research",
      "Innovation",
    ],
    impactFactor: "3.10",
    acceptanceRate: "20%",
    avgReviewDays: 26,
    openAccess: true,
    apc: "$1,200",
    editorInChief: "Prof. Sofia Almeida",
    coverColor: "#1E3A5F",
    indexedIn: ["Scopus", "Google Scholar", "CrossRef", "Dimensions"],
    foundedYear: 2007,
    sortOrder: 7,
  },
];

async function main() {
  const keepSlugs = new Set(JOURNALS.map((j) => j.slug));

  for (const j of JOURNALS) {
    const existing =
      (await prisma.journal.findUnique({ where: { slug: j.slug } })) ||
      (await prisma.journal.findFirst({
        where: { slug: { in: j.oldSlugs } },
      }));

    const data = {
      title: j.title,
      shortTitle: j.shortTitle,
      issn: j.issn,
      eIssn: j.eIssn,
      doiPrefix: j.doiPrefix,
      frequency: j.frequency,
      reviewType: j.reviewType,
      description: j.description,
      aims: j.aims,
      subjects: j.subjects,
      impactFactor: j.impactFactor,
      acceptanceRate: j.acceptanceRate,
      avgReviewDays: j.avgReviewDays,
      openAccess: j.openAccess,
      apc: j.apc,
      editorInChief: j.editorInChief,
      coverColor: j.coverColor,
      indexedIn: j.indexedIn,
      foundedYear: j.foundedYear,
      isActive: true,
      sortOrder: j.sortOrder,
      slug: j.slug,
    };

    if (existing) {
      const updated = await prisma.journal.update({
        where: { id: existing.id },
        data,
      });
      console.log(`Updated: ${updated.shortTitle} — ${updated.title}`);
    } else {
      const created = await prisma.journal.create({ data });
      console.log(`Created: ${created.shortTitle} — ${created.title}`);
    }
  }

  // Hide older titles that are not in the official portfolio
  const deactivated = await prisma.journal.updateMany({
    where: {
      slug: { notIn: [...keepSlugs] },
      isActive: true,
    },
    data: { isActive: false },
  });
  if (deactivated.count) {
    console.log(`Deactivated ${deactivated.count} legacy journal(s)`);
  }

  const active = await prisma.journal.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { sortOrder: true, shortTitle: true, title: true, slug: true },
  });
  console.log("\nActive portfolio:");
  for (const j of active) {
    console.log(
      `  ${String(j.sortOrder).padStart(2, "0")}  ${j.shortTitle.padEnd(6)}  ${j.title}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
