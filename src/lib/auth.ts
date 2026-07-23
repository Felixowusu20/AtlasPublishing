export type DemoRole = "author" | "reviewer" | "editor" | "reader";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: DemoRole;
  institution: string;
  orcid?: string;
  researchInterests: string[];
}

export const DEMO_USERS_KEY = "atlas_demo_users";
export const DEMO_SESSION_KEY = "atlas_demo_session";

/** Seed accounts — password for all demos is: demo1234 */
export const seedUsers: DemoUser[] = [
  {
    id: "u-001",
    name: "Dr. Amara Okonkwo",
    email: "amara.okonkwo@university.edu",
    password: "demo1234",
    role: "author",
    institution: "University of Lagos",
    orcid: "0000-0002-1825-0097",
    researchInterests: [
      "Machine Learning",
      "Public Health Informatics",
      "Climate Data Science",
    ],
  },
  {
    id: "u-002",
    name: "Prof. Daniel Reed",
    email: "d.reed@reviewer.org",
    password: "demo1234",
    role: "reviewer",
    institution: "University of Cape Town",
    orcid: "0000-0001-5555-2222",
    researchInterests: ["Epidemiology", "Biostatistics"],
  },
  {
    id: "u-003",
    name: "Prof. Helen Markovic",
    email: "h.markovic@atlas.pub",
    password: "demo1234",
    role: "editor",
    institution: "Atlas Publishing House",
    researchInterests: ["Editorial Policy", "Open Science"],
  },
];

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
