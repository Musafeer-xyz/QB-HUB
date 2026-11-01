import { describe, it, expect } from "vitest";
import { keepStoredSubject } from "@/lib/data/store";

/**
 * Regression: editing phy-02-cq-006 in the admin editor rewrote its subject to
 * "chemistry" (the editor's hard-coded default), moving a physics question into
 * chemistry and changing both subject totals. An edit keeps the stored subject.
 */

/** The values the editor sends, shaped like the buggy payload. */
const editorPayload = {
  id: "phy-02-cq-006",
  subject: "chemistry",
  chapter: 2,
  type: "CQ" as const,
};

describe("keepStoredSubject", () => {
  it("keeps physics when a physics question is saved from the editor", () => {
    const saved = keepStoredSubject(editorPayload, { subject: "physics" });
    expect(saved.subject).toBe("physics");
    expect(saved.id).toBe("phy-02-cq-006");
    // The edit itself still lands: chapter and type come from the form.
    expect(saved.chapter).toBe(2);
    expect(saved.type).toBe("CQ");
  });

  it("never writes a missing or null subject on update", () => {
    const missing = keepStoredSubject({ id: "phy-02-cq-006", chapter: 2 }, { subject: "physics" });
    expect(missing.subject).toBe("physics");

    const nulled = keepStoredSubject(
      { id: "phy-02-cq-006", subject: null, chapter: 2 },
      { subject: "physics" },
    );
    expect(nulled.subject).toBe("physics");

    // A stored row with no subject at all is not overwritten with a guess.
    const storedNull = keepStoredSubject({ id: "phy-02-cq-006", subject: "chemistry" }, { subject: null });
    expect(storedNull.subject).toBe("chemistry");
  });

  it("uses the payload subject only for a new question", () => {
    const created = keepStoredSubject({ id: "phy-99-cq-001", subject: "physics" }, null);
    expect(created.subject).toBe("physics");
    expect(keepStoredSubject({ id: "phy-99-cq-001", subject: "physics" }, undefined).subject).toBe(
      "physics",
    );
  });
});
