import { ArrowRight, CircleAlert, MapPin } from "lucide-react";
import { facilities, type Facility, type TransferOption } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { translate, type Language } from "@/lib/i18n";

const positions: Record<string, { x: number; y: number }> = {
  "north-star": { x: 18, y: 42 },
  riverbend: { x: 52, y: 18 },
  "green-valley": { x: 82, y: 40 },
  "harbor-view": { x: 54, y: 78 }
};

export default function FacilityNetwork({
  destination,
  donors,
  selectedDonor,
  language
}: {
  destination: Facility;
  donors: TransferOption[];
  selectedDonor: TransferOption | null;
  language: "en" | "hi";
}) {
  const donorIds = new Set(donors.filter((option) => option.status !== "not-eligible").map((option) => option.donor.id));
  const destinationPosition = positions[destination.id];
  return (
    <div className="rounded-2xl border border-[#dce7e3] bg-[#f7fbf9] p-4" aria-label={translate(language, "facilityNetwork")}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{translate(language, "facilityNetwork")}</p>
          <p className="mt-1 text-xs text-muted">{translate(language, "networkSubtitle")}</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wide text-muted">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-coral" /> {translate(language, "riskLegend")}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal" /> {translate(language, "donorLegend")}</span>
        </div>
      </div>
      <div className="relative aspect-[1.7] min-h-[220px] overflow-hidden rounded-xl border border-[#dce7e3] bg-white">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" role="img" aria-label="Facility network diagram">
          <defs>
            <pattern id="network-grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#e4efeb" strokeWidth="0.35" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#network-grid)" />
          {facilities.filter((facility) => donorIds.has(facility.id)).map((facility) => {
            const position = positions[facility.id];
            const selected = selectedDonor?.donor.id === facility.id;
            return <line key={`line-${facility.id}`} x1={position.x} y1={position.y} x2={destinationPosition.x} y2={destinationPosition.y} stroke={selected ? "#0f766e" : "#b9d9cf"} strokeWidth={selected ? "1.7" : "0.8"} strokeDasharray={selected ? undefined : "2 2"} />;
          })}
          {facilities.map((facility) => {
            const position = positions[facility.id];
            const isDestination = facility.id === destination.id;
            const isDonor = donorIds.has(facility.id);
            const isSelected = selectedDonor?.donor.id === facility.id;
            return <g key={facility.id} role="img" aria-label={`${facility.name}${isDestination ? ` (${translate(language, "facility")})` : isDonor ? ` (${translate(language, "donorLegend")})` : ""}`}>
              <circle cx={position.x} cy={position.y} r={isDestination || isSelected ? 6.5 : 5} fill={isDestination ? "#e86f51" : isSelected ? "#0f766e" : isDonor ? "#9de2c9" : "#d8e7e2"} stroke={isDestination || isSelected ? "#ffffff" : "#9dbdb5"} strokeWidth="1.5" />
              <circle cx={position.x} cy={position.y} r="2" fill={isDestination || isSelected ? "#ffffff" : "#3b6862"} />
              {isDestination && <circle cx={position.x} cy={position.y} r="9" fill="none" stroke="#e86f51" strokeOpacity="0.25" strokeWidth="1.2" />}
              <foreignObject x={position.x - 12} y={position.y + 7} width="24" height="12">
                <div className={cn("text-center text-[4.2px] font-bold", isDestination ? "text-coral" : "text-ink")}>{facility.shortName}</div>
              </foreignObject>
            </g>;
          })}
        </svg>
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-white/90 px-2.5 py-2 text-[11px] font-medium text-muted shadow-sm backdrop-blur">
          {selectedDonor ? <><ArrowRight size={13} className="text-teal" /> {selectedDonor.safeTransfer} {selectedDonor.stock.unit} {translate(language, "proposed")}</> : <><CircleAlert size={13} className="text-coral" /> {translate(language, "selectDonor")}</>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted"><MapPin size={13} /> {translate(language, "eligiblePaths", { count: donors.filter((option) => option.status !== "not-eligible").length })} <span className="text-[#c1cfca]">•</span> {translate(language, "noDecorativeConnections")}</div>
    </div>
  );
}
