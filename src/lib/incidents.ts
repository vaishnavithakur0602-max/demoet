export type Severity = "CRITICAL" | "HIGH" | "MEDIUM";

export interface Signal {
  source: string;
  timestamp: string;
  detail: string;
}

export interface RecommendedAction {
  text: string;
}

export interface CounterfactualRow {
  metric: string;
  recommended: string;
  alternative: string;
  delta: string;
}

export interface HistoricalPrecedent {
  title: string;
  daysEarlier: number;
  flaggedDate: string;
  publicDate: string;
  leadTimeDays: number;
}

export interface DecisionTraceLine {
  timestamp: string;
  candidate: string;
  verdict: "REJECTED" | "SELECTED";
  reason: string;
}

export interface RoutePoint {
  name: string;
  lat: number;
  lng: number;
}

export interface Route {
  from: RoutePoint;
  to: RoutePoint;
  active: boolean;
}

export interface ResourcePoint {
  name: string;
  lat: number;
  lng: number;
  type: "port" | "oil" | "gas" | "refinery" | "air";
}

export interface LayerData {
  routes: Route[];
  resources: ResourcePoint[];
}

export interface GoIContextItem {
  label: string;
  value: string;
  source: string;
}

export interface Incident {
  id: string;
  title: string;
  location: string;
  lat: number;
  lng: number;
  severity: Severity;
  timestamp: string;
  summary: string;
  signals: Signal[];
  recommendedActions: string[];
  historical: HistoricalPrecedent;
  decisionTrace: DecisionTraceLine[];
  counterfactual: {
    alternativeName: string;
    rows: CounterfactualRow[];
    explanation: string;
  };
  layers: {
    shipping: LayerData;
    trade: LayerData;
    air: LayerData;
    oil: LayerData;
    other: LayerData;
  };
  goiContext: GoIContextItem[];
}

export const INCIDENTS: Incident[] = [
  {
    id: "001",
    title: "Strait of Hormuz — Tanker Transit Disruption",
    location: "Strait of Hormuz, Persian Gulf",
    lat: 26.57,
    lng: 56.25,
    severity: "CRITICAL",
    timestamp: "2026-07-05T06:12:00Z",
    summary:
      "AIS gaps and SAR-detected vessel clustering indicate a partial transit blockade through the Strait of Hormuz. Approximately 18% of crude tankers transiting the strait have gone dark over the past 36 hours. India imports roughly 60% of its crude via this corridor; sustained disruption would compress the Strategic Petroleum Reserve runway to under 9 days at current draw rates.",
    signals: [
      { source: "MarineTraffic AIS", timestamp: "2026-07-05T04:30:00Z", detail: "12 tankers dropped AIS within a 40nm radius over 36h." },
      { source: "Sentinel-1 SAR", timestamp: "2026-07-05T05:10:00Z", detail: "Anomalous vessel clustering detected on the inbound lane." },
      { source: "Reuters Terminal", timestamp: "2026-07-05T05:45:00Z", detail: "Shipping advisory issued; insurance premiums on Hormuz routes up 22%." },
      { source: "Local port radio (SIGINT)", timestamp: "2026-07-05T06:00:00Z", detail: "Intercepted traffic references restricted transit windows." },
    ],
    recommendedActions: [
      "Activate SPR draw at 1.2 million barrels/day for 14 days to cover the gap.",
      "Reroute 4 VLCCs currently in the Arabian Sea to the Suez-Med corridor via the Cape route.",
      "Open emergency coordination channel with UAE Fujairah terminal for 2.5 Mt storage access.",
      "Brief MoPNG within 6 hours; prepare Cabinet note for strategic reserve top-up.",
    ],
    historical: {
      title: "2019 Hormuz tanker seizures",
      daysEarlier: 11,
      flaggedDate: "2019-06-13",
      publicDate: "2019-06-24",
      leadTimeDays: 11,
    },
    decisionTrace: [
      { timestamp: "2026-07-05T06:12:01Z", candidate: "Fujairah Bypass", verdict: "REJECTED", reason: "capacity=1.8Mt < required=2.5Mt" },
      { timestamp: "2026-07-05T06:12:02Z", candidate: "Cape Route Reroute", verdict: "REJECTED", reason: "eta=18d > reserve_runway=9d" },
      { timestamp: "2026-07-05T06:12:03Z", candidate: "SPR Draw + Fujairah Access", verdict: "SELECTED", reason: "covers 14d gap at 1.2Mb/d within runway" },
    ],
    counterfactual: {
      alternativeName: "Cape Route Reroute",
      rows: [
        { metric: "OPTION", recommended: "SPR + Fujairah", alternative: "Cape Reroute", delta: "+2 routes" },
        { metric: "PRICE $/BBL", recommended: "+3.10", alternative: "+7.80", delta: "+4.70" },
        { metric: "ETA (DAYS)", recommended: "0 (draw)", alternative: "18", delta: "+18" },
        { metric: "COMPAT. SCORE", recommended: "0.91", alternative: "0.62", delta: "-0.29" },
      ],
      explanation: "Cape reroute adds 18 days transit, exceeding the 9-day reserve runway; SPR draw covers the gap immediately at lower cost.",
    },
    layers: {
      shipping: {
        routes: [
          { from: { name: "Ras Tanura", lat: 26.52, lng: 50.10 }, to: { name: "Mumbai", lat: 19.07, lng: 72.87 }, active: true },
          { from: { name: "Fujairah", lat: 25.12, lng: 56.34 }, to: { name: "Mumbai", lat: 19.07, lng: 72.87 }, active: true },
          { from: { name: "Ras Tanura", lat: 26.52, lng: 50.10 }, to: { name: "Chennai", lat: 13.08, lng: 80.27 }, active: false },
        ],
        resources: [
          { name: "Fujairah Terminal", lat: 25.12, lng: 56.34, type: "port" },
          { name: "Mumbai Port", lat: 19.07, lng: 72.87, type: "port" },
        ],
      },
      trade: {
        routes: [
          { from: { name: "Dubai", lat: 25.20, lng: 55.27 }, to: { name: "Mundra", lat: 22.84, lng: 69.36 }, active: true },
          { from: { name: "Dubai", lat: 25.20, lng: 55.27 }, to: { name: "Kandla", lat: 23.03, lng: 70.22 }, active: false },
        ],
        resources: [{ name: "Mundra SEZ", lat: 22.84, lng: 69.36, type: "port" }],
      },
      air: {
        routes: [
          { from: { name: "Dubai Intl", lat: 25.25, lng: 55.36 }, to: { name: "Mumbai Intl", lat: 19.09, lng: 72.87 }, active: true },
        ],
        resources: [{ name: "Mumbai Intl", lat: 19.09, lng: 72.87, type: "air" }],
      },
      oil: {
        routes: [],
        resources: [
          { name: "Mumbai High Field", lat: 19.07, lng: 72.10, type: "oil" },
          { name: "Ras Tanura Refinery", lat: 26.52, lng: 50.10, type: "refinery" },
        ],
      },
      other: {
        routes: [],
        resources: [{ name: "Dahej LNG", lat: 21.72, lng: 72.55, type: "gas" }],
      },
    },
    goiContext: [
      { label: "SPR Status", value: "5.33 Mt (≈9.5 days cover)", source: "PPAC, Jul 2026" },
      { label: "MoPNG Statement", value: "Monitoring transit; no draw authorized yet.", source: "PIB, 04 Jul 2026" },
      { label: "Import Dependency (corridor)", value: "≈60% of crude via Hormuz", source: "MoPNG Annual Report" },
    ],
  },
  {
    id: "002",
    title: "Bab-el-Mandeb — Shipping Lane Constriction",
    location: "Bab-el-Mandeb Strait, Red Sea",
    lat: 12.58,
    lng: 43.33,
    severity: "HIGH",
    timestamp: "2026-07-05T03:40:00Z",
    summary:
      "Escalating attacks on commercial vessels in the Bab-el-Mandeb strait have forced carriers to divert around the Cape of Good Hope. India-bound crude and LNG shipments face 10-14 day delays. The Red Sea corridor currently carries roughly 12% of India's energy imports.",
    signals: [
      { source: "MarineTraffic AIS", timestamp: "2026-07-05T02:15:00Z", detail: "Vessel traffic down 38% week-on-week." },
      { source: "Reuters Terminal", timestamp: "2026-07-05T03:00:00Z", detail: "Three carriers announce Cape reroutes." },
      { source: "Sentinel-1 SAR", timestamp: "2026-07-05T03:20:00Z", detail: "Small craft activity detected near Perim Island." },
    ],
    recommendedActions: [
      "Pre-position 2 VLCCs in the Red Sea for emergency charter if lane reopens.",
      "Negotiate additional LNG cargoes from Qatar via the Cape route.",
      "Increase domestic refinery utilization by 4% to offset import lag.",
    ],
    historical: {
      title: "2024 Red Sea shipping crisis",
      daysEarlier: 8,
      flaggedDate: "2023-12-15",
      publicDate: "2023-12-23",
      leadTimeDays: 8,
    },
    decisionTrace: [
      { timestamp: "2026-07-05T03:40:01Z", candidate: "Suez Reroute", verdict: "REJECTED", reason: "lane_status=constricted" },
      { timestamp: "2026-07-05T03:40:02Z", candidate: "Cape + Qatar LNG", verdict: "SELECTED", reason: "covers 14d lag at +1.8Mt LNG" },
    ],
    counterfactual: {
      alternativeName: "Suez Reroute",
      rows: [
        { metric: "OPTION", recommended: "Cape + Qatar LNG", alternative: "Suez Reroute", delta: "+1 route" },
        { metric: "PRICE $/BBL", recommended: "+2.40", alternative: "+5.10", delta: "+2.70" },
        { metric: "ETA (DAYS)", recommended: "14", alternative: "blocked", delta: "n/a" },
        { metric: "COMPAT. SCORE", recommended: "0.84", alternative: "0.31", delta: "-0.53" },
      ],
      explanation: "Suez lane is constricted; Cape reroute with Qatar LNG cargoes restores supply within 14 days.",
    },
    layers: {
      shipping: {
        routes: [
          { from: { name: "Jeddah", lat: 21.49, lng: 39.19 }, to: { name: "Mumbai", lat: 19.07, lng: 72.87 }, active: true },
          { from: { name: "Djibouti", lat: 11.58, lng: 43.14 }, to: { name: "Chennai", lat: 13.08, lng: 80.27 }, active: false },
        ],
        resources: [{ name: "Jeddah Port", lat: 21.49, lng: 39.19, type: "port" }],
      },
      trade: {
        routes: [
          { from: { name: "Djibouti", lat: 11.58, lng: 43.14 }, to: { name: "Mundra", lat: 22.84, lng: 69.36 }, active: true },
        ],
        resources: [{ name: "Mundra SEZ", lat: 22.84, lng: 69.36, type: "port" }],
      },
      air: {
        routes: [
          { from: { name: "Addis Ababa", lat: 8.98, lng: 38.79 }, to: { name: "Delhi", lat: 28.55, lng: 77.10 }, active: true },
        ],
        resources: [{ name: "Delhi IGI", lat: 28.55, lng: 77.10, type: "air" }],
      },
      oil: {
        routes: [],
        resources: [{ name: "Suakin Terminal", lat: 19.10, lng: 37.33, type: "refinery" }],
      },
      other: {
        routes: [],
        resources: [{ name: "Dhabhol LNG", lat: 17.69, lng: 73.16, type: "gas" }],
      },
    },
    goiContext: [
      { label: "SPR Status", value: "5.33 Mt (≈9.5 days cover)", source: "PPAC, Jul 2026" },
      { label: "MoPNG Statement", value: "Coordinating with Indian Navy for escort ops.", source: "PIB, 03 Jul 2026" },
      { label: "Import Dependency (corridor)", value: "≈12% of energy imports via Red Sea", source: "MoPNG Annual Report" },
    ],
  },
  {
    id: "003",
    title: "Baltic Sea — Pipeline Pressure Anomaly",
    location: "Baltic Sea, Nord Stream Corridor",
    lat: 55.50,
    lng: 19.50,
    severity: "MEDIUM",
    timestamp: "2026-07-04T22:05:00Z",
    summary:
      "Pressure anomalies detected along the Baltic seabed pipeline corridor. While India has no direct dependency on this route, secondary effects on global LNG pricing and European energy substitution flows are material. Spot LNG prices up 6% on the week.",
    signals: [
      { source: "Sentinel-1 SAR", timestamp: "2026-07-04T21:30:00Z", detail: "Surface disturbance detected near pipeline route." },
      { source: "Reuters Terminal", timestamp: "2026-07-04T22:00:00Z", detail: "European LNG spot up 6% week-on-week." },
    ],
    recommendedActions: [
      "Hedge additional LNG cargoes at current spot before further price escalation.",
      "Brief MoPNG on secondary price exposure to Indian LNG imports.",
    ],
    historical: {
      title: "2022 Nord Stream incident",
      daysEarlier: 6,
      flaggedDate: "2022-09-26",
      publicDate: "2022-10-02",
      leadTimeDays: 6,
    },
    decisionTrace: [
      { timestamp: "2026-07-04T22:05:01Z", candidate: "No Action", verdict: "REJECTED", reason: "price_exposure=+6% LNG spot" },
      { timestamp: "2026-07-04T22:05:02Z", candidate: "LNG Hedge + MoPNG Brief", verdict: "SELECTED", reason: "limits price exposure to +2%" },
    ],
    counterfactual: {
      alternativeName: "No Action",
      rows: [
        { metric: "OPTION", recommended: "LNG Hedge + Brief", alternative: "No Action", delta: "+1 hedge" },
        { metric: "PRICE $/BBL", recommended: "+0.80", alternative: "+2.40", delta: "+1.60" },
        { metric: "ETA (DAYS)", recommended: "0", alternative: "0", delta: "0" },
        { metric: "COMPAT. SCORE", recommended: "0.78", alternative: "0.40", delta: "-0.38" },
      ],
      explanation: "No action leaves Indian LNG imports exposed to a 6% spot rise; hedging caps the exposure.",
    },
    layers: {
      shipping: {
        routes: [
          { from: { name: "Gdansk", lat: 54.35, lng: 18.65 }, to: { name: "Mumbai", lat: 19.07, lng: 72.87 }, active: false },
        ],
        resources: [{ name: "Gdansk Port", lat: 54.35, lng: 18.65, type: "port" }],
      },
      trade: {
        routes: [
          { from: { name: "Hamburg", lat: 53.55, lng: 9.99 }, to: { name: "Mundra", lat: 22.84, lng: 69.36 }, active: true },
        ],
        resources: [{ name: "Hamburg Port", lat: 53.55, lng: 9.99, type: "port" }],
      },
      air: {
        routes: [
          { from: { name: "Hamburg", lat: 53.55, lng: 9.99 }, to: { name: "Delhi", lat: 28.55, lng: 77.10 }, active: true },
        ],
        resources: [{ name: "Delhi IGI", lat: 28.55, lng: 77.10, type: "air" }],
      },
      oil: {
        routes: [],
        resources: [{ name: "Gdansk Refinery", lat: 54.35, lng: 18.65, type: "refinery" }],
      },
      other: {
        routes: [],
        resources: [{ name: "Nord Stream Node", lat: 55.50, lng: 19.50, type: "gas" }],
      },
    },
    goiContext: [
      { label: "SPR Status", value: "5.33 Mt (≈9.5 days cover)", source: "PPAC, Jul 2026" },
      { label: "MoPNG Statement", value: "No direct dependency; monitoring LNG price spillover.", source: "PIB, 04 Jul 2026" },
      { label: "Import Dependency (corridor)", value: "0% direct; secondary LNG price exposure", source: "MoPNG Annual Report" },
    ],
  },
  {
    id: "004",
    title: "Suez Canal — Transit Delay Accumulation",
    location: "Suez Canal, Egypt",
    lat: 30.46,
    lng: 32.34,
    severity: "HIGH",
    timestamp: "2026-07-05T01:20:00Z",
    summary:
      "Cumulative transit delays through the Suez Canal have reached 72 hours for northbound crude. Wind-blown sand and reduced convoy frequency are contributing factors. India-bound cargoes from the Mediterranean face 3-5 day delivery slips.",
    signals: [
      { source: "MarineTraffic AIS", timestamp: "2026-07-05T00:45:00Z", detail: "Average transit time up from 14h to 86h." },
      { source: "Reuters Terminal", timestamp: "2026-07-05T01:00:00Z", detail: "SCA confirms reduced convoy schedule." },
      { source: "Local port radio (SIGINT)", timestamp: "2026-07-05T01:15:00Z", detail: "Convoy spacing widened to 6h intervals." },
    ],
    recommendedActions: [
      "Reroute 2 Suez-bound crude cargoes via the Cape route for the next 10 days.",
      "Coordinate with IOC and BPCL to draw from Visakhapatnam SPR cache.",
      "Engage SCA for priority convoy slot for Indian-flagged tankers.",
    ],
    historical: {
      title: "2021 Ever Given blockage",
      daysEarlier: 4,
      flaggedDate: "2021-03-23",
      publicDate: "2021-03-27",
      leadTimeDays: 4,
    },
    decisionTrace: [
      { timestamp: "2026-07-05T01:20:01Z", candidate: "Wait for Suez", verdict: "REJECTED", reason: "delay=72h > tolerance=24h" },
      { timestamp: "2026-07-05T01:20:02Z", candidate: "Cape + Vizag SPR", verdict: "SELECTED", reason: "restores schedule within 10d" },
    ],
    counterfactual: {
      alternativeName: "Wait for Suez",
      rows: [
        { metric: "OPTION", recommended: "Cape + Vizag SPR", alternative: "Wait for Suez", delta: "+1 route" },
        { metric: "PRICE $/BBL", recommended: "+1.90", alternative: "+3.40", delta: "+1.50" },
        { metric: "ETA (DAYS)", recommended: "10", alternative: "3-5 slip", delta: "+5" },
        { metric: "COMPAT. SCORE", recommended: "0.82", alternative: "0.55", delta: "-0.27" },
      ],
      explanation: "Waiting for Suez adds 3-5 day slips; Cape reroute plus Vizag SPR draw restores the schedule.",
    },
    layers: {
      shipping: {
        routes: [
          { from: { name: "Port Said", lat: 31.26, lng: 32.30 }, to: { name: "Mumbai", lat: 19.07, lng: 72.87 }, active: true },
          { from: { name: "Port Said", lat: 31.26, lng: 32.30 }, to: { name: "Chennai", lat: 13.08, lng: 80.27 }, active: false },
        ],
        resources: [{ name: "Port Said", lat: 31.26, lng: 32.30, type: "port" }],
      },
      trade: {
        routes: [
          { from: { name: "Cairo", lat: 30.04, lng: 31.24 }, to: { name: "Mundra", lat: 22.84, lng: 69.36 }, active: true },
        ],
        resources: [{ name: "Mundra SEZ", lat: 22.84, lng: 69.36, type: "port" }],
      },
      air: {
        routes: [
          { from: { name: "Cairo Intl", lat: 30.12, lng: 31.41 }, to: { name: "Mumbai Intl", lat: 19.09, lng: 72.87 }, active: true },
        ],
        resources: [{ name: "Mumbai Intl", lat: 19.09, lng: 72.87, type: "air" }],
      },
      oil: {
        routes: [],
        resources: [{ name: "Cairo Refinery", lat: 30.04, lng: 31.24, type: "refinery" }],
      },
      other: {
        routes: [],
        resources: [{ name: "Damietta LNG", lat: 31.42, lng: 31.81, type: "gas" }],
      },
    },
    goiContext: [
      { label: "SPR Status", value: "5.33 Mt (≈9.5 days cover)", source: "PPAC, Jul 2026" },
      { label: "MoPNG Statement", value: "Engaging SCA for priority convoy slots.", source: "PIB, 04 Jul 2026" },
      { label: "Import Dependency (corridor)", value: "≈8% of crude via Suez-Med", source: "MoPNG Annual Report" },
    ],
  },
];

export function getIncidentById(id: string): Incident | undefined {
  return INCIDENTS.find((i) => i.id === id);
}

export function getIncidentByLocationName(name: string): Incident | undefined {
  const lower = name.toLowerCase();
  return INCIDENTS.find(
    (i) =>
      i.location.toLowerCase().includes(lower) ||
      i.title.toLowerCase().includes(lower),
  );
}
