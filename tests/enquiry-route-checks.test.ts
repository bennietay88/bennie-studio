import assert from "node:assert/strict";
import test from "node:test";
import { inspectContactActions } from "../server/enquiryRouteChecks";
test("a missing contact route requires staff review even when a page exists", () => {
  assert.ok(
    inspectContactActions({ pages: [{ sections: [] }] } as any).issues.length,
  );
});
test("contact button configuration and owner-confirmed receipt are measured separately", () => {
  const page = {
    id: "home",
    title: "Home",
    slug: "",
    sections: [
      {
        id: "call",
        type: "hero",
        content: {
          ctaText: "Call",
          buttonAction: {
            actionType: "phone",
            label: "Call",
            target: "+60123456789",
          },
        },
      },
    ],
  };
  assert.deepEqual(inspectContactActions({ pages: [page] } as any), {
    count: 1,
    issues: [],
  });
  page.sections[0].content.buttonAction.target = "bad number";
  assert.equal(
    inspectContactActions({ pages: [page] } as any).issues[0].reason,
    "missing_phone",
  );
});
