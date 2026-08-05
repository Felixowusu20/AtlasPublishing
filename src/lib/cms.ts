import { prisma } from "@/lib/db";

export const CMS_PAGE_SLUGS = ["about", "terms", "privacy"] as const;
export type CmsPageSlug = (typeof CMS_PAGE_SLUGS)[number];

export function isCmsPageSlug(value: string): value is CmsPageSlug {
  return (CMS_PAGE_SLUGS as readonly string[]).includes(value);
}

const ABOUT_BODY = `Nahda Publications is a scholarly publishing house that supports researchers from first submission through peer review, production, and open publication with DOI-backed records.

We operate peer-reviewed journals across science, technology, and related fields. Our platform gives authors a clear editorial workflow, transparent status tracking, and secure handling of manuscripts and article processing charges.

What we stand for

- Rigorous peer review and editorial standards
- Clear fees and waiver pathways after acceptance
- Secure payments processed through Paystack
- Open discovery via DOI metadata and journal sites
- Responsive support for authors and readers

Questions about Nahda Publications, payments, or editorial policy can be sent to nahdapublications@gmail.com.`;

const TERMS_BODY = `Last updated: 5 August 2026

These Terms & Conditions (“Terms”) govern your use of the Nahda Publications website, manuscript submission system, and related services (the “Services”). By creating an account, submitting a manuscript, or making a payment, you agree to these Terms.

1. Who we are
Nahda Publications (“we”, “us”, “our”) provides scholarly publishing services, including online manuscript submission, peer review coordination, article production, and publication. Contact: nahdapublications@gmail.com.

2. Accounts
You must provide accurate registration details and keep your login credentials confidential. You are responsible for activity under your account. We may suspend accounts that misuse the Services or violate these Terms.

3. Manuscript submissions
Authors confirm that submitted work is original, that they have the right to submit it, and that it does not infringe third-party rights. Editorial decisions (including acceptance, revision, or rejection) are at the discretion of the journal and do not create a guarantee of publication.

4. Article processing charges (APCs)
Where an APC applies, the amount shown for the relevant journal in our Fees pages is due after acceptance and before production. Payments are collected through Paystack. Currency display on checkout may use merchant-supported currencies; official Nahda receipts are issued in US dollars (USD) based on the journal APC.

5. Refunds
APC payments are generally non-refundable once production has begun. If a charge was made in error, contact nahdapublications@gmail.com within 14 days with your manuscript ID and payment reference. Refund eligibility is assessed case by case.

6. Acceptable use
You may not attempt to disrupt the Services, upload malware, scrape personal data, or use the platform for unlawful content. We may remove content or restrict access to protect authors, reviewers, and readers.

7. Intellectual property
Site design, branding, and platform software remain our property. Authors retain rights in their manuscripts subject to the journal’s publishing agreement and licence terms at acceptance/publication.

8. Third-party services
Payments are processed by Paystack. File storage and delivery may use Cloudinary or similar providers. Their terms and privacy practices apply to those processing steps.

9. Disclaimer
The Services are provided “as is”. We do not warrant uninterrupted availability. To the fullest extent permitted by law, we are not liable for indirect or consequential losses arising from use of the Services.

10. Changes
We may update these Terms to reflect product or legal changes. Continued use after publication of updates constitutes acceptance. Material payment-related changes will be reflected on this page.

11. Governing law
These Terms are governed by the laws of Ghana, without regard to conflict-of-law rules. Disputes should first be raised with our editorial office in good faith.`;

const PRIVACY_BODY = `Last updated: 5 August 2026

This Privacy Policy explains how Nahda Publications (“we”, “us”) collects, uses, and protects personal information when you use our website and publishing platform.

1. Information we collect
- Account details: name, email, password (stored as a hash), institution, ORCID, and research interests you provide
- Manuscript and editorial data: titles, abstracts, files, co-author details you submit, and review correspondence
- Payment data: amount, status, Paystack reference, and billing email. We do not store full card numbers; Paystack processes card details
- Technical data: cookies needed for sign-in and preference storage, and basic server logs (IP, user agent) for security

2. How we use information
- To operate accounts, submission, review, production, and publication workflows
- To send transactional emails (status updates, receipts, password resets)
- To process APCs and issue Nahda payment receipts
- To improve site reliability and prevent abuse
- To comply with legal or regulatory requests when required

3. Legal bases / purpose
We process data to perform our publishing contract with you, to pursue legitimate interests in running a secure journal platform, and where required by law.

4. Sharing
We share data with:
- Paystack — payment processing
- Cloudinary (or similar) — secure file hosting for manuscripts and images
- Email delivery providers configured for our SMTP account
- Reviewers and editors — only information needed for peer review

We do not sell personal data.

5. Cookies
Essential cookies keep you signed in and remember cookie preferences. Optional cookies, if accepted, help us understand site usage. See our cookie banner for choices. Details of this policy apply to cookie-related personal data.

6. Retention
Account and manuscript records are kept for the life of the publishing relationship and as needed for scholarly record-keeping. Payment references are retained for accounting and dispute resolution. You may request deletion of account data subject to legal and archival obligations for published works.

7. Security
We use encrypted connections (HTTPS), hashed passwords, role-based admin access, and signed uploads for large files. No method of transmission is perfectly secure; please use a strong unique password.

8. International transfers
Service providers may process data in other countries. We choose reputable processors and limit data to what is necessary.

9. Your rights
Depending on applicable law, you may request access, correction, or deletion of personal data, or object to certain processing. Contact nahdapublications@gmail.com. Published articles and DOIs may remain publicly available as part of the scholarly record.

10. Children
The Services are intended for researchers and adult users. We do not knowingly collect data from children under 16.

11. Contact
Privacy questions: nahdapublications@gmail.com
Nahda Publications — scholarly publishing for researchers worldwide.

12. Changes
We may update this Policy; the “Last updated” date will change when we do. Continued use of the Services after updates constitutes awareness of the revised Policy.`;

const DEFAULT_FAQS: { question: string; answer: string; sortOrder: number }[] =
  [
    {
      sortOrder: 0,
      question: "How do I submit a manuscript?",
      answer:
        "Sign in, open For Authors → Submit a manuscript, then complete the submission wizard for your chosen journal. Files upload securely for editorial handling.",
    },
    {
      sortOrder: 1,
      question: "Can I track my paper after submission?",
      answer:
        "Yes. Use your author dashboard or open the manuscript from My manuscripts to see editorial progress and messages from the editorial office.",
    },
    {
      sortOrder: 2,
      question: "What file formats are accepted?",
      answer:
        "Word (DOCX), PDF, LaTeX ZIP packages, images, and Excel/CSV supplements. Large files upload directly to secure cloud storage.",
    },
    {
      sortOrder: 3,
      question: "How do APCs and waivers work?",
      answer:
        "See Fees & waivers. Article processing charges are paid after acceptance and before production via our Nahda checkout (Paystack). Waiver requests can be sent to the editorial office.",
    },
    {
      sortOrder: 4,
      question: "How are payments secured?",
      answer:
        "Card payments are processed by Paystack. Nahda does not store full card numbers. You receive an official Nahda Publications receipt in USD by email after a successful charge.",
    },
    {
      sortOrder: 5,
      question: "How are articles published and cited?",
      answer:
        "Accepted articles receive a Nahda DOI, appear on the journal site, and include citation metadata for discovery services and Google Scholar.",
    },
    {
      sortOrder: 6,
      question: "How do I contact support?",
      answer:
        "Email nahdapublications@gmail.com. Typical response within 1 to 2 business days. For payment issues, include your manuscript ID and Paystack reference.",
    },
  ];

const DEFAULT_PAGES: Record<
  CmsPageSlug,
  { title: string; subtitle: string; body: string }
> = {
  about: {
    title: "About Nahda Publications",
    subtitle:
      "Peer-reviewed journals, transparent editorial workflow, and secure publishing for researchers worldwide.",
    body: ABOUT_BODY,
  },
  terms: {
    title: "Terms & Conditions",
    subtitle:
      "The rules that govern use of Nahda Publications websites, submissions, and payments.",
    body: TERMS_BODY,
  },
  privacy: {
    title: "Privacy Policy",
    subtitle:
      "How we collect, use, and protect personal information on the Nahda platform.",
    body: PRIVACY_BODY,
  },
};

/** Ensure default CMS rows exist (idempotent). Safe to call from public pages. */
export async function ensureCmsDefaults() {
  for (const slug of CMS_PAGE_SLUGS) {
    const existing = await prisma.cmsPage.findUnique({ where: { slug } });
    if (!existing) {
      const def = DEFAULT_PAGES[slug];
      await prisma.cmsPage.create({
        data: {
          slug,
          title: def.title,
          subtitle: def.subtitle,
          body: def.body,
          isActive: true,
        },
      });
    }
  }

  const faqCount = await prisma.faqItem.count();
  if (faqCount === 0) {
    await prisma.faqItem.createMany({ data: DEFAULT_FAQS });
  }
}

export async function getCmsPage(slug: CmsPageSlug) {
  await ensureCmsDefaults();
  return prisma.cmsPage.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function listFaqs(activeOnly = true) {
  await ensureCmsDefaults();
  return prisma.faqItem.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { sortOrder: "asc" },
  });
}

/** Split CMS body into paragraphs and bullet groups for safe HTML-free rendering. */
export type ProseBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "ul"; items: string[] };

function isHeadingLine(line: string) {
  if (line.startsWith("- ")) return false;
  if (/^\d+\.\s+\S/.test(line)) return true;
  return (
    line.length < 90 &&
    !/[.!?:]$/.test(line) &&
    !/^\d+\./.test(line)
  );
}

export function parseCmsBody(body: string): ProseBlock[] {
  const blocks: ProseBlock[] = [];
  const lines = body
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n")
    .map((l) => l.trimEnd());

  let i = 0;
  while (i < lines.length) {
    while (i < lines.length && !lines[i]!.trim()) i += 1;
    if (i >= lines.length) break;

    const line = lines[i]!.trim();

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("- ")) {
        items.push(lines[i]!.trim().replace(/^- /, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const next = lines[i + 1]?.trim() ?? "";
    // Numbered legal headings always stand alone.
    // Other short heading-like lines stand alone when followed by body text,
    // a blank line, bullets, or another heading.
    if (
      /^\d+\.\s+\S/.test(line) ||
      (isHeadingLine(line) &&
        (next === "" ||
          next.startsWith("- ") ||
          /^\d+\.\s+\S/.test(next) ||
          (next.length > 0 && !isHeadingLine(next))))
    ) {
      blocks.push({ type: "h", text: line });
      i += 1;
      continue;
    }

    const parts: string[] = [];
    while (i < lines.length) {
      const cur = lines[i]!.trim();
      if (!cur) break;
      if (cur.startsWith("- ")) break;
      if (parts.length > 0 && (/^\d+\.\s+\S/.test(cur) || isHeadingLine(cur))) {
        break;
      }
      parts.push(cur);
      i += 1;
    }
    if (parts.length === 1 && isHeadingLine(parts[0]!)) {
      blocks.push({ type: "h", text: parts[0]! });
    } else if (parts.length) {
      blocks.push({ type: "p", text: parts.join(" ") });
    }
  }

  return blocks;
}
