import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

/** Seed Journal of Computational Methods (and keep it upsertable). */
async function main() {
  const journal = await prisma.journal.upsert({
    where: { slug: "journal-of-computational-methods" },
    update: {
      title: "Journal of Computational Methods",
      shortTitle: "JCM",
      issn: "2610-8893",
      eIssn: "2610-8907",
      doiPrefix: "10.58000/jcm",
      frequency: "Bimonthly",
      reviewType: "DOUBLE_BLIND",
      description:
        "Algorithms, modeling, simulation, and computational approaches across science and engineering.",
      aims: "To publish high-quality computational research with reproducible methods and open data.",
      subjects: ["Computer Science", "Applied Math", "AI", "Simulation"],
      impactFactor: "4.05",
      acceptanceRate: "18%",
      avgReviewDays: 24,
      openAccess: false,
      apc: "Subscription",
      editorInChief: "Prof. Sofia Almeida",
      coverColor: "#1E3A5F",
      indexedIn: ["Scopus", "Google Scholar", "CrossRef", "Dimensions"],
      foundedYear: 2007,
      isActive: true,
      sortOrder: 3,
    },
    create: {
      slug: "journal-of-computational-methods",
      title: "Journal of Computational Methods",
      shortTitle: "JCM",
      issn: "2610-8893",
      eIssn: "2610-8907",
      doiPrefix: "10.58000/jcm",
      frequency: "Bimonthly",
      reviewType: "DOUBLE_BLIND",
      description:
        "Algorithms, modeling, simulation, and computational approaches across science and engineering.",
      aims: "To publish high-quality computational research with reproducible methods and open data.",
      subjects: ["Computer Science", "Applied Math", "AI", "Simulation"],
      impactFactor: "4.05",
      acceptanceRate: "18%",
      avgReviewDays: 24,
      openAccess: false,
      apc: "Subscription",
      editorInChief: "Prof. Sofia Almeida",
      coverColor: "#1E3A5F",
      indexedIn: ["Scopus", "Google Scholar", "CrossRef", "Dimensions"],
      foundedYear: 2007,
      isActive: true,
      sortOrder: 3,
    },
  });

  console.log("Upserted Journal of Computational Methods:", journal.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
