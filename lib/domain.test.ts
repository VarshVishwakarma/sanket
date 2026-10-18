import { describe, expect, it } from "vitest";
import { applyTransfer, calculateRisk, compareScenario, selectEligibleDonors, stock } from "./domain";

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

  it("returns no transfer options when the scenario has no projected gap", () => {
    const stable = calculateRisk(stock.find((item) => item.id === "n-insulin")!);
    expect(selectEligibleDonors(stable)).toHaveLength(0);
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

describe("transfer state", () => {
  it("updates source and destination stock without mutating the seed", () => {
    const source = stock.find((item) => item.id === "r-vancomycin")!;
    const destination = stock.find((item) => item.id === "n-vancomycin")!;
    const next = applyTransfer(stock, {
      sourceId: source.id,
      destinationId: destination.id,
      quantity: 20,
      medicine: destination.medicine
    });
    expect(next.find((item) => item.id === source.id)?.onHand).toBe(source.onHand - 20);
    expect(next.find((item) => item.id === destination.id)?.onHand).toBe(destination.onHand + 20);
    expect(source.onHand).toBe(242);
    expect(destination.onHand).toBe(86);
  });

  it("improves the destination before/after projection", () => {
    const item = stock.find((entry) => entry.id === "n-vancomycin")!;
    const baseline = compareScenario(item, { id: "baseline", label: "Baseline", horizonDays: 14, demandMultiplier: 1, description: "" });
    const after = compareScenario({ ...item, onHand: item.onHand + 120 }, { id: "baseline", label: "Baseline", horizonDays: 14, demandMultiplier: 1, description: "" });
    expect(after.daysCover).toBeGreaterThan(baseline.daysCover);
    expect(after.gap).toBeLessThan(baseline.gap);
  });
});
