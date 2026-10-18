"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, Bell, Boxes, Check, ChevronDown, ClipboardCheck, FileText,
  FlaskConical, LayoutDashboard, Menu, PackageCheck, Search, ShieldCheck, Sparkles,
  Truck, X
} from "lucide-react";
import {
  applyTransfer, auditEvents, calculateRisk, compareScenario, facilities, getFacility,
  scenarios, selectEligibleDonors, stock, type AuditEvent, type MedicineStock, type ReportExtraction,
  type RiskLevel, type TransferDecision
} from "@/lib/domain";
import { cn, formatDays } from "@/lib/utils";
import FacilityNetwork from "@/components/facility-network";
import { auditAction, auditDetail, donorStatusLabel, riskLabel, scenarioDescription, scenarioLabel, translate, type Language } from "@/lib/i18n";

type View = "overview" | "rehearsal" | "reports" | "audit";

const navItems: Array<{ id: View; icon: typeof LayoutDashboard }> = [
  { id: "overview", icon: LayoutDashboard },
  { id: "rehearsal", icon: FlaskConical },
  { id: "reports", icon: FileText },
  { id: "audit", icon: ClipboardCheck }
];

const t = translate;

const riskStyles: Record<RiskLevel, string> = {
  critical: "bg-[#fff0ed] text-[#c65439]",
  watch: "bg-[#fff7df] text-[#a26c00]",
  stable: "bg-[#e8f7f1] text-[#0b756a]"
};

function RiskPill({ risk, language }: { risk: RiskLevel; language: Language }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]", riskStyles[risk])}>{riskLabel(language, risk)}</span>;
}

function Header({ activeView, language, onMenu, onLanguage, onNotifications }: {
  activeView: View; language: Language; onMenu: () => void; onLanguage: () => void; onNotifications: () => void;
}) {
  const today = new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  return <header className="flex items-center justify-between border-b border-[#dce7e3] bg-white px-5 py-4 md:px-8">
    <div className="flex items-center gap-3">
      <button className="rounded-lg p-2 hover:bg-canvas md:hidden" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button>
      <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal">Sanket / {t(language, activeView)}</p><p className="mt-1 text-sm text-muted">{today} <span className="mx-1 text-[#c0ceca]">•</span> {t(language, "syntheticSnapshot")}</p></div>
    </div>
    <div className="flex items-center gap-2">
      <button onClick={onNotifications} className="relative rounded-xl border border-[#dce7e3] p-2.5 text-muted hover:bg-canvas" aria-label="Notifications"><Bell size={18} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-coral" /></button>
      <button onClick={onLanguage} className="rounded-xl border border-[#dce7e3] px-3 py-2 text-xs font-bold text-teal hover:bg-canvas">{t(language, "language")}</button>
      <div className="hidden items-center gap-2 border-l border-[#dce7e3] pl-3 sm:flex"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">AM</div><div><p className="text-xs font-bold">Asha Menon</p><p className="text-[11px] text-muted">Network lead</p></div><ChevronDown size={14} className="text-muted" /></div>
    </div>
  </header>;
}

function Sidebar({ activeView, language, open, setView, close }: {
  activeView: View; language: Language; open: boolean; setView: (view: View) => void; close: () => void;
}) {
  return <aside className={cn("fixed inset-y-0 left-0 z-20 flex w-[272px] -translate-x-full flex-col border-r border-[#dce7e3] bg-[#102b2d] px-5 py-6 text-white transition-transform md:static md:translate-x-0", open && "translate-x-0")}>
    <div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c7f0df] text-ink"><Activity size={20} /></div><div><p className="text-lg font-bold">sanket</p><p className="text-[10px] uppercase tracking-[0.18em] text-[#9bc2ba]">care in motion</p></div></div><button className="rounded-lg p-1 text-[#9bc2ba] md:hidden" onClick={close} aria-label="Close navigation"><X size={18} /></button></div>
    <div className="mt-12"><p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7fa9a2]">{t(language, "workspace")}</p>{navItems.map(({ id, icon: Icon }) => <button key={id} onClick={() => { setView(id); close(); }} className={cn("mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition", activeView === id ? "bg-[#1b4c4d] font-bold text-white" : "text-[#acc8c3] hover:bg-[#173b3d] hover:text-white")}><Icon size={17} />{t(language, id)}{id === "rehearsal" && <span className="ml-auto rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold text-white">3</span>}</button>)}</div>
    <div className="mt-auto rounded-2xl border border-[#2a5657] bg-[#173b3d] p-4"><div className="mb-3 flex items-center gap-2 text-[#bdebdc]"><ShieldCheck size={17} /><span className="text-xs font-bold">{t(language, "networkPosture")}</span></div><p className="text-2xl font-bold">{t(language, "good")}</p><p className="mt-1 text-xs leading-5 text-[#9bc2ba]">{t(language, "synced")}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#2a5657]"><div className="h-full w-[92%] rounded-full bg-[#9de2c9]" /></div></div>
    <p className="mt-6 px-1 text-[10px] text-[#6e9792]">Sanket v0.5.0 • Demo environment</p>
  </aside>;
}

function Overview({ inventory, language, setView }: { inventory: MedicineStock[]; language: Language; setView: (view: View) => void }) {
  const risks = inventory.map((item) => calculateRisk(item)).sort((a, b) => ({ critical: 0, watch: 1, stable: 2 }[a.risk] - { critical: 0, watch: 1, stable: 2 }[b.risk]));
  const critical = risks.filter((item) => item.risk === "critical");
  const watch = risks.filter((item) => item.risk === "watch");
  const topRisk = risks[0];
  return <div className="grid-paper min-h-full space-y-6 p-5 md:p-8">
    <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-sm font-bold text-teal">{t(language, "goodMorning")}</p><h1 className="mt-2 max-w-xl text-3xl font-bold tracking-tight text-ink md:text-4xl">{t(language, "heroTitle1")}<br /><span className="text-teal">{t(language, "heroTitle2")}</span></h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">{t(language, "heroDescription")}</p></div><button onClick={() => setView("rehearsal")} className="flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white shadow-card transition hover:-translate-y-0.5"><FlaskConical size={17} /> {t(language, "openRehearsal")} <ArrowRight size={16} /></button></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: t(language, "critical"), value: critical.length, note: t(language, "critical"), color: "coral", icon: Activity },
      { label: t(language, "watch"), value: watch.length, note: t(language, "watch"), color: "amber", icon: Bell },
      { label: t(language, "facilities"), value: `${facilities.length} / ${facilities.length}`, note: t(language, "syntheticDemo"), color: "teal", icon: ShieldCheck },
      { label: "Tracked stock lines", value: inventory.length, note: "Across seeded medicines", color: "ink", icon: Boxes }
    ].map(({ label, value, note, color, icon: Icon }) => <div key={label} className="rounded-2xl border border-[#dce7e3] bg-white p-5 shadow-card"><div className="flex items-start justify-between"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p><Icon size={18} className={color === "coral" ? "text-coral" : color === "amber" ? "text-amber" : color === "teal" ? "text-teal" : "text-ink"} /></div><p className="mt-5 text-3xl font-bold tracking-tight text-ink">{value}</p><p className="mt-1 text-xs text-muted">{note}</p></div>)}</section>
    <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><div className="rounded-2xl border border-[#dce7e3] bg-white shadow-card"><div className="flex items-center justify-between border-b border-[#e5eeeb] px-5 py-4"><div><h2 className="font-bold text-ink">{t(language, "medicineResilience")}</h2><p className="mt-1 text-xs text-muted">{t(language, "estimatedCoverage")}</p></div><button onClick={() => setView("rehearsal")} className="text-xs font-bold text-teal hover:underline">{t(language, "rehearseResponse")} <ArrowRight size={13} className="ml-1 inline" /></button></div><div className="divide-y divide-[#edf2f0]">{risks.slice(0, 6).map((item) => <button key={item.id} onClick={() => setView("rehearsal")} className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-[#f7fbf9] sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", item.risk === "critical" ? "bg-[#fff0ed] text-coral" : item.risk === "watch" ? "bg-[#fff7df] text-amber" : "bg-[#e8f7f1] text-teal")}><PackageCheck size={17} /></div><div className="min-w-0"><p className="truncate text-sm font-bold">{item.medicine}</p><p className="text-xs text-muted">{getFacility(item.facilityId).shortName} <span className="mx-1">•</span> {item.form}</p></div></div><div className="flex items-center gap-5 sm:pl-4"><div><p className="text-sm font-bold">{formatDays(item.daysCover)}</p><p className="text-[11px] text-muted">{t(language, "coverageLabel")}</p></div><RiskPill risk={item.risk} language={language} /></div></button>)}</div></div><div className="rounded-2xl border border-[#dce7e3] bg-[#e8f7f1] p-6"><div className="flex items-center gap-2 text-teal"><Sparkles size={17} /><p className="text-xs font-bold uppercase tracking-[0.16em]">{t(language, "nextAction")}</p></div><h2 className="mt-5 text-xl font-bold leading-7 text-ink">{topRisk ? `Protect ${getFacility(topRisk.facilityId).shortName}&apos;s ${topRisk.medicine} cover.` : "No open medicine risks."}</h2><p className="mt-3 text-sm leading-6 text-[#4d716d]">{topRisk ? `The current estimate shows ${formatDays(topRisk.daysCover)} of cover and a ${topRisk.gap} ${topRisk.unit} gap under the selected assumptions.` : "All seeded medicine lines are above their configured safety threshold."}</p><button onClick={() => setView("rehearsal")} className="mt-6 flex items-center gap-2 rounded-xl bg-teal px-4 py-3 text-sm font-bold text-white hover:bg-[#0c655e]">{t(language, "runRehearsal")} <ArrowRight size={15} /></button></div></section>
    <section className="rounded-2xl border border-[#dce7e3] bg-white p-5 shadow-card"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Facility readiness</h2><p className="mt-1 text-xs text-muted">Occupancy and open alerts by site</p></div><button onClick={() => setView("overview")} className="text-xs font-bold text-teal hover:underline">View network <ArrowRight size={13} className="ml-1 inline" /></button></div><div className="grid gap-3 md:grid-cols-4">{facilities.map((facility) => <div key={facility.id} className="rounded-xl border border-[#e5eeeb] p-4"><div className="flex items-start justify-between gap-2"><p className="text-sm font-bold">{facility.shortName}</p><span className={cn("h-2.5 w-2.5 rounded-full", facility.id === "north-star" ? "bg-coral" : "bg-teal")} /></div><p className="mt-1 text-xs text-muted">{facility.region}</p><div className="mt-4 flex items-end justify-between"><div><p className="text-lg font-bold">{Math.round(facility.occupancy * 100)}%</p><p className="text-[11px] text-muted">occupancy</p></div><p className="text-xs text-muted">{risks.filter((item) => item.facilityId === facility.id && item.risk !== "stable").length} alerts</p></div><div className="mt-3 h-1.5 rounded-full bg-[#edf2f0]"><div className={cn("h-full rounded-full", facility.id === "north-star" ? "bg-coral" : "bg-teal")} style={{ width: `${facility.occupancy * 100}%` }} /></div></div>)}</div></section>
  </div>;
}

function Rehearsal({ inventory, language, onApprove, onReset, initialFacilityId, initialMedicineId, approvedTransfers }: {
  inventory: MedicineStock[]; language: Language; onApprove: (decision: TransferDecision) => void; onReset: () => void; initialFacilityId?: string; initialMedicineId?: string; approvedTransfers: string[];
}) {
  const [facilityId, setFacilityId] = useState(initialFacilityId ?? "north-star");
  const [medicineId, setMedicineId] = useState(initialMedicineId ?? "n-vancomycin");
  const [scenarioId, setScenarioId] = useState("baseline");
  const [selectedDonorId, setSelectedDonorId] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const item = inventory.find((entry) => entry.id === medicineId) ?? inventory[0];
  const facilityStock = inventory.filter((entry) => entry.facilityId === facilityId);
  const scenario = scenarios.find((entry) => entry.id === scenarioId) ?? scenarios[0];
  const result = compareScenario(item, scenario);
  const donors = useMemo(() => selectEligibleDonors(result, scenario.demandMultiplier, inventory), [result, scenario, inventory]);
  const selectedDonor = donors.find((donor) => donor.stock.id === selectedDonorId) ?? null;
  const after = selectedDonor ? { ...item, onHand: item.onHand + selectedDonor.safeTransfer } : item;
  const afterRisk = compareScenario(after, scenario);
  const approvalKey = selectedDonor ? `${selectedDonor.stock.id}:${item.id}` : "";
  const alreadyApproved = Boolean(approvalKey && approvedTransfers.includes(approvalKey));

  function changeFacility(nextFacilityId: string) {
    setFacilityId(nextFacilityId);
    const nextItem = inventory.find((entry) => entry.facilityId === nextFacilityId);
    if (nextItem) setMedicineId(nextItem.id);
    setSelectedDonorId(null);
    setApproved(false);
  }

  function reset() {
    setFacilityId("north-star");
    setMedicineId("n-vancomycin");
    setScenarioId("baseline");
    setSelectedDonorId(null);
    setApproved(false);
    onReset();
  }

  return <div className="min-h-full bg-canvas p-5 md:p-8"><div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-bold text-teal">Response rehearsal</p><h1 className="mt-2 text-3xl font-bold tracking-tight">What if this shortage gets worse?</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Use deterministic projections to compare scenarios, identify safe donors, and create a defensible transfer decision.</p></div><button onClick={reset} className="flex items-center justify-center gap-2 rounded-xl border border-[#cbdcd7] bg-white px-4 py-3 text-sm font-bold text-ink hover:bg-[#e8f7f1]">Reset rehearsal</button></div>
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><div className="space-y-4"><div className="rounded-2xl border border-[#dce7e3] bg-white p-5 shadow-card"><div className="mb-5 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f7f1] text-teal"><FlaskConical size={16} /></div><div><h2 className="font-bold">{t(language, "setSituation")}</h2><p className="text-xs text-muted">{t(language, "chooseIncident")}</p></div></div><label className="mb-4 block text-xs font-bold text-muted">{t(language, "facility")}<select value={facilityId} onChange={(event) => changeFacility(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dce7e3] bg-white px-3 py-3 text-sm font-medium">{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}</select></label><label className="mb-4 block text-xs font-bold text-muted">{t(language, "medicine")}    <select value={medicineId} onChange={(event) => { setMedicineId(event.target.value); setSelectedDonorId(null); setApproved(false); }} className="mt-2 w-full rounded-xl border border-[#dce7e3] bg-white px-3 py-3 text-sm font-medium">{facilityStock.map((entry) => <option key={entry.id} value={entry.id}>{entry.medicine} — {entry.onHand} {entry.unit}</option>)}</select></label><label className="block text-xs font-bold text-muted">{t(language, "scenario")}    <select value={scenarioId} onChange={(event) => { setScenarioId(event.target.value); setSelectedDonorId(null); setApproved(false); }} className="mt-2 w-full rounded-xl border border-[#dce7e3] bg-white px-3 py-3 text-sm font-medium">{scenarios.map((entry) => <option key={entry.id} value={entry.id}>{scenarioLabel(language, entry.id as "baseline" | "surge" | "delay")} — {scenarioDescription(language, entry.id as "baseline" | "surge" | "delay")}</option>)}</select></label></div><div className="rounded-2xl border border-[#dce7e3] bg-[#102b2d] p-5 text-white"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9bc2ba]">{t(language, "decisionRecord")}</p><p className="mt-3 text-sm leading-6 text-[#d4e5e0]">{t(language, "assumptionsVisible")}</p><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-[#173b3d] p-3"><p className="text-[#9bc2ba]">{t(language, "horizon")}</p><p className="mt-1 font-bold">{scenario.horizonDays} days</p></div><div className="rounded-xl bg-[#173b3d] p-3"><p className="text-[#9bc2ba]">{t(language, "demandFactor")}</p><p className="mt-1 font-bold">{scenario.demandMultiplier}×</p></div></div></div></div>
      <div className="space-y-4"><div className="rounded-2xl border border-[#dce7e3] bg-white p-5 shadow-card"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t(language, "projection")}</p><h2 className="mt-2 text-xl font-bold">{getFacility(item.facilityId).shortName} needs {item.medicine}</h2><p className="mt-1 text-sm text-muted">{scenarioDescription(language, scenario.id as "baseline" | "surge" | "delay")} over the next {scenario.horizonDays} days <span className="mx-1">•</span> {t(language, "estimateNote")}</p></div><RiskPill risk={result.risk} language={language} /></div><div className="mt-6 grid grid-cols-3 gap-3"><div className="rounded-xl bg-canvas p-4"><p className="text-2xl font-bold">{formatDays(result.daysCover)}</p><p className="mt-1 text-xs text-muted">{t(language, "coverage")}</p></div><div className="rounded-xl bg-canvas p-4"><p className="text-2xl font-bold">{result.gap}</p><p className="mt-1 text-xs text-muted">{item.unit} gap</p></div><div className="rounded-xl bg-canvas p-4"><p className="text-2xl font-bold">{item.dailyUse}</p><p className="mt-1 text-xs text-muted">{t(language, "dailyUse")}</p></div></div><div className="mt-5 flex items-start gap-3 rounded-xl border border-[#f4d4cc] bg-[#fff8f6] p-4 text-sm"><Activity size={17} className="mt-0.5 shrink-0 text-coral" /><p className="leading-6 text-[#7d4d40]">At this pace, the safety buffer is crossed in <strong>{Math.max(1, Math.floor(result.daysCover))} days</strong>. {t(language, "simulatedRecommendation")}</p></div></div><FacilityNetwork destination={getFacility(item.facilityId)} donors={donors} selectedDonor={selectedDonor} language={language} />
      <div className="rounded-2xl border border-[#dce7e3] bg-white shadow-card"><div className="border-b border-[#e5eeeb] px-5 py-4"><div className="flex items-center justify-between"><div><h2 className="font-bold">{t(language, "donorFacilities")}</h2><p className="mt-1 text-xs text-muted">{t(language, "donorSubtitle")}</p></div><Truck size={18} className="text-teal" /></div></div><div className="divide-y divide-[#edf2f0]">{donors.length === 0 && <p className="p-5 text-sm text-muted">{t(language, "noDonors")}</p>}{donors.map((option) => <div key={option.donor.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="text-sm font-bold">{option.donor.shortName}</p><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", option.status === "recommended" ? "bg-[#e8f7f1] text-teal" : option.status === "review" ? "bg-[#fff7df] text-amber" : "bg-[#f1f3f3] text-muted")}>{donorStatusLabel(language, option.status)}</span></div><p className="mt-1 text-xs text-muted">{option.distanceKm} km away <span className="mx-1">•</span> {option.rationale}</p>{selectedDonorId === option.stock.id && <p className="mt-1 text-xs font-medium text-teal">{t(language, "afterBuffer")} {Math.max(0, option.availableAfterBuffer - option.safeTransfer)} {option.stock.unit} {t(language, "aboveBuffer")}</p>}</div><div className="flex items-center gap-4"><div className="text-right"><p className="text-sm font-bold">{option.safeTransfer} {option.stock.unit}</p><p className="text-[11px] text-muted">{t(language, "safeTransfer")}</p></div>{option.status !== "not-eligible" && <button onClick={() => setSelectedDonorId(option.stock.id)} className={cn("rounded-lg border px-3 py-2 text-xs font-bold", selectedDonorId === option.stock.id ? "border-teal bg-[#e8f7f1] text-teal" : "border-teal text-teal hover:bg-[#e8f7f1]")}>{selectedDonorId === option.stock.id ? <Check size={14} className="inline" /> : t(language, "select")}</button>}</div></div>)}</div></div>
      {selectedDonor && <div className="rounded-2xl border border-teal bg-[#e8f7f1] p-5"><div className="flex items-center gap-2 text-teal"><Sparkles size={17} /><h2 className="font-bold">{t(language, "compare")}</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{t(language, "before")}</p><p className="mt-2 text-xl font-bold">{formatDays(result.daysCover)}</p><p className="text-xs text-muted">{result.gap} {item.unit} gap • <RiskPill risk={result.risk} language={language} /></p></div><div className="rounded-xl bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{t(language, "after")}</p><p className="mt-2 text-xl font-bold">{formatDays(afterRisk.daysCover)}</p><p className="text-xs text-muted">{afterRisk.gap} {item.unit} gap • <RiskPill risk={afterRisk.risk} language={language} /></p></div></div><button disabled={approved || alreadyApproved} onClick={() => { onApprove({ sourceId: selectedDonor.stock.id, destinationId: item.id, quantity: selectedDonor.safeTransfer, medicine: item.medicine }); setApproved(true); }} className="mt-4 flex items-center gap-2 rounded-xl bg-teal px-4 py-3 text-sm font-bold text-white hover:bg-[#0c655e] disabled:cursor-not-allowed disabled:opacity-60"><Check size={16} /> {approved || alreadyApproved ? t(language, "approved") : t(language, "approve")}</button></div>}</div>
    </div></div>;
}

function Reports({ language }: { language: Language }) {
  const [report, setReport] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ReportExtraction | null>(null);
  const [reviewed, setReviewed] = useState<ReportExtraction | null>(null);
  const sampleReport = "North Star Medical Center has 86 Vancomycin 500mg IV vials remaining. ICU demand is up and the next delivery is not confirmed. Please review a transfer option.";
  async function submit() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ report, language }) });
      const data = (await response.json()) as { message?: string; error?: string; extracted?: ReportExtraction };
      if (!response.ok) throw new Error(data.error ?? "Report could not be processed.");
      setMessage(data.message ?? t(language, "reportReady"));
      setExtracted(data.extracted ?? null);
      setReviewed(data.extracted ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Report could not be processed.");
    } finally {
      setLoading(false);
    }
  }
  return <div className="min-h-full bg-canvas p-5 md:p-8"><div className="mb-6"><p className="text-sm font-bold text-teal">{t(language, "reports")}</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{t(language, "reportTitle")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{t(language, "reportDescription")}</p></div><div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><div className="rounded-2xl border border-[#dce7e3] bg-white p-5 shadow-card"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><FileText size={18} className="text-teal" /><h2 className="font-bold">{t(language, "newFieldReport")}</h2></div><button onClick={() => setReport(sampleReport)} className="rounded-lg border border-[#cbdcd7] px-3 py-2 text-xs font-bold text-teal hover:bg-[#e8f7f1]">{t(language, "loadSample")}</button></div><textarea value={report} onChange={(event) => setReport(event.target.value)} placeholder="Example: North Star is down to 86 vancomycin vials..." className="mt-5 min-h-[230px] w-full resize-y rounded-xl border border-[#dce7e3] p-4 text-sm leading-6 outline-none placeholder:text-[#9aa9a7]" /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">{t(language, "demoPrivacy")}</p><button onClick={submit} disabled={!report.trim() || loading} className="flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{loading ? t(language, "loading") : t(language, "extract")}</button></div>{message && <div className={cn("mt-4 rounded-xl p-3 text-sm", message.includes("could not") || message.includes("unavailable") ? "bg-[#fff0ed] text-coral" : "bg-[#e8f7f1] text-teal")}>{message}</div>}{reviewed && <div className="mt-4 rounded-xl border border-[#dce7e3] bg-[#fbfdfc] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-teal">{t(language, "reviewRequired")}</p><p className="mt-1 text-xs text-muted">{t(language, "modelNotFact")}</p></div><span className="rounded-full bg-[#fff7df] px-2 py-1 text-[10px] font-bold uppercase text-amber">{reviewed.confidence} confidence</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-[11px] font-bold uppercase text-muted">Facility<select value={reviewed.facilityId ?? ""} onChange={(event) => setReviewed({ ...reviewed, facilityId: event.target.value || null })} className="mt-1 w-full rounded-lg border border-[#dce7e3] bg-white p-2 text-sm font-medium"><option value="">Needs review</option>{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}</select></label><label className="text-[11px] font-bold uppercase text-muted">Medicine<select value={reviewed.medicineId ?? ""} onChange={(event) => setReviewed({ ...reviewed, medicineId: event.target.value || null })} className="mt-1 w-full rounded-lg border border-[#dce7e3] bg-white p-2 text-sm font-medium"><option value="">Needs review</option>{stock.filter((entry) => !reviewed.facilityId || entry.facilityId === reviewed.facilityId).map((entry) => <option key={entry.id} value={entry.id}>{entry.medicine}</option>)}</select></label><label className="text-[11px] font-bold uppercase text-muted">Quantity<input type="number" min="0" step="1" value={reviewed.quantity ?? ""} onChange={(event) => setReviewed({ ...reviewed, quantity: event.target.value ? Number(event.target.value) : null })} className="mt-1 w-full rounded-lg border border-[#dce7e3] bg-white p-2 text-sm font-medium" /></label><label className="text-[11px] font-bold uppercase text-muted">Urgency<select value={reviewed.urgency} onChange={(event) => setReviewed({ ...reviewed, urgency: event.target.value as ReportExtraction["urgency"] })} className="mt-1 w-full rounded-lg border border-[#dce7e3] bg-white p-2 text-sm font-medium"><option value="critical">Critical</option><option value="watch">Watch</option><option value="stable">Stable</option><option value="needs-review">Needs review</option></select></label></div><p className="mt-3 text-sm text-muted">{reviewed.summary}</p><button disabled={!reviewed.facilityId || !reviewed.medicineId} onClick={() => window.dispatchEvent(new CustomEvent("sanket:open-rehearsal", { detail: reviewed }))} className="mt-4 rounded-xl bg-teal px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{t(language, "openReviewed")}</button></div>}</div><div className="rounded-2xl border border-[#dce7e3] bg-[#102b2d] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9bc2ba]">Human in the loop</p><div className="mt-6 space-y-5">{["Paste the unstructured note", "Review and correct extracted fields", "Open a rehearsal with traceable assumptions"].map((step, index) => <div key={step} className="flex gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2d6361] text-xs font-bold text-[#d5f4e8]">{index + 1}</div><p className="text-sm leading-6 text-[#d4e5e0]">{step}</p></div>)}</div></div></div></div>;
}

function Audit({ events, language }: { events: AuditEvent[]; language: Language }) {
  const [query, setQuery] = useState("");
  const filtered = events.filter((event) => `${event.action} ${event.detail} ${event.actor}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="min-h-full bg-canvas p-5 md:p-8"><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold text-teal">{t(language, "audit")}</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{t(language, "historyTitle")}</h1><p className="mt-2 text-sm text-muted">{t(language, "historyDescription")}</p></div><div className="relative"><Search className="absolute left-3 top-3 text-muted" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t(language, "searchHistory")} className="rounded-xl border border-[#cbdcd7] bg-white py-2.5 pl-9 pr-3 text-sm outline-none" /></div></div><div className="rounded-2xl border border-[#dce7e3] bg-white shadow-card"><div className="divide-y divide-[#edf2f0]">{filtered.map((event) => <div key={event.id} className="flex gap-4 px-5 py-5"><div className={cn("mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", event.tone === "coral" ? "bg-[#fff0ed] text-coral" : event.tone === "amber" ? "bg-[#fff7df] text-amber" : "bg-[#e8f7f1] text-teal")}><ClipboardCheck size={17} /></div><div className="flex-1"><div className="flex flex-col justify-between gap-1 sm:flex-row"><p className="text-sm font-bold">{auditAction(language, event.action)}</p><p className="text-xs text-muted">{event.timestamp}</p></div><p className="mt-1 text-sm text-muted">{auditDetail(language, event)}</p><p className="mt-2 text-xs font-medium text-[#8a9996]">{t(language, "by")} {event.actor}</p></div></div>)}</div>{filtered.length === 0 && <p className="p-8 text-center text-sm text-muted">{t(language, "noMatchingDecisions")}</p>}</div></div>;
}

export default function AppShell() {
  const [view, setView] = useState<View>("overview");
  const [language, setLanguage] = useState<Language>("en");
  const [mobileNav, setMobileNav] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [inventory, setInventory] = useState<MedicineStock[]>(stock);
  const [events, setEvents] = useState<AuditEvent[]>(auditEvents);
  const [rehearsalSeed, setRehearsalSeed] = useState<{ facilityId?: string; medicineId?: string }>({});
  const [approvedTransfers, setApprovedTransfers] = useState<string[]>([]);

  useEffect(() => {
    const handleOpenRehearsal = (event: Event) => {
      const detail = (event as CustomEvent<ReportExtraction>).detail;
      setRehearsalSeed({ facilityId: detail.facilityId ?? undefined, medicineId: detail.medicineId ?? undefined });
      setView("rehearsal");
    };
    window.addEventListener("sanket:open-rehearsal", handleOpenRehearsal);
    return () => window.removeEventListener("sanket:open-rehearsal", handleOpenRehearsal);
  }, []);

  function approveTransfer(decision: TransferDecision) {
    const approvalKey = `${decision.sourceId}:${decision.destinationId}`;
    if (approvedTransfers.includes(approvalKey)) return;
    const destination = inventory.find((item) => item.id === decision.destinationId);
    const destinationFacility = destination ? getFacility(destination.facilityId).shortName : "destination facility";
    setInventory((current) => applyTransfer(current, decision));
    setApprovedTransfers((current) => [...current, approvalKey]);
    setEvents((events) => [{ id: `transfer-${Date.now()}`, timestamp: "Just now", actor: "Asha Menon", action: "Transfer approved", detail: `${decision.quantity} ${decision.medicine} moved into ${destinationFacility}`, tone: "amber" }, ...events]);
  }

  return <div className="flex min-h-screen bg-canvas"><Sidebar activeView={view} language={language} open={mobileNav} setView={setView} close={() => setMobileNav(false)} /><div className="flex min-w-0 flex-1 flex-col"><Header activeView={view} language={language} onMenu={() => setMobileNav(true)} onLanguage={() => setLanguage((current) => current === "en" ? "hi" : "en")} onNotifications={() => setNotifications((current) => !current)} />{notifications && <div className="absolute right-5 top-[76px] z-10 w-72 rounded-2xl border border-[#dce7e3] bg-white p-4 shadow-card"><div className="flex items-center justify-between"><p className="text-sm font-bold">Notifications</p><button onClick={() => setNotifications(false)} aria-label="Close notifications"><X size={15} /></button></div><p className="mt-3 text-xs leading-5 text-muted">Synthetic demo alert: North Star vancomycin is the highest-priority rehearsal.</p></div>}<main className="min-h-0 flex-1">{view === "overview" && <Overview inventory={inventory} language={language} setView={setView} />}{view === "rehearsal" && <Rehearsal key={`${rehearsalSeed.facilityId ?? "north-star"}-${rehearsalSeed.medicineId ?? "n-vancomycin"}`} inventory={inventory} language={language} initialFacilityId={rehearsalSeed.facilityId} initialMedicineId={rehearsalSeed.medicineId} approvedTransfers={approvedTransfers} onApprove={approveTransfer} onReset={() => setRehearsalSeed({})} />}{view === "reports" && <Reports language={language} />}{view === "audit" && <Audit events={events} language={language} />}</main></div></div>;
}
