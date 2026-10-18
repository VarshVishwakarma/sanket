export type RiskLevel = "critical" | "watch" | "stable";
export type TransferStatus = "recommended" | "review" | "not-eligible";

export interface Facility {
  id: string;
  name: string;
  shortName: string;
  region: string;
  beds: number;
  occupancy: number;
  contact: string;
}

export interface MedicineStock {
  id: string;
  facilityId: string;
  medicine: string;
  form: string;
  onHand: number;
  dailyUse: number;
  inbound: number;
  safetyDays: number;
  unit: string;
  updatedAt: string;
}

export interface StockRisk extends MedicineStock {
  daysCover: number;
  projectedShortageDate: string | null;
  risk: RiskLevel;
  gap: number;
}

export interface TransferOption {
  donor: Facility;
  stock: MedicineStock;
  availableAfterBuffer: number;
  safeTransfer: number;
  distanceKm: number;
  status: TransferStatus;
  rationale: string;
}

export interface RehearsalScenario {
  id: string;
  label: string;
  horizonDays: number;
  demandMultiplier: number;
  description: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail: string;
  tone: "teal" | "amber" | "coral";
}

export const facilities: Facility[] = [
  { id: "north-star", name: "North Star Medical Center", shortName: "North Star", region: "North district", beds: 420, occupancy: 0.91, contact: "Dr. Asha Menon" },
  { id: "riverbend", name: "Riverbend Community Hospital", shortName: "Riverbend", region: "East district", beds: 260, occupancy: 0.77, contact: "Nikhil Rao, COO" },
  { id: "green-valley", name: "Green Valley Clinic", shortName: "Green Valley", region: "West district", beds: 180, occupancy: 0.62, contact: "Dr. Meera Shah" },
  { id: "harbor-view", name: "Harbor View Hospital", shortName: "Harbor View", region: "South district", beds: 340, occupancy: 0.84, contact: "Anita Joseph, Ops" }
];

export const stock: MedicineStock[] = [
  { id: "n-vancomycin", facilityId: "north-star", medicine: "Vancomycin 500mg", form: "IV vial", onHand: 86, dailyUse: 15, inbound: 0, safetyDays: 3, unit: "vials", updatedAt: "12 min ago" },
  { id: "n-insulin", facilityId: "north-star", medicine: "Insulin glargine", form: "100u/mL pen", onHand: 214, dailyUse: 26, inbound: 120, safetyDays: 5, unit: "pens", updatedAt: "18 min ago" },
  { id: "n-saline", facilityId: "north-star", medicine: "Normal saline 1L", form: "IV bag", onHand: 640, dailyUse: 94, inbound: 400, safetyDays: 4, unit: "bags", updatedAt: "21 min ago" },
  { id: "r-vancomycin", facilityId: "riverbend", medicine: "Vancomycin 500mg", form: "IV vial", onHand: 242, dailyUse: 12, inbound: 0, safetyDays: 5, unit: "vials", updatedAt: "8 min ago" },
  { id: "r-insulin", facilityId: "riverbend", medicine: "Insulin glargine", form: "100u/mL pen", onHand: 86, dailyUse: 14, inbound: 0, safetyDays: 4, unit: "pens", updatedAt: "32 min ago" },
  { id: "r-saline", facilityId: "riverbend", medicine: "Normal saline 1L", form: "IV bag", onHand: 410, dailyUse: 48, inbound: 300, safetyDays: 4, unit: "bags", updatedAt: "16 min ago" },
  { id: "g-vancomycin", facilityId: "green-valley", medicine: "Vancomycin 500mg", form: "IV vial", onHand: 138, dailyUse: 7, inbound: 0, safetyDays: 5, unit: "vials", updatedAt: "41 min ago" },
  { id: "g-insulin", facilityId: "green-valley", medicine: "Insulin glargine", form: "100u/mL pen", onHand: 310, dailyUse: 9, inbound: 0, safetyDays: 7, unit: "pens", updatedAt: "44 min ago" },
  { id: "h-vancomycin", facilityId: "harbor-view", medicine: "Vancomycin 500mg", form: "IV vial", onHand: 172, dailyUse: 10, inbound: 0, safetyDays: 6, unit: "vials", updatedAt: "27 min ago" },
  { id: "h-insulin", facilityId: "harbor-view", medicine: "Insulin glargine", form: "100u/mL pen", onHand: 190, dailyUse: 12, inbound: 80, safetyDays: 5, unit: "pens", updatedAt: "11 min ago" }
];

export const scenarios: RehearsalScenario[] = [
  { id: "baseline", label: "Baseline", horizonDays: 14, demandMultiplier: 1, description: "Current usage trend" },
  { id: "surge", label: "Respiratory surge", horizonDays: 14, demandMultiplier: 1.28, description: "28% demand uplift" },
  { id: "delay", label: "Supplier delay", horizonDays: 14, demandMultiplier: 1.08, description: "Inbound delayed 5 days" }
];

export const auditEvents: AuditEvent[] = [
  { id: "a1", timestamp: "Today, 09:42", actor: "Sanket engine", action: "Risk recalculated", detail: "North Star • Vancomycin 500mg moved to critical", tone: "coral" },
  { id: "a2", timestamp: "Today, 09:18", actor: "Dr. Asha Menon", action: "Rehearsal opened", detail: "Shortage response for North Star Medical Center", tone: "teal" },
  { id: "a3", timestamp: "Today, 08:55", actor: "Inventory sync", action: "Stock updated", detail: "Riverbend • Normal saline +300 inbound", tone: "teal" },
  { id: "a4", timestamp: "Yesterday, 17:30", actor: "Nikhil Rao", action: "Transfer approved", detail: "48 insulin pens from Green Valley to Riverbend", tone: "amber" }
];

export function calculateRisk(item: MedicineStock, demandMultiplier = 1, delayInbound = false): StockRisk {
  const effectiveInbound = delayInbound ? 0 : item.inbound;
  const available = item.onHand + effectiveInbound;
  const daysCover = item.dailyUse * demandMultiplier > 0 ? available / (item.dailyUse * demandMultiplier) : 999;
  const criticalHorizon = item.safetyDays + 3;
  const gap = Math.max(0, Math.ceil((item.dailyUse * demandMultiplier * criticalHorizon) - item.onHand - effectiveInbound));
  const risk: RiskLevel = daysCover <= criticalHorizon ? "critical" : daysCover <= criticalHorizon + 3 ? "watch" : "stable";
  const date = risk === "stable" ? null : new Date(Date.now() + Math.max(0, Math.floor(daysCover)) * 86400000).toISOString();
  return { ...item, daysCover, projectedShortageDate: date, risk, gap };
}

export function getFacility(facilityId: string): Facility {
  return facilities.find((facility) => facility.id === facilityId) ?? facilities[0];
}

export function selectEligibleDonors(shortage: StockRisk, demandMultiplier = 1): TransferOption[] {
  return stock
    .filter((item) => item.medicine === shortage.medicine && item.facilityId !== shortage.facilityId)
    .map((donorStock) => {
      const donor = getFacility(donorStock.facilityId);
      const availableAfterBuffer = Math.max(0, donorStock.onHand - donorStock.dailyUse * donorStock.safetyDays);
      const safeTransfer = Math.min(availableAfterBuffer, Math.max(0, Math.ceil(shortage.gap || shortage.dailyUse * demandMultiplier * 3)));
      const distanceKm = donor.id === "riverbend" ? 12 : donor.id === "harbor-view" ? 19 : 27;
      const eligible = availableAfterBuffer > 0 && safeTransfer > 0;
      const status: TransferStatus = eligible
        ? safeTransfer >= shortage.gap
          ? "recommended"
          : "review"
        : "not-eligible";
      return {
        donor,
        stock: donorStock,
        availableAfterBuffer,
        safeTransfer,
        distanceKm,
        status,
        rationale: eligible ? `Leaves ${Math.round((availableAfterBuffer - safeTransfer) / donorStock.dailyUse)} days of donor cover` : "Protected stock buffer would be breached"
      };
    })
    .sort((a, b) => (a.status === "recommended" ? -1 : b.status === "recommended" ? 1 : a.distanceKm - b.distanceKm));
}

export function compareScenario(item: MedicineStock, scenario: RehearsalScenario): StockRisk {
  return calculateRisk(item, scenario.demandMultiplier, scenario.id === "delay");
}
