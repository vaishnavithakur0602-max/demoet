import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Clock, LogOut, AlertTriangle, Radio, FileText, Mic, MicOff, MapPin, Signal, X } from "lucide-react";
import Globe3D from "../components/Globe3D";
import FullIncidentView from "../components/FullIncidentView";
import { useAuth } from "../lib/auth";
import { INCIDENTS, getIncidentByLocationName, type Incident, type LayerData } from "../lib/incidents";
import { useVoiceCommands } from "../lib/useVoiceCommands";
import { downloadIncidentReport } from "../lib/pdf";

type LayerKey = "shipping" | "trade" | "air" | "oil" | "other";

export default function CommandCenter() {
  const { user, signOut } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyToToken, setFlyToToken] = useState<{ id: string; nonce: number } | null>(null);
  const [resetToken, setResetToken] = useState<number | null>(null);
  const [fullIncident, setFullIncident] = useState<Incident | null>(null);
  const [scenarioPct, setScenarioPct] = useState(0);
  const [activeLayer, setActiveLayer] = useState<LayerData | null>(null);
  const [voiceLayerCmd, setVoiceLayerCmd] = useState<LayerKey | null>(null);
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);
  const voiceTimer = useRef<number | null>(null);

  const selectedIncident = useMemo(
    () => INCIDENTS.find((i) => i.id === selectedId) ?? null,
    [selectedId],
  );

  // Live SPR runway countdown (base 8d 8h 33m 48s at scenario 0)
  const baseRunwayMs = 8 * 86400_000 + 8 * 3600_000 + 33 * 60_000 + 48_000;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // scenario degrades runway: at 50%+ it's halved
  const runwayMs = Math.max(0, baseRunwayMs * (1 - scenarioPct / 100) - (now - sessionStart));
  const runwayStr = formatDuration(runwayMs);

  // Optionality score: 18/27 at nominal, degrades with scenario
  const viableRoutes = Math.max(0, Math.round(27 * (1 - scenarioPct / 100) - 9));
  const offlineRoutes = 27 - viableRoutes;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setFlyToToken({ id, nonce: Date.now() });
  };

  const handleCloseInfoCard = () => {
    setSelectedId(null);
    setResetToken(Date.now());
  };

  const openFullIncident = () => {
    if (selectedIncident) setFullIncident(selectedIncident);
  };

  // Voice command handler
  const handleVoiceCommand = (transcript: string) => {
    setVoiceMsg(`Heard: "${transcript}"`);
    if (voiceTimer.current) clearTimeout(voiceTimer.current);
    voiceTimer.current = window.setTimeout(() => setVoiceMsg(null), 4000);

    const locations = ["strait of hormuz", "bab-el-mandeb", "bab el mandeb", "baltic sea", "suez canal"];
    let matched = false;
    for (const loc of locations) {
      if (transcript.includes(loc)) {
        const inc = getIncidentByLocationName(loc);
        if (inc) {
          handleSelect(inc.id);
          matched = true;
        }
        break;
      }
    }
    if (matched) return;

    if (transcript.includes("view report") || transcript.includes("view full incident")) {
      if (selectedIncident) {
        setFullIncident(selectedIncident);
        return;
      }
    }
    if (transcript.includes("shipping routes")) { setVoiceLayerCmd("shipping"); resetVoiceLayer(); return; }
    if (transcript.includes("trade routes")) { setVoiceLayerCmd("trade"); resetVoiceLayer(); return; }
    if (transcript.includes("air routes")) { setVoiceLayerCmd("air"); resetVoiceLayer(); return; }
    if (transcript.includes("oil resources")) { setVoiceLayerCmd("oil"); resetVoiceLayer(); return; }
    if (transcript.includes("ports") || transcript.includes("other energy")) { setVoiceLayerCmd("other"); resetVoiceLayer(); return; }
    if (transcript.includes("download")) {
      if (fullIncident) {
        downloadIncidentReport(fullIncident);
        return;
      }
    }
    if (transcript.includes("close") || transcript.includes("back")) {
      if (fullIncident) setFullIncident(null);
      else setSelectedId(null);
      return;
    }
    setVoiceMsg("Command not recognized");
  };

  const voice = useVoiceCommands(handleVoiceCommand);

  const resetVoiceLayer = () => {
    setTimeout(() => setVoiceLayerCmd(null), 100);
  };

  const layerRoutes = activeLayer?.routes ?? [];
  const layerResources = activeLayer?.resources ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-cyan-400/15 bg-[#07111a]/60 backdrop-blur">
        <div>
          <h1 className="text-base font-semibold tracking-[0.2em] text-cyan-100">COMMAND CENTER</h1>
          <p className="label-eyebrow-dim">SUPPLY-CHAIN SIGNAL OPS · TIER 3</p>
        </div>
        <div className="flex items-center gap-4">
          <StatBox
            label="NATIONAL OPTIONALITY SCORE"
            value={`${viableRoutes} / 27 viable routes`}
            color="cyan"
            icon={<Activity size={16} />}
          />
          <StatBox
            label="STRATEGIC RESERVE RUNWAY"
            value={runwayStr}
            color="amber"
            icon={<Clock size={16} />}
            mono
          />
          <div className="flex items-center gap-2 pl-4 border-l border-cyan-400/15">
            <div className="text-right">
              <p className="label-eyebrow-dim">OPERATOR</p>
              <p className="text-xs text-cyan-100 font-mono truncate max-w-[180px]">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="p-2 rounded border border-cyan-400/20 text-slate-400 hover:text-cyan-200 hover:border-cyan-400/40 transition"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-[320px_1fr] gap-3 p-3 min-h-0">
        {/* Left panel: incidents */}
        <aside className="bracket-panel bg-[#07111a]/60 border border-cyan-400/15 rounded p-3 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <AlertTriangle size={14} className="text-amber-400" />
              ACTIVE INCIDENTS
            </h2>
            <span className="px-2 py-0.5 rounded text-xs font-mono text-cyan-200 border border-cyan-400/30 bg-cyan-400/10">
              {INCIDENTS.length}
            </span>
          </div>
          <div className="space-y-2">
            {INCIDENTS.map((inc) => {
              const dotColor =
                inc.severity === "CRITICAL" ? "bg-red-500" : inc.severity === "HIGH" ? "bg-amber-500" : "bg-cyan-400";
              const badgeColor =
                inc.severity === "CRITICAL"
                  ? "text-red-300 border-red-500/40 bg-red-500/10"
                  : inc.severity === "HIGH"
                  ? "text-amber-300 border-amber-500/40 bg-amber-500/10"
                  : "text-cyan-300 border-cyan-500/40 bg-cyan-400/10";
              return (
                <button
                  key={inc.id}
                  onClick={() => handleSelect(inc.id)}
                  className={`w-full text-left p-3 rounded border transition ${
                    selectedId === inc.id
                      ? "border-cyan-400/50 bg-cyan-400/10"
                      : "border-cyan-400/10 bg-cyan-400/[0.02] hover:border-cyan-400/25 hover:bg-cyan-400/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor} ${inc.severity === "CRITICAL" ? "pulse-red" : inc.severity === "HIGH" ? "pulse-amber" : "pulse-cyan"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-cyan-50 font-medium leading-tight">{inc.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{inc.location}</p>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider border ${badgeColor}`}>
                      {inc.severity}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center: globe */}
        <main className="relative bracket-panel bg-[#07111a]/40 border border-cyan-400/15 rounded overflow-hidden min-h-0">
          {/* Pills above globe */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-cyan" />
              LIVE FEED · GLOBAL
            </span>
            <span className="px-2.5 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 text-xs font-mono">
              {INCIDENTS.length} ACTIVE · {offlineRoutes} ROUTES OFFLINE
            </span>
          </div>

          <Globe3D
            incidents={INCIDENTS}
            onSelect={handleSelect}
            flyToToken={flyToToken}
            resetToken={resetToken}
            focusedId={selectedId}
            layerRoutes={layerRoutes}
            layerResources={layerResources}
          />

          {/* Floating info card on marker select */}
          {selectedIncident && !fullIncident && (
            <div className="absolute bottom-24 left-3 z-10 w-80 bracket-4 bg-[#07111a]/95 border border-cyan-400/30 rounded p-4 fade-in">
              <span className="b tl" /><span className="b tr" /><span className="b bl" /><span className="b br" />
              <button
                onClick={handleCloseInfoCard}
                className="absolute top-2 right-2 p-1 rounded text-slate-500 hover:text-cyan-200 hover:bg-cyan-400/10 transition"
                aria-label="Close"
              >
                <X size={14} />
              </button>
              <div className="flex items-center gap-2 mb-2 pr-6">
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${
                  selectedIncident.severity === "CRITICAL" ? "text-red-300 border-red-500/40 bg-red-500/10" :
                  selectedIncident.severity === "HIGH" ? "text-amber-300 border-amber-500/40 bg-amber-500/10" :
                  "text-cyan-300 border-cyan-500/40 bg-cyan-400/10"
                }`}>
                  <AlertTriangle size={10} />
                  {selectedIncident.severity}
                </span>
                <span className="text-[10px] text-slate-500 font-mono ml-auto">inc-{selectedIncident.id}</span>
              </div>
              <h3 className="text-sm font-semibold text-cyan-50 leading-tight">{selectedIncident.title}</h3>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin size={11} className="text-cyan-400/60" />
                  {selectedIncident.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} className="text-cyan-400/60" />
                  {new Date(selectedIncident.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 line-clamp-2">{selectedIncident.summary}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-200 border border-cyan-400/30 bg-cyan-400/10">
                  <Signal size={10} />
                  {selectedIncident.signals.length} SIGNALS
                </span>
                <button
                  onClick={openFullIncident}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-cyan-400/40 bg-cyan-400/10 text-cyan-100 text-xs font-semibold hover:bg-cyan-400/20 transition"
                >
                  <FileText size={12} />
                  View Full Incident
                </button>
              </div>
            </div>
          )}

          {/* Bottom scenario panel */}
          <div className="absolute bottom-3 left-3 right-3 z-10 bracket-4 bg-[#07111a]/90 border border-cyan-400/20 rounded p-4">
            <span className="b tl" /><span className="b tr" /><span className="b bl" /><span className="b br" />
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-cyan-100">SCENARIO — CORRIDOR CAPACITY BLOCKED</h3>
                <p className="text-xs text-slate-400">Drag to simulate — Optionality Score & SPR Runway respond in real time</p>
              </div>
              <div className="text-right">
                <p className="label-eyebrow-dim">DEGRADATION</p>
                <p className="text-2xl font-bold text-cyan-300 font-mono">{scenarioPct}%</p>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={scenarioPct}
              onChange={(e) => setScenarioPct(Number(e.target.value))}
              className="scenario-slider w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>0% — NOMINAL</span>
              <span>25% — STRESSED</span>
              <span>50%+ — DEGRADED</span>
            </div>
          </div>
        </main>
      </div>

      {/* Full incident overlay */}
      {fullIncident && (
        <FullIncidentView
          incident={fullIncident}
          onClose={() => setFullIncident(null)}
          onLayerChange={(layer) => setActiveLayer(layer)}
          voiceLayerCommand={voiceLayerCmd}
        />
      )}

      {/* Voice control */}
      <VoiceControl
        listening={voice.listening}
        supported={voice.supported}
        onToggle={voice.toggle}
        transcript={voiceMsg}
      />
    </div>
  );
}

const sessionStart = Date.now();

function StatBox({
  label,
  value,
  color,
  icon,
  mono,
}: {
  label: string;
  value: string;
  color: "cyan" | "amber";
  icon: React.ReactNode;
  mono?: boolean;
}) {
  const colorClass = color === "cyan" ? "text-cyan-300" : "text-amber-300";
  return (
    <div className="bracket-panel px-4 py-2 bg-cyan-400/[0.03] border border-cyan-400/15 rounded">
      <p className="label-eyebrow-dim flex items-center gap-1.5">{icon}{label}</p>
      <p className={`text-lg font-bold ${colorClass} ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function VoiceControl({
  listening,
  supported,
  onToggle,
  transcript,
}: {
  listening: boolean;
  supported: boolean;
  onToggle: () => void;
  transcript: string | null;
}) {
  if (!supported) return null;
  return (
    <>
      <button
        onClick={onToggle}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full border flex items-center justify-center transition ${
          listening
            ? "border-cyan-400 bg-cyan-400/20 text-cyan-200 mic-active"
            : "border-cyan-400/40 bg-[#07111a] text-cyan-400 hover:bg-cyan-400/10"
        }`}
        aria-label={listening ? "Stop listening" : "Start voice command"}
      >
        {listening ? <Mic size={22} /> : <MicOff size={22} />}
      </button>
      {transcript && (
        <div className="fixed bottom-24 right-6 z-50 px-3 py-2 rounded border border-cyan-400/40 bg-[#07111a]/95 text-cyan-100 text-sm font-mono max-w-xs fade-in">
          <span className="label-eyebrow flex items-center gap-1.5 mb-0.5"><Radio size={10} />VOICE</span>
          {transcript}
        </div>
      )}
    </>
  );
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0d 00h 00m 00s";
  const d = Math.floor(ms / 86400_000);
  const h = Math.floor((ms % 86400_000) / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}
