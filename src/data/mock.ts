import type {
  ArticleType,
  CurrentUser,
  Journal,
  Submission,
} from "@/lib/types";

export const currentUser: CurrentUser = {
  id: "u-001",
  name: "Dr. Amara Okonkwo",
  email: "amara.okonkwo@university.edu",
  role: "author",
  institution: "University of Lagos",
  orcid: "0000-0002-1825-0097",
  researchInterests: [
    "Machine Learning",
    "Public Health Informatics",
    "Climate Data Science",
  ],
};

export const articleTypes: ArticleType[] = [
  "Research Article",
  "Review Article",
  "Short Communication",
  "Case Study",
  "Technical Note",
  "Book Review",
  "Editorial",
  "Perspective",
  "Letter",
  "Commentary",
  "Conference Paper",
  "Data Paper",
  "Systematic Review",
  "Meta-analysis",
  "Thesis",
  "Dissertation",
  "Capstone Project",
  "Student Research",
];

export const journals: Journal[] = [
  {
    id: "j-001",
    slug: "atlas-journal-of-science",
    title: "Atlas Journal of Science",
    shortTitle: "AJS",
    issn: "2456-1120",
    eIssn: "2456-1139",
    doiPrefix: "10.58000/ajs",
    frequency: "Monthly",
    reviewType: "Double Blind",
    description:
      "A multidisciplinary journal publishing original research across the natural and applied sciences.",
    aims: "To advance rigorous scientific discovery and open scholarly communication worldwide.",
    subjects: ["Biology", "Chemistry", "Physics", "Earth Sciences"],
    impactFactor: "3.42",
    acceptanceRate: "22%",
    avgReviewDays: 28,
    openAccess: true,
    apc: "$1,200",
    editorInChief: "Prof. Helen Markovic",
    coverColor: "#0B3A53",
  },
  {
    id: "j-002",
    slug: "african-health-systems-review",
    title: "African Health Systems Review",
    shortTitle: "AHSR",
    issn: "2789-4412",
    eIssn: "2789-4420",
    doiPrefix: "10.58000/ahsr",
    frequency: "Quarterly",
    reviewType: "Single Blind",
    description:
      "Peer-reviewed research on health systems, policy, epidemiology, and clinical practice in Africa.",
    aims: "To strengthen evidence-based health policy and practice across African health systems.",
    subjects: ["Public Health", "Epidemiology", "Health Policy", "Clinical Medicine"],
    impactFactor: "2.18",
    acceptanceRate: "31%",
    avgReviewDays: 35,
    openAccess: true,
    apc: "$850",
    editorInChief: "Prof. Kwame Mensah",
    coverColor: "#1A5F4A",
  },
  {
    id: "j-003",
    slug: "journal-of-computational-methods",
    title: "Journal of Computational Methods",
    shortTitle: "JCM",
    issn: "2610-8893",
    eIssn: "2610-8907",
    doiPrefix: "10.58000/jcm",
    frequency: "Bimonthly",
    reviewType: "Double Blind",
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
  },
  {
    id: "j-004",
    slug: "education-and-society",
    title: "Education & Society",
    shortTitle: "E&S",
    issn: "2398-0044",
    eIssn: "2398-0052",
    doiPrefix: "10.58000/es",
    frequency: "Continuous",
    reviewType: "Open Review",
    description:
      "Research on pedagogy, higher education, curriculum design, and learning technologies.",
    aims: "To connect educational research with classroom practice and institutional policy.",
    subjects: ["Education", "Pedagogy", "EdTech", "Sociology"],
    acceptanceRate: "27%",
    avgReviewDays: 30,
    openAccess: true,
    apc: "$600",
    editorInChief: "Dr. Priya Natarajan",
    coverColor: "#4A3728",
  },
];

export const submissions: Submission[] = [
  {
    id: "s-001",
    manuscriptId: "AJS-2026-0142",
    title:
      "Deep Learning Approaches for Early Detection of Malaria from Thin Blood Smear Images",
    abstract:
      "This study evaluates convolutional neural network architectures for automated malaria detection using annotated thin blood smear datasets from three West African clinics.",
    keywords: ["malaria", "deep learning", "medical imaging", "diagnosis"],
    articleType: "Research Article",
    journalId: "j-001",
    journalTitle: "Atlas Journal of Science",
    status: "Under Review",
    authors: [
      {
        id: "a-001",
        name: "Dr. Amara Okonkwo",
        email: "amara.okonkwo@university.edu",
        affiliation: "University of Lagos",
        orcid: "0000-0002-1825-0097",
        isCorresponding: true,
      },
      {
        id: "a-002",
        name: "Dr. James Adeyemi",
        email: "j.adeyemi@unilag.edu.ng",
        affiliation: "University of Lagos",
        isCorresponding: false,
      },
    ],
    submittedAt: "2026-06-12",
    updatedAt: "2026-07-18",
    funding: "TETFund Research Grant NRF-2025-882",
    conflictOfInterest: "The authors declare no conflict of interest.",
    ethicsStatement: "Approved by UNILAG Ethics Board, Ref: HREC/2025/114.",
    progressStep: 5,
  },
  {
    id: "s-002",
    manuscriptId: "AHSR-2026-0087",
    title:
      "Primary Care Capacity and Maternal Outcomes in Rural Nigerian Health Facilities",
    abstract:
      "A mixed-methods assessment of maternal health outcomes across 42 primary care facilities, examining staffing, referral pathways, and supply chain readiness.",
    keywords: ["maternal health", "primary care", "Nigeria", "health systems"],
    articleType: "Research Article",
    journalId: "j-002",
    journalTitle: "African Health Systems Review",
    status: "Minor Revision",
    authors: [
      {
        id: "a-001",
        name: "Dr. Amara Okonkwo",
        email: "amara.okonkwo@university.edu",
        affiliation: "University of Lagos",
        orcid: "0000-0002-1825-0097",
        isCorresponding: true,
      },
    ],
    submittedAt: "2026-04-03",
    updatedAt: "2026-07-10",
    progressStep: 6,
  },
  {
    id: "s-003",
    manuscriptId: "JCM-2026-DRAFT",
    title: "Graph Neural Networks for Climate Station Interpolation",
    abstract:
      "We propose a graph neural network framework for interpolating sparse climate station observations across West Africa.",
    keywords: ["GNN", "climate", "interpolation", "geospatial"],
    articleType: "Research Article",
    journalId: "j-003",
    journalTitle: "Journal of Computational Methods",
    status: "Draft",
    authors: [
      {
        id: "a-001",
        name: "Dr. Amara Okonkwo",
        email: "amara.okonkwo@university.edu",
        affiliation: "University of Lagos",
        orcid: "0000-0002-1825-0097",
        isCorresponding: true,
      },
    ],
    updatedAt: "2026-07-20",
    progressStep: 2,
  },
  {
    id: "s-004",
    manuscriptId: "AJS-2025-0911",
    title: "Open Datasets for African Urban Mobility Research: A Review",
    abstract:
      "A structured review of publicly available mobility datasets covering African cities, with recommendations for FAIR data practices.",
    keywords: ["open data", "mobility", "Africa", "review"],
    articleType: "Review Article",
    journalId: "j-001",
    journalTitle: "Atlas Journal of Science",
    status: "Published",
    authors: [
      {
        id: "a-001",
        name: "Dr. Amara Okonkwo",
        email: "amara.okonkwo@university.edu",
        affiliation: "University of Lagos",
        orcid: "0000-0002-1825-0097",
        isCorresponding: true,
      },
      {
        id: "a-003",
        name: "Prof. Lena Hartmann",
        email: "l.hartmann@ethz.ch",
        affiliation: "ETH Zurich",
        isCorresponding: false,
      },
    ],
    submittedAt: "2025-11-02",
    updatedAt: "2026-03-15",
    progressStep: 8,
  },
];

export const submissionSteps = [
  { id: 1, label: "Journal & Type", description: "Select journal and article type" },
  { id: 2, label: "Metadata", description: "Title, abstract, keywords" },
  { id: 3, label: "Authors", description: "Authors and affiliations" },
  { id: 4, label: "Statements", description: "Funding, ethics, COI" },
  { id: 5, label: "Files", description: "Manuscript and supplements" },
  { id: 6, label: "Review", description: "Confirm and submit" },
] as const;

export function getJournalBySlug(slug: string) {
  return journals.find((j) => j.slug === slug);
}

export function getSubmissionById(id: string) {
  return submissions.find((s) => s.id === id);
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-700",
    Submitted: "bg-sky-100 text-sky-800",
    "Technical Check": "bg-indigo-100 text-indigo-800",
    "Under Review": "bg-amber-100 text-amber-900",
    "Major Revision": "bg-orange-100 text-orange-900",
    "Minor Revision": "bg-yellow-100 text-yellow-900",
    Accepted: "bg-emerald-100 text-emerald-800",
    Rejected: "bg-rose-100 text-rose-800",
    "In Production": "bg-violet-100 text-violet-800",
    Published: "bg-teal-100 text-teal-900",
  };
  return map[status] ?? "bg-slate-100 text-slate-700";
}
