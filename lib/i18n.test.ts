import { describe, expect, it } from "vitest";
import { auditAction, auditDetail, donorStatusLabel, messages, riskLabel, timestampLabel, translate } from "./i18n";

describe("localization catalog", () => {
  it("keeps English and Hindi keys identical and non-empty", () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.hi).sort());
    for (const key of Object.keys(messages.en) as Array<keyof typeof messages.en>) {
      expect(messages.en[key]).not.toHaveLength(0);
      expect(messages.hi[key]).not.toHaveLength(0);
    }
  });

  it("localizes statuses and preserves dynamic variables", () => {
    expect(riskLabel("hi", "critical")).toBe("गंभीर");
    expect(donorStatusLabel("hi", "recommended")).toBe("अनुशंसित");
    expect(translate("hi", "eventTransferDetail", { quantity: 48, medicine: "Insulin", facility: "Riverbend" })).toContain("48");
    expect(translate("en", "eventTransferDetail", { quantity: 48, medicine: "Insulin", facility: "Riverbend" })).toContain("Riverbend");
    expect(translate("hi", "donorRationaleCover", { days: 4 })).toContain("4");
    expect(auditAction("hi", "Transfer approved")).toBe("ट्रांसफर स्वीकृत");
    expect(auditDetail("hi", { action: "Risk recalculated", detail: "North Star • Vancomycin 500mg moved to critical" })).toContain("गंभीर");
    expect(timestampLabel("hi", "Just now")).toBe("अभी");
  });
});
