import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jointAuthorGreeting,
  notifyAuthorContacts,
  parseAuthorsJson,
} from "@/lib/author-contacts";

test("parseAuthorsJson keeps unique emails from metadata", () => {
  const listed = parseAuthorsJson([
    { name: "Ada Lovelace", email: "ada@example.org" },
    { name: "Alan Turing", email: "alan@example.org" },
    { name: "Ada again", email: "ADA@example.org" },
    { name: "Skip", email: "not-an-email" },
  ]);
  assert.deepEqual(
    listed.map((a) => a.email),
    ["ada@example.org", "alan@example.org"],
  );
});

test("notifyAuthorContacts adds the submitting account when missing", () => {
  const contacts = notifyAuthorContacts({
    authorsJson: [{ name: "Ada Lovelace", email: "ada@example.org" }],
    fallback: { name: "Submitter", email: "submitter@example.org" },
  });
  assert.equal(contacts.length, 2);
  assert.equal(contacts[0]?.email, "ada@example.org");
  assert.equal(contacts[1]?.email, "submitter@example.org");
});

test("jointAuthorGreeting names every co-author", () => {
  assert.equal(
    jointAuthorGreeting([
      { name: "Ada Lovelace", email: "a@x.com" },
      { name: "Alan Turing", email: "b@x.com" },
    ]),
    "Ada Lovelace and Alan Turing",
  );
});
