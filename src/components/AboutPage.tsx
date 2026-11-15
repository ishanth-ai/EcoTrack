import { ArrowRight, Camera, Cpu, Globe2, MapPinned, ShieldAlert, UserCheck } from "lucide-react";

const WORKFLOW_STEPS = [
  "OBSERVE",
  "REPORT",
  "AI ANALYSIS",
  "MAP",
  "IDENTIFY HOTSPOTS",
  "VERIFY",
  "CLEANUP",
  "MONITOR",
];

export function AboutPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="border-b border-[#1F3329] pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          About PlasticWatch
        </h1>
        <p className="mt-1 text-sm text-[#9FB0A6]">
          Student Project Prototype · AJ Institute of Engineering &amp; Technology (AJIET), Mangalore, Karnataka, India
        </p>
      </div>

      {/* Project Summary */}
      <section className="rounded-xl border border-[#1F3329] bg-[#111B16] p-6 space-y-3">
        <h2 className="text-lg font-semibold text-white">Project Summary</h2>
        <p className="text-sm text-[#CBD5E1] leading-relaxed">
          PlasticWatch is an AI and GIS-based plastic waste monitoring platform. Citizens submit photographs and locations of plastic waste. Gemini AI analyses the visible waste in photographs. GIS maps the reports and groups nearby reports into potential hotspots. Administrators verify reports and organise cleanup activities. The platform helps communities understand where action may be needed.
        </p>
      </section>

      {/* Visual Workflow */}
      <section className="rounded-xl border border-[#1F3329] bg-[#111B16] p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">End-to-End Monitoring Workflow</h2>
        <div className="flex flex-wrap items-center gap-2">
          {WORKFLOW_STEPS.map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <div className="rounded-lg border border-[#264034] bg-[#0E1713] px-3 py-2 text-xs font-mono font-semibold text-emerald-300 whitespace-nowrap">
                {idx + 1}. {step}
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <ArrowRight className="w-4 h-4 text-[#6E8277] shrink-0" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 4 System Roles */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#1F3329] bg-[#111B16] p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <Cpu className="w-4 h-4" />
            <h3 className="text-base font-semibold text-white">Artificial Intelligence</h3>
          </div>
          <p className="text-sm text-[#9FB0A6] leading-relaxed">
            Uses server-side Gemini multimodal vision to screen uploaded photos for visible plastic items, suggest categories, estimate qualitative quantity (LOW, MEDIUM, HIGH), and assist human reviewers with triage priority.
          </p>
        </div>

        <div className="rounded-xl border border-[#1F3329] bg-[#111B16] p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <MapPinned className="w-4 h-4" />
            <h3 className="text-base font-semibold text-white">Geographic Information Systems</h3>
          </div>
          <p className="text-sm text-[#9FB0A6] leading-relaxed">
            Plots every observation on OpenStreetMap via Leaflet and applies the Haversine distance formula to group nearby reports into Potential Hotspots with transparent priority weighting.
          </p>
        </div>

        <div className="rounded-xl border border-[#1F3329] bg-[#111B16] p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <Camera className="w-4 h-4" />
            <h3 className="text-base font-semibold text-white">Citizen Reporting</h3>
          </div>
          <p className="text-sm text-[#9FB0A6] leading-relaxed">
            Enables students and nearby Mangalore residents to capture field photos, attach GPS or map-pinned coordinates, and submit structured evidence without specialized hardware.
          </p>
        </div>

        <div className="rounded-xl border border-[#1F3329] bg-[#111B16] p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <UserCheck className="w-4 h-4" />
            <h3 className="text-base font-semibold text-white">Admin Dashboard</h3>
          </div>
          <p className="text-sm text-[#9FB0A6] leading-relaxed">
            Provides human-in-the-loop verification controls, review notes, cleanup activity planning, and before/after photo tracking so AI predictions never bypass human judgment.
          </p>
        </div>
      </section>

      {/* UN SDG Alignment */}
      <section className="rounded-xl border border-[#1F3329] bg-[#111B16] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">
            UN Sustainable Development Goals (SDG) Alignment
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg border border-[#1F3329] bg-[#0E1713] p-4 space-y-1.5">
            <div className="font-mono text-xs font-semibold text-amber-300">SDG 11</div>
            <div className="font-semibold text-white">Sustainable Cities &amp; Communities</div>
            <p className="text-xs text-[#9FB0A6] leading-relaxed">
              Supports cleaner campus surroundings and urban stormwater drain maintenance across Mangalore neighbourhoods.
            </p>
          </div>
          <div className="rounded-lg border border-[#1F3329] bg-[#0E1713] p-4 space-y-1.5">
            <div className="font-mono text-xs font-semibold text-emerald-300">SDG 12</div>
            <div className="font-semibold text-white">Responsible Consumption &amp; Production</div>
            <p className="text-xs text-[#9FB0A6] leading-relaxed">
              Tracks recurring single-use plastic categories (bottles, wrappers, carry bags) to guide waste reduction awareness.
            </p>
          </div>
          <div className="rounded-lg border border-[#1F3329] bg-[#0E1713] p-4 space-y-1.5">
            <div className="font-mono text-xs font-semibold text-sky-300">SDG 14</div>
            <div className="font-semibold text-white">Life Below Water</div>
            <p className="text-xs text-[#9FB0A6] leading-relaxed">
              Helps intercept roadside and culvert plastic waste in coastal Karnataka before monsoon runoff carries it into rivers and the Arabian Sea.
            </p>
          </div>
        </div>
      </section>

      {/* Project Limitations */}
      <section className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-6 space-y-3">
        <div className="flex items-center gap-2 text-amber-300">
          <ShieldAlert className="w-5 h-5" />
          <h2 className="text-lg font-semibold text-white">Known Prototype Limitations</h2>
        </div>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-amber-100/90">
          <li>AI can make mistakes, especially with blurry, dark, or occluded photographs.</li>
          <li>Device GPS may be inaccurate indoors or under tree cover; manual map verification is advised.</li>
          <li>All reports require human verification before being treated as confirmed observations.</li>
          <li>Hotspot priority scores are experimental relative triage cues, not proven environmental-risk metrics.</li>
          <li>This prototype does not identify, profile, or punish individuals who litter.</li>
          <li>Software monitoring does not physically collect waste—community and municipal cleanup drives remain essential.</li>
          <li>Data is stored locally in this browser (IndexedDB / localStorage) for a single-laptop demonstration and is not a shared production database.</li>
        </ul>
      </section>
    </div>
  );
}
