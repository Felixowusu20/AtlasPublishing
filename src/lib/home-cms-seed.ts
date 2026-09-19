import { prisma } from "@/lib/db";
import {
  DEFAULT_GOAL_TABS,
  DEFAULT_GOALS_SECTION,
  DEFAULT_INDEXED_PLATFORMS,
  DEFAULT_INDEXED_SECTION,
} from "@/lib/home-cms-defaults";

/** Seed Get started tabs + section heading when the table is empty. */
export async function ensureHomeGoalTabsSeeded() {
  const count = await prisma.homeGoalTab.count();
  if (count > 0) return;

  await prisma.$transaction([
    prisma.homeSection.upsert({
      where: { key: DEFAULT_GOALS_SECTION.key },
      create: {
        key: DEFAULT_GOALS_SECTION.key,
        eyebrow: DEFAULT_GOALS_SECTION.eyebrow,
        title: DEFAULT_GOALS_SECTION.title,
        body: DEFAULT_GOALS_SECTION.body,
      },
      update: {},
    }),
    ...DEFAULT_GOAL_TABS.map((tab) =>
      prisma.homeGoalTab.create({
        data: {
          key: tab.key,
          label: tab.label,
          title: tab.title,
          body: tab.body,
          story: tab.story,
          imageUrl: tab.imageUrl,
          imageAlt: tab.imageAlt,
          imageCaption: tab.imageCaption,
          links: tab.links,
          sortOrder: tab.sortOrder,
          isActive: true,
        },
      }),
    ),
  ]);
}

/** Seed Indexed platforms + section heading when the table is empty. */
export async function ensureIndexedPlatformsSeeded() {
  const count = await prisma.indexedPlatform.count();
  if (count > 0) return;

  await prisma.$transaction([
    prisma.homeSection.upsert({
      where: { key: DEFAULT_INDEXED_SECTION.key },
      create: {
        key: DEFAULT_INDEXED_SECTION.key,
        eyebrow: DEFAULT_INDEXED_SECTION.eyebrow,
        title: DEFAULT_INDEXED_SECTION.title,
        body: DEFAULT_INDEXED_SECTION.body || null,
      },
      update: {},
    }),
    ...DEFAULT_INDEXED_PLATFORMS.map((platform) =>
      prisma.indexedPlatform.create({
        data: {
          name: platform.name,
          blurb: platform.blurb,
          href: platform.href,
          logoUrl: platform.logoUrl,
          sortOrder: platform.sortOrder,
          isActive: true,
        },
      }),
    ),
  ]);
}
