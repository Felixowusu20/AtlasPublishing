export type UserRole =
  | "author"
  | "co-author"
  | "reviewer"
  | "editor"
  | "reader";

export type ArticleType =
  | "Research Article"
  | "Review Article"
  | "Short Communication"
  | "Case Study"
  | "Technical Note"
  | "Book Review"
  | "Editorial"
  | "Perspective"
  | "Letter"
  | "Commentary"
  | "Conference Paper"
  | "Data Paper"
  | "Systematic Review"
  | "Meta-analysis"
  | "Thesis"
  | "Dissertation"
  | "Capstone Project"
  | "Student Research";

export type SubmissionStatus =
  | "Draft"
  | "Submitted"
  | "Technical Check"
  | "Under Review"
  | "Major Revision"
  | "Minor Revision"
  | "Accepted"
  | "Rejected"
  | "In Production"
  | "Published";

export type ReviewType =
  | "Single Blind"
  | "Double Blind"
  | "Open Review";

export interface Author {
  id: string;
  name: string;
  email: string;
  affiliation: string;
  orcid?: string;
  isCorresponding: boolean;
}

export interface Journal {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  issn: string;
  eIssn: string;
  doiPrefix: string;
  frequency: string;
  reviewType: ReviewType;
  description: string;
  aims: string;
  subjects: string[];
  impactFactor?: string;
  acceptanceRate: string;
  avgReviewDays: number;
  openAccess: boolean;
  apc: string;
  editorInChief: string;
  coverColor: string;
  indexedIn: string[];
  foundedYear: number;
}

export interface EditorialMember {
  name: string;
  role: string;
  affiliation: string;
  country: string;
}

export interface JournalIssue {
  id: string;
  journalSlug: string;
  volume: string;
  issue: string;
  year: string;
  publishedAt: string;
  title: string;
  articleCount: number;
  isCurrent: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  date: string;
  summary: string;
  href: string;
}

export interface Submission {
  id: string;
  manuscriptId: string;
  title: string;
  abstract: string;
  keywords: string[];
  articleType: ArticleType;
  journalId: string;
  journalTitle: string;
  status: SubmissionStatus;
  authors: Author[];
  submittedAt?: string;
  updatedAt: string;
  coverLetter?: string;
  funding?: string;
  conflictOfInterest?: string;
  ethicsStatement?: string;
  progressStep: number;
  actionRequired?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institution: string;
  orcid: string;
  researchInterests: string[];
}

export interface PublishedArticle {
  id: string;
  slug: string;
  doi: string;
  title: string;
  authors: string[];
  affiliations: string[];
  journalTitle: string;
  journalSlug: string;
  journalId: string;
  publishedAt: string;
  receivedAt: string;
  acceptedAt: string;
  volume: string;
  issue: string;
  pages: string;
  articleType: ArticleType;
  openAccess: boolean;
  license: string;
  abstract: string;
  keywords: string[];
  citations: number;
  downloads: number;
  views: number;
  sections: { heading: string; body: string }[];
}
