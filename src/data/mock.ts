import type {
  Announcement,
  ArticleType,
  CurrentUser,
  EditorialMember,
  Journal,
  JournalIssue,
  PublishedArticle,
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
    indexedIn: ["DOAJ", "Google Scholar", "CrossRef", "OpenAlex"],
    foundedYear: 2014,
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
    indexedIn: ["DOAJ", "Google Scholar", "CrossRef", "BASE"],
    foundedYear: 2018,
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
    indexedIn: ["Scopus", "Google Scholar", "CrossRef", "Dimensions"],
    foundedYear: 2007,
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
    indexedIn: ["DOAJ", "Google Scholar", "CrossRef", "ERIC"],
    foundedYear: 2021,
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
    actionRequired: undefined,
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
    actionRequired: "Upload revised manuscript and response letter by 10 Aug 2026",
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
    actionRequired: "Complete metadata and upload manuscript file",
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

export const platformStats = {
  journals: 4,
  articlesPublished: 1862,
  authors: 9400,
  countries: 78,
  avgDaysToFirstDecision: 21,
};

export const announcements: Announcement[] = [
  {
    id: "an-1",
    title: "Call for papers: Climate & Health special issue",
    date: "2026-07-01",
    summary:
      "AHSR invites submissions on climate-sensitive health systems through 30 September 2026.",
    href: "/journals/african-health-systems-review",
  },
  {
    id: "an-2",
    title: "APC waiver programme expanded for 2026",
    date: "2026-06-12",
    summary:
      "Full and partial waivers available for corresponding authors from eligible economies.",
    href: "/authors/fees",
  },
  {
    id: "an-3",
    title: "New continuous publishing model for Education & Society",
    date: "2026-05-20",
    summary:
      "Accepted articles now appear online as Early View within days of proof approval.",
    href: "/journals/education-and-society",
  },
];

export const editorialBoards: Record<string, EditorialMember[]> = {
  "atlas-journal-of-science": [
    {
      name: "Prof. Helen Markovic",
      role: "Editor-in-Chief",
      affiliation: "University of Vienna",
      country: "Austria",
    },
    {
      name: "Dr. Kenji Watanabe",
      role: "Associate Editor",
      affiliation: "Kyoto University",
      country: "Japan",
    },
    {
      name: "Prof. Aisha Rahman",
      role: "Section Editor, Biology",
      affiliation: "Aga Khan University",
      country: "Pakistan",
    },
    {
      name: "Dr. Tomasz Kowalski",
      role: "Section Editor, Physics",
      affiliation: "University of Warsaw",
      country: "Poland",
    },
  ],
  "african-health-systems-review": [
    {
      name: "Prof. Kwame Mensah",
      role: "Editor-in-Chief",
      affiliation: "University of Ghana",
      country: "Ghana",
    },
    {
      name: "Dr. Naledi Molefe",
      role: "Managing Editor",
      affiliation: "University of the Witwatersrand",
      country: "South Africa",
    },
    {
      name: "Prof. Fatima Al-Hassan",
      role: "Associate Editor",
      affiliation: "Cairo University",
      country: "Egypt",
    },
  ],
  "journal-of-computational-methods": [
    {
      name: "Prof. Sofia Almeida",
      role: "Editor-in-Chief",
      affiliation: "IST Lisbon",
      country: "Portugal",
    },
    {
      name: "Dr. Rajiv Mehta",
      role: "Associate Editor",
      affiliation: "IIT Bombay",
      country: "India",
    },
    {
      name: "Prof. Elena Petrova",
      role: "Associate Editor",
      affiliation: "Moscow State University",
      country: "Russia",
    },
  ],
  "education-and-society": [
    {
      name: "Dr. Priya Natarajan",
      role: "Editor-in-Chief",
      affiliation: "University of Toronto",
      country: "Canada",
    },
    {
      name: "Prof. Miguel Santos",
      role: "Associate Editor",
      affiliation: "University of São Paulo",
      country: "Brazil",
    },
  ],
};

export const journalIssues: JournalIssue[] = [
  {
    id: "iss-1",
    journalSlug: "atlas-journal-of-science",
    volume: "12",
    issue: "3",
    year: "2026",
    publishedAt: "2026-03-01",
    title: "Volume 12, Issue 3, March 2026",
    articleCount: 14,
    isCurrent: true,
  },
  {
    id: "iss-2",
    journalSlug: "atlas-journal-of-science",
    volume: "12",
    issue: "2",
    year: "2026",
    publishedAt: "2026-02-01",
    title: "Volume 12, Issue 2, February 2026",
    articleCount: 12,
    isCurrent: false,
  },
  {
    id: "iss-3",
    journalSlug: "african-health-systems-review",
    volume: "8",
    issue: "4",
    year: "2025",
    publishedAt: "2025-11-01",
    title: "Volume 8, Issue 4, Winter 2025",
    articleCount: 9,
    isCurrent: true,
  },
  {
    id: "iss-4",
    journalSlug: "journal-of-computational-methods",
    volume: "19",
    issue: "1",
    year: "2026",
    publishedAt: "2026-01-15",
    title: "Volume 19, Issue 1, January 2026",
    articleCount: 11,
    isCurrent: true,
  },
  {
    id: "iss-5",
    journalSlug: "education-and-society",
    volume: "5",
    issue: "Early View",
    year: "2026",
    publishedAt: "2026-02-08",
    title: "Volume 5, Continuous / Early View",
    articleCount: 6,
    isCurrent: true,
  },
];

export const publishedArticles: PublishedArticle[] = [
  {
    id: "pa-001",
    slug: "open-datasets-african-urban-mobility",
    doi: "10.58000/ajs.2026.0911",
    title: "Open Datasets for African Urban Mobility Research: A Review",
    authors: ["Amara Okonkwo", "Lena Hartmann"],
    affiliations: ["University of Lagos, Nigeria", "ETH Zurich, Switzerland"],
    journalTitle: "Atlas Journal of Science",
    journalSlug: "atlas-journal-of-science",
    journalId: "j-001",
    publishedAt: "2026-03-15",
    receivedAt: "2025-11-02",
    acceptedAt: "2026-02-20",
    volume: "12",
    issue: "3",
    pages: "201–228",
    articleType: "Review Article",
    openAccess: true,
    license: "CC BY 4.0",
    abstract:
      "A structured review of publicly available mobility datasets covering African cities, with recommendations for FAIR data practices.",
    keywords: ["open data", "mobility", "Africa", "FAIR", "urban systems"],
    citations: 14,
    downloads: 1280,
    views: 5402,
    sections: [
      {
        heading: "1. Introduction",
        body: "Urban mobility research in Africa is constrained by fragmented data access. This review maps open datasets and evaluates their fitness for reproducible science.",
      },
      {
        heading: "2. Methods",
        body: "We screened repositories, municipal portals, and academic archives (2015–2025), coding each dataset for coverage, license, update frequency, and documentation quality.",
      },
      {
        heading: "3. Results",
        body: "Forty-six datasets met inclusion criteria. Coverage is densest in large metro areas; secondary cities remain underrepresented. License clarity varies widely.",
      },
      {
        heading: "4. Discussion",
        body: "Publishers and city agencies can improve reuse by adopting standard metadata, stable DOIs, and machine-readable licenses.",
      },
      {
        heading: "5. Conclusions",
        body: "Open mobility data in Africa is growing but uneven. Coordinated FAIR practices would accelerate comparative urban research.",
      },
    ],
  },
  {
    id: "pa-002",
    slug: "community-health-worker-retention",
    doi: "10.58000/ahsr.2025.044",
    title: "Community Health Worker Retention Strategies in Sub-Saharan Africa",
    authors: ["Fatima Diallo", "Samuel Boateng", "Grace Njoroge"],
    affiliations: [
      "Cheikh Anta Diop University, Senegal",
      "Kwame Nkrumah University of Science and Technology, Ghana",
      "University of Nairobi, Kenya",
    ],
    journalTitle: "African Health Systems Review",
    journalSlug: "african-health-systems-review",
    journalId: "j-002",
    publishedAt: "2025-11-02",
    receivedAt: "2025-04-18",
    acceptedAt: "2025-09-30",
    volume: "8",
    issue: "4",
    pages: "88–109",
    articleType: "Research Article",
    openAccess: true,
    license: "CC BY 4.0",
    abstract:
      "We synthesize retention interventions for community health workers across twelve countries and propose a practical policy checklist.",
    keywords: ["community health", "retention", "workforce", "policy"],
    citations: 31,
    downloads: 2104,
    views: 8901,
    sections: [
      {
        heading: "1. Introduction",
        body: "Community health workers (CHWs) are central to primary care delivery, yet attrition undermines programme impact.",
      },
      {
        heading: "2. Methods",
        body: "A mixed-methods synthesis combined policy document review with key informant interviews in twelve countries.",
      },
      {
        heading: "3. Results",
        body: "Compensation clarity, career pathways, and supervisory support were the strongest retention correlates.",
      },
      {
        heading: "4. Conclusions",
        body: "Ministries can reduce attrition by bundling financial and non-financial incentives with routine supervision.",
      },
    ],
  },
  {
    id: "pa-003",
    slug: "sparse-tensor-climate-assimilation",
    doi: "10.58000/jcm.2026.018",
    title: "Sparse Tensor Factorization for Multi-Sensor Climate Assimilation",
    authors: ["Chen Wei", "Sofia Almeida"],
    affiliations: ["Tsinghua University, China", "IST Lisbon, Portugal"],
    journalTitle: "Journal of Computational Methods",
    journalSlug: "journal-of-computational-methods",
    journalId: "j-003",
    publishedAt: "2026-01-20",
    receivedAt: "2025-08-01",
    acceptedAt: "2025-12-12",
    volume: "19",
    issue: "1",
    pages: "45–67",
    articleType: "Research Article",
    openAccess: false,
    license: "Publisher copyright",
    abstract:
      "A scalable factorization method for assimilating heterogeneous climate sensor streams with missing observations.",
    keywords: ["tensor factorization", "climate", "data assimilation", "sensors"],
    citations: 9,
    downloads: 640,
    views: 2201,
    sections: [
      {
        heading: "1. Introduction",
        body: "Multi-sensor climate assimilation faces missingness and heterogeneous sampling rates that challenge classical Kalman filters.",
      },
      {
        heading: "2. Algorithm",
        body: "We formulate assimilation as sparse tensor completion with temporal smoothness regularization.",
      },
      {
        heading: "3. Experiments",
        body: "Benchmarks on synthetic and West African station networks show improved RMSE versus baseline interpolators.",
      },
    ],
  },
  {
    id: "pa-004",
    slug: "blended-learning-stem-outcomes",
    doi: "10.58000/es.2026.007",
    title: "Blended Learning Outcomes in First-Year STEM Courses",
    authors: ["Priya Natarajan", "Omar Hassan"],
    affiliations: ["University of Toronto, Canada", "American University in Cairo, Egypt"],
    journalTitle: "Education & Society",
    journalSlug: "education-and-society",
    journalId: "j-004",
    publishedAt: "2026-02-08",
    receivedAt: "2025-09-14",
    acceptedAt: "2026-01-22",
    volume: "5",
    issue: "Early View",
    pages: "EV-007",
    articleType: "Research Article",
    openAccess: true,
    license: "CC BY 4.0",
    abstract:
      "A multi-institution study of blended learning designs and their effect on retention and assessment performance.",
    keywords: ["blended learning", "STEM", "higher education", "retention"],
    citations: 3,
    downloads: 412,
    views: 1550,
    sections: [
      {
        heading: "1. Introduction",
        body: "Blended designs are widely adopted, yet evidence on first-year STEM retention remains mixed across contexts.",
      },
      {
        heading: "2. Study design",
        body: "We compared six course redesigns across three universities using matched assessment instruments.",
      },
      {
        heading: "3. Findings",
        body: "Structured active learning plus timely feedback improved pass rates without reducing content coverage.",
      },
    ],
  },
  {
    id: "pa-005",
    slug: "malaria-imaging-benchmarks",
    doi: "10.58000/ajs.2026.0102",
    title: "Benchmarking Lightweight CNNs for Field Malaria Microscopy",
    authors: ["James Adeyemi", "Amara Okonkwo"],
    affiliations: ["University of Lagos, Nigeria"],
    journalTitle: "Atlas Journal of Science",
    journalSlug: "atlas-journal-of-science",
    journalId: "j-001",
    publishedAt: "2026-03-08",
    receivedAt: "2025-10-11",
    acceptedAt: "2026-02-01",
    volume: "12",
    issue: "3",
    pages: "145–163",
    articleType: "Research Article",
    openAccess: true,
    license: "CC BY 4.0",
    abstract:
      "We compare mobile-friendly CNN architectures for malaria parasite detection on low-cost microscopes used in rural clinics.",
    keywords: ["malaria", "CNN", "edge AI", "diagnostics"],
    citations: 6,
    downloads: 890,
    views: 3104,
    sections: [
      {
        heading: "1. Introduction",
        body: "Field microscopy remains the diagnostic backbone in many clinics; AI assistants must run on constrained devices.",
      },
      {
        heading: "2. Results",
        body: "MobileNetV3 variants achieved competitive sensitivity with sub-second inference on mid-range phones.",
      },
    ],
  },
];

export const publishingWorkflow = [
  {
    step: "1",
    title: "Submit",
    detail: "Upload manuscript, metadata, and declarations in the guided wizard.",
  },
  {
    step: "2",
    title: "Editorial check",
    detail: "Technical screening and editor assignment.",
  },
  {
    step: "3",
    title: "Peer review",
    detail: "Single/double-blind or open review with structured scorecards.",
  },
  {
    step: "4",
    title: "Decision",
    detail: "Accept, revise, reject, or transfer, with clear author actions.",
  },
  {
    step: "5",
    title: "Produce & publish",
    detail: "Copyediting, proofs, DOI, issue assignment, and indexing.",
  },
];

export function getArticleBySlug(slug: string) {
  return publishedArticles.find((a) => a.slug === slug);
}

export function getArticlesByJournal(journalSlug: string) {
  return publishedArticles.filter((a) => a.journalSlug === journalSlug);
}

export function getIssuesByJournal(journalSlug: string) {
  return journalIssues.filter((i) => i.journalSlug === journalSlug);
}

export function getBoardByJournal(journalSlug: string) {
  return editorialBoards[journalSlug] ?? [];
}

export const notifications = [
  {
    id: "n-1",
    title: "Peer review in progress: AJS-2026-0142",
    body: "Your manuscript is with reviewers. Expected decision window: 14 days.",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: "n-2",
    title: "Action required: AHSR-2026-0087",
    body: "Minor revisions due by 10 August 2026.",
    time: "5 days ago",
    unread: true,
  },
  {
    id: "n-3",
    title: "Article published",
    body: "Your review article is live: DOI 10.58000/ajs.2026.0911.",
    time: "2 weeks ago",
    unread: false,
  },
];
