import "dotenv/config";
import { prisma } from "../src/lib/db";
import { ensureCmsDefaults } from "../src/lib/cms";

const ABOUT_BODY = `Nahda Publications is a scholarly publishing house that supports researchers from first submission through peer review, production, and open publication with DOI-backed records.

We operate peer-reviewed journals across science, technology, and related fields. Our platform gives authors a clear editorial workflow, transparent status tracking, and secure handling of manuscripts and article processing charges.

What we stand for

- Rigorous peer review and editorial standards
- Clear fees and waiver pathways after acceptance
- Secure payments processed through Paystack
- Open discovery via DOI metadata and journal sites
- Responsive support for authors and readers

Questions about Nahda Publications, payments, or editorial policy can be sent to nahdapublications@gmail.com.`;

async function main() {
  await ensureCmsDefaults();
  await prisma.cmsPage.update({
    where: { slug: "about" },
    data: { body: ABOUT_BODY },
  });
  const counts = await Promise.all([
    prisma.cmsPage.count(),
    prisma.faqItem.count(),
  ]);
  console.log("cms pages", counts[0], "faqs", counts[1]);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
