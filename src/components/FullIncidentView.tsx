import { useEffect, useState } from "react";
import { Download, X, FileText, Clock, MapPin } from "lucide-react";
import type { Incident, LayerData } from "../lib/incidents";
import { downloadIncidentReport } from "../lib/pdf";

type LayerKey = "shipping" | "trade" | "air" | "oil" | "other";

const LAYER_LABELS: { key: LayerKey; label: string }[] = [
  { key: "shipping", label: "Shipping Routes" },
  { key: "trade", label: "Trade Routes" },
  { key: "air", label: "Air Routes" },
  { key: "oil", label: "Oil Resources" },
  { key: "other", label: "Other Energy Resources" },
];

interface Props {
  incident: Incident;
  onClose: () => void;
  onLayerChange?: (layer: LayerData) => void;
  voiceLayerCommand?: LayerKey | null;
}

export default function FullIncidentView({ incident, onClose, onLayerChange, voiceLayerCommand }: Props) {
  const [activeLayer, setActiveLayer] = useState<LayerKey | null>(null);

  // Respond to voice layer commands
  useEffect(() => {
    if (voiceLayerCommand && voiceLayerCommand !== activeLayer) {
      setActiveLayer(voiceLayerCommand);
      if (onLayerChange) onLayerChange(incident.layers[voiceLayerCommand]);
    }
  }, [voiceLayerCommand]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectLayer = (key: LayerKey) => {
    setActiveLayer(key);
    if (onLayerChange) onLayerChange(incident.layers[key]);
  };

  const severityColor =
    incident.severity === "CRITICAL"
      ? "text-red-400 border-red-500/50 bg-red-500/10"
      : incident.severity === "HIGH"
      ? "text-amber-400 border-amber-500/50 bg-amber-500/10"
      : "text-cyan-400 border-cyan-500/50 bg-cyan-500/10";

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Dimmed backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative ml-auto w-full max-w-2xl h-full bg-[#07111a]/95 border-l border-cyan-400/20 overflow-y-auto slide-in-right">
        <div className="bracket-4">
          <span className="b tl" /><span className="b tr" /><span className="b bl" /><span className="b br" />
        </div>

        {/* Top row */}
        <div className="sticky top-0 z-10 bg-[#07111a]/95 backdrop-blur border-b border-cyan-400/10 px-6 py-4 flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded text-xs font-bold tracking-wider border ${severityColor}`}>
            {incident.severity}
          </span>
          <span className="px-2.5 py-1 rounded text-xs font-mono text-cyan-200 border border-cyan-400/30 bg-cyan-400/5">
            INCIDENT / inc-{incident.id}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => downloadIncidentReport(incident)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-cyan-400/40 bg-cyan-400/10 text-cyan-100 text-xs font-semibold tracking-wider uppercase hover:bg-cyan-400/20 transition"
            >
              <Download size={14} />
              Download Report
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded border border-cyan-400/20 text-slate-400 hover:text-cyan-200 hover:border-cyan-400/40 transition"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Title */}
          <div>
            <h2 className="text-xl font-semibold text-cyan-50">{incident.title}</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><MapPin size={13} />{incident.location}</span>
              <span className="flex items-center gap-1.5"><Clock size={13} />{new Date(incident.timestamp).toUTCString()}</span>
            </div>
          </div>

          {/* Narrative summary */}
          <Panel title="NARRATIVE SUMMARY">
            <p className="text-sm text-slate-300 leading-relaxed">{incident.summary}</p>
          </Panel>

          {/* Two columns: signals + actions */}
          <div className="grid grid-cols-2 gap-4">
            <Panel title="TRIGGERING SIGNALS">
              <ol className="space-y-3">
                {incident.signals.map((s, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-baseline gap-2">
                      <span className="text-cyan-400 font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-semibold text-cyan-100">{s.source}</span>
                    </div>
                    <p className="text-slate-300 mt-0.5 ml-6">{s.detail}</p>
                    <p className="text-xs text-slate-500 mt-0.5 ml-6 font-mono">{new Date(s.timestamp).toISOString()}</p>
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel title="RECOMMENDED ACTIONS">
              <ul className="space-y-2.5">
                {incident.recommendedActions.map((a, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-200">
                    <span className="text-cyan-400 mt-1">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          {/* Historical precedent */}
          <Panel title="HISTORICAL PRECEDENT">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-cyan-100">{incident.historical.title}</span>
              <span className="px-2 py-0.5 rounded text-xs font-mono text-amber-300 border border-amber-500/40 bg-amber-500/10">
                {incident.historical.daysEarlier} DAYS EARLIER
              </span>
            </div>
            <div className="relative h-16 my-4">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-600" />
              <div className="absolute top-1/2 left-[8%] -translate-y-1/2">
                <div className="w-3 h-3 rounded-full bg-cyan-400 ring-4 ring-cyan-400/20" />
                <p className="text-[10px] mt-1 text-cyan-300 font-mono">OUR SYSTEM FLAGGED</p>
                <p className="text-xs text-slate-400 font-mono">{incident.historical.flaggedDate}</p>
                <p className="text-[10px] text-slate-500 font-mono">T-{incident.historical.leadTimeDays}d</p>
              </div>
              <div className="absolute top-1/2 right-[8%] -translate-y-1/2 text-right">
                <div className="w-3 h-3 rounded-full bg-amber-400 ring-4 ring-amber-400/20 ml-auto" />
                <p className="text-[10px] mt-1 text-amber-300 font-mono">PUBLIC NEWS BROKE</p>
                <p className="text-xs text-slate-400 font-mono">{incident.historical.publicDate}</p>
                <p className="text-[10px] text-slate-500 font-mono">T-0</p>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="px-2.5 py-1 rounded text-xs font-mono text-cyan-200 border border-cyan-400/40 bg-[#07111a]">
                  LEAD TIME
                </span>
              </div>
            </div>
            <div className="text-center mt-2">
              <p className="text-3xl font-bold text-cyan-300">{incident.historical.leadTimeDays} <span className="text-base font-normal text-slate-400">days earlier</span></p>
            </div>
          </Panel>

          {/* Decision trace */}
          <Panel title="DECISION TRACE — SYSTEM LOG">
            <div className="font-mono text-xs space-y-1 bg-black/40 p-3 rounded border border-cyan-400/10">
              {incident.decisionTrace.map((l, i) => (
                <div
                  key={i}
                  className={l.verdict === "SELECTED" ? "text-cyan-300" : "text-slate-500"}
                >
                  <span className="text-slate-600">[{l.timestamp}]</span>{" "}
                  <span className="text-slate-400">eval →</span>{" "}
                  <span>candidate="{l.candidate}"</span>{" "}
                  <span className={l.verdict === "SELECTED" ? "text-cyan-400 font-bold" : "text-red-400"}>
                    verdict={l.verdict}
                  </span>{" "}
                  <span className="text-slate-500">reason="{l.reason}"</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Counterfactual */}
          <Panel title={`WHY NOT "${incident.counterfactual.alternativeName}"?`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-cyan-400/10">
                  <th className="py-2 font-medium">METRIC</th>
                  <th className="py-2 font-medium">RECOMMENDED</th>
                  <th className="py-2 font-medium">ALTERNATIVE</th>
                  <th className="py-2 font-medium">Δ</th>
                </tr>
              </thead>
              <tbody>
                {incident.counterfactual.rows.map((r, i) => (
                  <tr key={i} className="border-b border-cyan-400/5">
                    <td className="py-2 text-slate-300">{r.metric}</td>
                    <td className="py-2 text-cyan-300 font-bold">{r.recommended}</td>
                    <td className="py-2 text-slate-500">{r.alternative}</td>
                    <td className="py-2 text-emerald-400">{r.delta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm text-slate-300 mt-3">{incident.counterfactual.explanation}</p>
          </Panel>

          {/* Layer toggles */}
          <Panel title="ROUTE / RESOURCE LAYERS">
            <div className="flex flex-wrap gap-2 mb-3">
              {LAYER_LABELS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => selectLayer(l.key)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wider uppercase border transition ${
                    activeLayer === l.key
                      ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-100"
                      : "border-cyan-400/15 text-slate-400 hover:text-cyan-200 hover:border-cyan-400/30"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            {activeLayer ? (
              <div className="text-xs text-slate-400">
                {incident.layers[activeLayer].routes.length + incident.layers[activeLayer].resources.length} items shown near incident.{" "}
                <span className="text-cyan-300">Solid cyan</span> = active route.{" "}
                <span className="text-slate-500">Grey dotted</span> = inactive.
                {activeLayer === "shipping" && (
                  <span className="block mt-1 text-amber-300/80">Note: live AIS is paid; routes shown are illustrative.</span>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Select a layer to overlay it on the globe near this incident.</p>
            )}
          </Panel>

          {/* GoI context */}
          <Panel title="GOVERNMENT OF INDIA CONTEXT">
            <div className="space-y-3">
              {incident.goiContext.map((g, i) => (
                <div key={i} className="flex flex-col">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="label-eyebrow">{g.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{g.source}</span>
                  </div>
                  <p className="text-sm text-slate-200 mt-0.5">{g.value}</p>
                </div>
              ))}
              <p className="text-[10px] text-slate-500 pt-2 border-t border-cyan-400/10">
                Sources: PPAC (ppac.gov.in), MoPNG, PIB public data. Figures are illustrative for demonstration.
              </p>
            </div>
          </Panel>

          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bracket-4 bg-cyan-400/[0.02] border border-cyan-400/15 rounded p-4">
      <span className="b tl" /><span className="b tr" /><span className="b bl" /><span className="b br" />
      <h3 className="label-eyebrow mb-3 flex items-center gap-2">
        <FileText size={12} />
        {title}
      </h3>
      {children}
    </div>
  );
}
