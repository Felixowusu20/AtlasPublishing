import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveIssueRecords,
  formatDateInterval,
  issueTitle,
  numberedIssuePlacement,
  resolveArticleIssue,
} from "./issues";
import { displayIssn } from "./issn";

function article(
  overrides: Partial<{
    volume: string | null;
    issue: string | null;
    publishedAt: string;
    journalId: string;
    slug: string;
    title: string;
    frequency: string;
    foundedYear: number;
  }>,
) {
  const journalId = overrides.journalId ?? "j1";
  return {
    volume: overrides.volume ?? "1",
    issue: overrides.issue ?? "1",
    publishedAt: overrides.publishedAt ?? "2026-03-10T00:00:00.000Z",
    journal: {
      id: journalId,
      slug: overrides.slug ?? "science",
      title: overrides.title ?? "Science Journal",
      shortTitle: "Sci",
      frequency: overrides.frequency ?? "Quarterly",
      foundedYear: overrides.foundedYear ?? 2026,
      issn: null,
    },
  };
}

describe("issue archives", () => {
  it("groups articles by journal and volume/issue", () => {
    const records = deriveIssueRecords([
      article({ issue: "1" }),
      article({ issue: "1", publishedAt: "2026-03-20T00:00:00.000Z" }),
      article({ issue: "2", publishedAt: "2026-06-01T00:00:00.000Z" }),
      article({
        journalId: "j2",
        slug: "health",
        title: "Health Journal",
        issue: "1",
      }),
    ]);

    assert.equal(records.length, 3);
    const currentScience = records.find(
      (row) => row.journalId === "j1" && row.isCurrent,
    );
    assert.equal(currentScience?.title, "Vol. 1 · Issue 2");
    assert.equal(currentScience?.articleCount, 1);

    const past = records.find((row) => row.journalId === "j1" && !row.isCurrent);
    assert.equal(past?.articleCount, 2);
    assert.equal(past?.intervalLabel, "January–March 2026");
  });

  it("turns Early View into the numbered issue for the publish date", () => {
    const placement = numberedIssuePlacement({
      publishedAt: "2026-03-10T00:00:00.000Z",
      frequency: "Quarterly",
      foundedYear: 2024,
    });
    assert.deepEqual(placement, { volume: "3", issue: "1" });

    const records = deriveIssueRecords([
      article({
        volume: "",
        issue: "Early View",
        foundedYear: 2024,
        frequency: "Quarterly",
      }),
      article({
        volume: "3",
        issue: "1",
        publishedAt: "2026-02-01T00:00:00.000Z",
        foundedYear: 2024,
      }),
    ]);
    assert.equal(records.length, 1);
    assert.equal(records[0]?.title, "Vol. 3 · Issue 1");
    assert.equal(records[0]?.articleCount, 2);
  });

  it("numbers monthly and quarterly issues from the publish date", () => {
    assert.deepEqual(
      resolveArticleIssue({
        volume: "",
        issue: "Early View",
        publishedAt: "2026-08-25T00:00:00.000Z",
        frequency: "Monthly",
        foundedYear: 2020,
      }),
      { volume: "7", issue: "8" },
    );
    assert.equal(
      formatDateInterval(
        "2026-02-01T00:00:00.000Z",
        "2026-02-20T00:00:00.000Z",
        "Monthly",
      ),
      "February 2026",
    );
    assert.equal(
      formatDateInterval(
        "2025-01-04T00:00:00.000Z",
        "2025-12-18T00:00:00.000Z",
        "Annual",
      ),
      "2025",
    );
    assert.equal(issueTitle("12", "3"), "Vol. 12 · Issue 3");
    assert.equal(displayIssn(null), "—");
    assert.equal(displayIssn("  "), "—");
    assert.equal(displayIssn("1234-5678"), "1234-5678");
  });
});
