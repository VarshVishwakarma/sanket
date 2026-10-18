import { describe, expect, it } from "vitest";
import { calculateRisk, compareScenario, selectEligibleDonors, stock } from "./domain";

describe("stock risk engine", () => {
  it("flags North Star vancomycin as critical at baseline", () => {
    const risk = calculateRisk(stock.find((item) => item.id === "n-vancomycin")!);
    expect(risk.risk).toBe("critical");
    expect(risk.daysCover).toBeLessThan(6);
    expect(risk.gap).toBeGreaterThan(0);
  });

  it("includes inbound inventory in cover", () => {
    const risk = calculateRisk(stock.find((item) => item.id === "n-insulin")!);
    expect(risk.daysCover).toBeGreaterThan(10);
    expect(risk.risk).toBe("stable");
  });
});

describe("allocator", () => {
  it("selects a safe donor and never exceeds donor buffer", () => {
    const shortage = calculateRisk(stock.find((item) => item.id === "n-vancomycin")!);
    const donors = selectEligibleDonors(shortage);
    expect(donors[0].status).toBe("recommended");
    expect(donors[0].safeTransfer).toBeLessThanOrEqual(donors[0].availableAfterBuffer);
  });
});

describe("scenario engine", () => {
  it("makes the surge scenario worse than baseline", () => {
    const item = stock.find((entry) => entry.id === "n-vancomycin")!;
    const baseline = compareScenario(item, { id: "baseline", label: "Baseline", horizonDays: 14, demandMultiplier: 1, description: "" });
    const surge = compareScenario(item, { id: "surge", label: "Surge", horizonDays: 14, demandMultiplier: 1.28, description: "" });
    expect(surge.daysCover).toBeLessThan(baseline.daysCover);
    expect(surge.gap).toBeGreaterThanOrEqual(baseline.gap);
  });
});
