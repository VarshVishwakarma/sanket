"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  Boxes,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Menu,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  X
} from "lucide-react";
import { auditEvents, calculateRisk, compareScenario, facilities, getFacility, scenarios, selectEligibleDonors, stock, type RiskLevel } from "@/lib/domain";
import { cn, formatDays } from "@/lib/utils";

type View = "overview" | "rehearsal" | "reports" | "audit";

const navItems: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Operations overview", icon: LayoutDashboard },
  { id: "rehearsal", label: "Response rehearsal", icon: FlaskConical },
  { id: "reports", label: "Report intake", icon: FileText },
  { id: "audit", label: "Decision history", icon: ClipboardCheck }
];

const riskStyles: Record<RiskLevel, string> = {
  critical: "bg-[#fff0ed] text-[#c65439]",
  watch: "bg-[#fff7df] text-[#a26c00]",
  stable: "bg-[#e8f7f1] text-[#0b756a]"
};

function RiskPill({ risk }: { risk: RiskLevel }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]", riskStyles[risk])}>{risk}</span>;
}

function Header({ activeView, onMenu }: { activeView: View; onMenu: () => void }) {
  const title = navItems.find((item) => item.id === activeView)?.label ?? "Operations overview";
  return (
    <header className="flex items-center justify-between border-b border-[#dce7e3] bg-white px-5 py-4 md:px-8">
      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 hover:bg-canvas md:hidden" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal">Sanket / {title}</p>
          <p className="mt-1 text-sm text-muted">Tuesday, 18 June 2024 <span className="mx-1 text-[#c0ceca]">•</span> Network command center</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative rounded-xl border border-[#dce7e3] p-2.5 text-muted hover:bg-canvas" aria-label="Notifications"><Bell size={18} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-coral" /></button>
        <div className="hidden items-center gap-2 border-l border-[#dce7e3] pl-3 sm:flex"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">AM</div><div><p className="text-xs font-bold">Asha Menon</p><p className="text-[11px] text-muted">Network lead</p></div><ChevronDown size={14} className="text-muted" /></div>
      </div>
    </header>
  );
}

function Sidebar({ activeView, setView, open, close }: { activeView: View; setView: (view: View) => void; open: boolean; close: () => void }) {
  return <aside className={cn("fixed inset-y-0 left-0 z-20 flex w-[272px] -translate-x-full flex-col border-r border-[#dce7e3] bg-[#102b2d] px-5 py-6 text-white transition-transform md:static md:translate-x-0", open && "translate-x-0")}>
    <div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c7f0df] text-ink"><Activity size={20} strokeWidth={2.5} /></div><div><p className="text-lg font-bold tracking-tight">sanket</p><p className="text-[10px] uppercase tracking-[0.18em] text-[#9bc2ba]">care in motion</p></div></div><button className="rounded-lg p-1 text-[#9bc2ba] md:hidden" onClick={close} aria-label="Close navigation"><X size={18} /></button></div>
    <div className="mt-12"><p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7fa9a2]">Workspace</p>{navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setView(id); close(); }} className={cn("mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition", activeView === id ? "bg-[#1b4c4d] font-bold text-white" : "text-[#acc8c3] hover:bg-[#173b3d] hover:text-white")}><Icon size={17} />{label}{id === "rehearsal" && <span className="ml-auto rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold text-white">3</span>}</button>)}</div>
    <div className="mt-auto rounded-2xl border border-[#2a5657] bg-[#173b3d] p-4"><div className="mb-3 flex items-center gap-2 text-[#bdebdc]"><ShieldCheck size={17} /><span className="text-xs font-bold">Network posture</span></div><p className="text-2xl font-bold">Good</p><p className="mt-1 text-xs leading-5 text-[#9bc2ba]">All facilities synced within the last hour.</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#2a5657]"><div className="h-full w-[92%] rounded-full bg-[#9de2c9]" /></div></div>
    <p className="mt-6 px-1 text-[10px] text-[#6e9792]">Sanket v0.4.2 • Demo environment</p>
  </aside>;
}

function Overview({ setView }: { setView: (view: View) => void }) {
  const risks = stock.map((item) => calculateRisk(item)).sort((a, b) => ({ critical: 0, watch: 1, stable: 2 }[a.risk] - { critical: 0, watch: 1, stable: 2 }[b.risk]));
  const critical = risks.filter((item) => item.risk === "critical");
  const watch = risks.filter((item) => item.risk === "watch");
  return <div className="grid-paper min-h-full space-y-6 p-5 md:p-8">
    <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-sm font-bold text-teal">Good morning, Asha</p><h1 className="mt-2 max-w-xl text-3xl font-bold tracking-tight text-ink md:text-4xl">See risk early.<br /><span className="text-teal">Move with confidence.</span></h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">A live view of medicine resilience across your care network, with the next best action already in reach.</p></div><button onClick={() => setView("rehearsal")} className="flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white shadow-card transition hover:-translate-y-0.5"><FlaskConical size={17} /> Open response rehearsal <ArrowRight size={16} /></button></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: "Critical shortages", value: critical.length, note: "Needs action today", color: "coral", icon: Activity },
      { label: "Under watch", value: watch.length, note: "Within 7 days", color: "amber", icon: Bell },
      { label: "Facilities synced", value: "4 / 4", note: "Last sync 12 min ago", color: "teal", icon: ShieldCheck },
      { label: "Safe stock value", value: "₹18.4L", note: "Across 10 medicines", color: "ink", icon: Boxes }
    ].map(({ label, value, note, color, icon: Icon }) => <div key={label} className="rounded-2xl border border-[#dce7e3] bg-white p-5 shadow-card"><div className="flex items-start justify-between"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p><Icon size={18} className={color === "coral" ? "text-coral" : color === "amber" ? "text-amber" : color === "teal" ? "text-teal" : "text-ink"} /></div><p className="mt-5 text-3xl font-bold tracking-tight text-ink">{value}</p><p className="mt-1 text-xs text-muted">{note}</p></div>)}</section>
    <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><div className="rounded-2xl border border-[#dce7e3] bg-white shadow-card"><div className="flex items-center justify-between border-b border-[#e5eeeb] px-5 py-4"><div><h2 className="font-bold text-ink">Medicine resilience</h2><p className="mt-1 text-xs text-muted">Projected coverage at current demand</p></div><button onClick={() => setView("rehearsal")} className="text-xs font-bold text-teal hover:underline">Rehearse response <ArrowRight size={13} className="ml-1 inline" /></button></div><div className="divide-y divide-[#edf2f0]">{risks.slice(0, 6).map((item) => <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", item.risk === "critical" ? "bg-[#fff0ed] text-coral" : item.risk === "watch" ? "bg-[#fff7df] text-amber" : "bg-[#e8f7f1] text-teal")}><PackageCheck size={17} /></div><div className="min-w-0"><p className="truncate text-sm font-bold">{item.medicine}</p><p className="text-xs text-muted">{getFacility(item.facilityId).shortName} <span className="mx-1">•</span> {item.form}</p></div></div><div className="flex items-center gap-5 sm:pl-4"><div><p className="text-sm font-bold">{formatDays(item.daysCover)}</p><p className="text-[11px] text-muted">coverage</p></div><RiskPill risk={item.risk} /></div></div>)}</div></div><div className="rounded-2xl border border-[#dce7e3] bg-[#e8f7f1] p-6"><div className="flex items-center gap-2 text-teal"><Sparkles size={17} /><p className="text-xs font-bold uppercase tracking-[0.16em]">Next best action</p></div><h2 className="mt-5 text-xl font-bold leading-7 text-ink">Protect North Star&apos;s vancomycin cover.</h2><p className="mt-3 text-sm leading-6 text-[#4d716d]">At current use, the buffer falls below safety threshold in <strong>3 days</strong>. Riverbend can safely release 120 vials without breaching its own buffer.</p><button onClick={() => setView("rehearsal")} className="mt-6 flex items-center gap-2 rounded-xl bg-teal px-4 py-3 text-sm font-bold text-white hover:bg-[#0c655e]">Run this rehearsal <ArrowRight size={15} /></button></div></section>
    <section className="rounded-2xl border border-[#dce7e3] bg-white p-5 shadow-card"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Facility readiness</h2><p className="mt-1 text-xs text-muted">Occupancy and open alerts by site</p></div><button className="text-xs font-bold text-teal hover:underline">View network <ArrowRight size={13} className="ml-1 inline" /></button></div><div className="grid gap-3 md:grid-cols-4">{facilities.map((facility) => <div key={facility.id} className="rounded-xl border border-[#e5eeeb] p-4"><div className="flex items-start justify-between gap-2"><p className="text-sm font-bold">{facility.shortName}</p><span className={cn("h-2.5 w-2.5 rounded-full", facility.id === "north-star" ? "bg-coral" : "bg-teal")} /></div><p className="mt-1 text-xs text-muted">{facility.region}</p><div className="mt-4 flex items-end justify-between"><div><p className="text-lg font-bold">{Math.round(facility.occupancy * 100)}%</p><p className="text-[11px] text-muted">occupancy</p></div><p className="text-xs text-muted">{risks.filter((item) => item.facilityId === facility.id && item.risk !== "stable").length} alerts</p></div><div className="mt-3 h-1.5 rounded-full bg-[#edf2f0]"><div className={cn("h-full rounded-full", facility.id === "north-star" ? "bg-coral" : "bg-teal")} style={{ width: `${facility.occupancy * 100}%` }} /></div></div>)}</div></section>
  </div>;
}

function Rehearsal() {
  const [facilityId, setFacilityId] = useState("north-star");
  const [medicineId, setMedicineId] = useState("n-vancomycin");
  const [scenarioId, setScenarioId] = useState("baseline");
  const [approved, setApproved] = useState(false);
  const item = stock.find((entry) => entry.id === medicineId) ?? stock[0];
  const facilityStock = stock.filter((entry) => entry.facilityId === facilityId);
  const selectedScenario = scenarios.find((scenario) => scenario.id === scenarioId) ?? scenarios[0];
  const result = compareScenario(item, selectedScenario);
  const donors = useMemo(() => selectEligibleDonors(result, selectedScenario.demandMultiplier), [result, selectedScenario]);
  return <div className="min-h-full bg-canvas p-5 md:p-8"><div className="mb-6"><p className="text-sm font-bold text-teal">Response rehearsal</p><h1 className="mt-2 text-3xl font-bold tracking-tight">What if this shortage gets worse?</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Use deterministic projections to compare scenarios, identify safe donors, and create a defensible transfer decision.</p></div><div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><div className="space-y-4"><div className="rounded-2xl border border-[#dce7e3] bg-white p-5 shadow-card"><div className="mb-5 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f7f1] text-teal"><FlaskConical size={16} /></div><div><h2 className="font-bold">Set the situation</h2><p className="text-xs text-muted">Choose an incident to rehearse</p></div></div><label className="mb-4 block text-xs font-bold text-muted">At-risk facility<select value={facilityId} onChange={(event) => { setFacilityId(event.target.value); const next = stock.find((entry) => entry.facilityId === event.target.value); if (next) setMedicineId(next.id); }} className="mt-2 w-full rounded-xl border border-[#dce7e3] bg-white px-3 py-3 text-sm font-medium"><option value="north-star">North Star Medical Center</option><option value="riverbend">Riverbend Community Hospital</option><option value="green-valley">Green Valley Clinic</option><option value="harbor-view">Harbor View Hospital</option></select></label><label className="mb-4 block text-xs font-bold text-muted">Medicine<select value={medicineId} onChange={(event) => setMedicineId(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dce7e3] bg-white px-3 py-3 text-sm font-medium">{facilityStock.map((entry) => <option key={entry.id} value={entry.id}>{entry.medicine} — {entry.onHand} {entry.unit}</option>)}</select></label><label className="block text-xs font-bold text-muted">Scenario<select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dce7e3] bg-white px-3 py-3 text-sm font-medium">{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.label} — {scenario.description}</option>)}</select></label></div><div className="rounded-2xl border border-[#dce7e3] bg-[#102b2d] p-5 text-white"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9bc2ba]">Decision record</p><p className="mt-3 text-sm leading-6 text-[#d4e5e0]">Every rehearsal keeps the assumptions visible: demand, buffers, inbound stock, and the action selected.</p><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-[#173b3d] p-3"><p className="text-[#9bc2ba]">Horizon</p><p className="mt-1 font-bold">{selectedScenario.horizonDays} days</p></div><div className="rounded-xl bg-[#173b3d] p-3"><p className="text-[#9bc2ba]">Demand factor</p><p className="mt-1 font-bold">{selectedScenario.demandMultiplier}×</p></div></div></div></div><div className="space-y-4"><div className="rounded-2xl border border-[#dce7e3] bg-white p-5 shadow-card"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Projection result</p><h2 className="mt-2 text-xl font-bold">{getFacility(item.facilityId).shortName} needs {item.medicine}</h2><p className="mt-1 text-sm text-muted">{selectedScenario.description} over the next {selectedScenario.horizonDays} days</p></div><RiskPill risk={result.risk} /></div><div className="mt-6 grid grid-cols-3 gap-3"><div className="rounded-xl bg-canvas p-4"><p className="text-2xl font-bold">{formatDays(result.daysCover)}</p><p className="mt-1 text-xs text-muted">projected cover</p></div><div className="rounded-xl bg-canvas p-4"><p className="text-2xl font-bold">{result.gap}</p><p className="mt-1 text-xs text-muted">{item.unit} gap</p></div><div className="rounded-xl bg-canvas p-4"><p className="text-2xl font-bold">{item.dailyUse}</p><p className="mt-1 text-xs text-muted">daily use</p></div></div><div className="mt-5 flex items-start gap-3 rounded-xl border border-[#f4d4cc] bg-[#fff8f6] p-4 text-sm"><Activity size={17} className="mt-0.5 shrink-0 text-coral" /><p className="leading-6 text-[#7d4d40]">At this pace, the safety buffer is crossed in <strong>{Math.max(1, Math.floor(result.daysCover))} days</strong>. A transfer now prevents a service-level incident.</p></div></div><div className="rounded-2xl border border-[#dce7e3] bg-white shadow-card"><div className="border-b border-[#e5eeeb] px-5 py-4"><div className="flex items-center justify-between"><div><h2 className="font-bold">Eligible donor facilities</h2><p className="mt-1 text-xs text-muted">Safe transfer is capped after each donor&apos;s safety buffer</p></div><Truck size={18} className="text-teal" /></div></div><div className="divide-y divide-[#edf2f0]">{donors.map((option) => <div key={option.donor.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="text-sm font-bold">{option.donor.shortName}</p><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", option.status === "recommended" ? "bg-[#e8f7f1] text-teal" : option.status === "review" ? "bg-[#fff7df] text-amber" : "bg-[#f1f3f3] text-muted")}>{option.status}</span></div><p className="mt-1 text-xs text-muted">{option.distanceKm} km away <span className="mx-1">•</span> {option.rationale}</p></div><div className="flex items-center gap-4"><div className="text-right"><p className="text-sm font-bold">{option.safeTransfer} {option.stock.unit}</p><p className="text-[11px] text-muted">safe transfer</p></div>{option.status !== "not-eligible" && <button onClick={() => setApproved(true)} className="rounded-lg border border-teal px-3 py-2 text-xs font-bold text-teal hover:bg-[#e8f7f1]">Select</button>}</div></div>)}</div>{approved && <div className="flex items-center gap-2 border-t border-[#bdebdc] bg-[#e8f7f1] px-5 py-3 text-sm font-medium text-teal"><Check size={16} /> Transfer recommendation saved to decision history.</div>}</div></div></div></div>;
}

function Reports() {
  const [report, setReport] = useState("");
  const [message, setMessage] = useState("");
  async function submit() {
    const response = await fetch("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ report }) });
    const data = (await response.json()) as { message?: string; error?: string };
    setMessage(data.message ?? data.error ?? "Report processed.");
  }
  return <div className="min-h-full bg-canvas p-5 md:p-8"><div className="mb-6"><p className="text-sm font-bold text-teal">Report intake</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Turn field notes into a decision.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Paste a WhatsApp note, incident report, or call summary. Sanket keeps the API key server-side and prepares structured fields for review.</p></div><div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><div className="rounded-2xl border border-[#dce7e3] bg-white p-5 shadow-card"><div className="flex items-center gap-2"><FileText size={18} className="text-teal" /><h2 className="font-bold">New field report</h2></div><textarea value={report} onChange={(event) => setReport(event.target.value)} placeholder="Example: North Star is down to 86 vancomycin vials. ICU usage is up and our next delivery is not confirmed..." className="mt-5 min-h-[230px] w-full resize-y rounded-xl border border-[#dce7e3] p-4 text-sm leading-6 outline-none placeholder:text-[#9aa9a7]" /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">No patient-identifying information is required.</p><button onClick={submit} disabled={!report.trim()} className="flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Sparkles size={16} /> Extract report</button></div>{message && <div className="mt-4 rounded-xl bg-[#e8f7f1] p-3 text-sm text-teal">{message}</div>}</div><div className="rounded-2xl border border-[#dce7e3] bg-[#102b2d] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9bc2ba]">How it works</p><div className="mt-6 space-y-5">{["Paste the unstructured note", "Review extracted facility, medicine, and urgency", "Open a rehearsal with traceable assumptions"].map((step, index) => <div key={step} className="flex gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2d6361] text-xs font-bold text-[#d5f4e8]">{index + 1}</div><div><p className="text-sm font-bold">{step}</p><p className="mt-1 text-xs leading-5 text-[#9bc2ba]">{index === 0 ? "Gemini-assisted extraction is optional and never exposes your key in the browser." : index === 1 ? "A human stays in the loop before any operational action is created." : "Compare donors, document the choice, and share a safe transfer plan."}</p></div></div>)}</div></div></div></div>;
}

function Audit() {
  return <div className="min-h-full bg-canvas p-5 md:p-8"><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold text-teal">Decision history</p><h1 className="mt-2 text-3xl font-bold tracking-tight">A clear trail for every move.</h1><p className="mt-2 text-sm text-muted">Rehearsals, syncs, and approvals in one human-readable timeline.</p></div><button className="flex items-center justify-center gap-2 rounded-xl border border-[#cbdcd7] bg-white px-4 py-3 text-sm font-bold text-ink"><Search size={16} /> Search history</button></div><div className="rounded-2xl border border-[#dce7e3] bg-white shadow-card"><div className="divide-y divide-[#edf2f0]">{auditEvents.map((event) => <div key={event.id} className="flex gap-4 px-5 py-5"><div className={cn("mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", event.tone === "coral" ? "bg-[#fff0ed] text-coral" : event.tone === "amber" ? "bg-[#fff7df] text-amber" : "bg-[#e8f7f1] text-teal")}>{event.action.includes("Transfer") ? <Truck size={17} /> : event.action.includes("Risk") ? <Activity size={17} /> : event.action.includes("Stock") ? <PackageCheck size={17} /> : <ClipboardCheck size={17} />}</div><div className="flex-1"><div className="flex flex-col justify-between gap-1 sm:flex-row"><p className="text-sm font-bold">{event.action}</p><p className="text-xs text-muted">{event.timestamp}</p></div><p className="mt-1 text-sm text-muted">{event.detail}</p><p className="mt-2 text-xs font-medium text-[#8a9996]">By {event.actor}</p></div></div>)}</div></div></div>;
}

export default function AppShell() {
  const [view, setView] = useState<View>("overview");
  const [mobileNav, setMobileNav] = useState(false);
  return <div className="flex min-h-screen bg-canvas"><Sidebar activeView={view} setView={setView} open={mobileNav} close={() => setMobileNav(false)} /><div className="flex min-w-0 flex-1 flex-col"><Header activeView={view} onMenu={() => setMobileNav(true)} /><main className="min-h-0 flex-1">{view === "overview" && <Overview setView={setView} />}{view === "rehearsal" && <Rehearsal />}{view === "reports" && <Reports />}{view === "audit" && <Audit />}</main></div></div>;
}
