import { jsPDF } from "jspdf";
import type { Incident } from "./incidents";

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function downloadIncidentReport(inc: Incident) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Header
  doc.setFillColor(7, 17, 26);
  doc.rect(0, 0, W, 60, "F");
  doc.setTextColor(34, 211, 238);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("INCIDENT REPORT", margin, 30);
  doc.setFontSize(9);
  doc.setTextColor(150, 200, 220);
  doc.text(`INCIDENT / inc-${inc.id}`, margin, 46);
  doc.text(`Generated: ${new Date().toISOString()}`, W - margin, 46, { align: "right" });
  y = 80;

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(inc.title, margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`${inc.location}  ·  ${new Date(inc.timestamp).toUTCString()}`, margin, y);
  y += 24;

  // Severity badge
  doc.setFillColor(
    inc.severity === "CRITICAL" ? 239 : inc.severity === "HIGH" ? 245 : 34,
    inc.severity === "CRITICAL" ? 68 : inc.severity === "HIGH" ? 158 : 211,
    inc.severity === "CRITICAL" ? 68 : inc.severity === "HIGH" ? 11 : 238,
  );
  doc.roundedRect(margin, y, 80, 18, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(inc.severity, margin + 8, y + 12);
  y += 30;

  // Narrative summary
  sectionTitle(doc, "NARRATIVE SUMMARY", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const summaryLines = doc.splitTextToSize(inc.summary, W - margin * 2);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 12 + 16;

  // Two columns: signals + actions
  const colW = (W - margin * 2 - 20) / 2;
  const leftX = margin;
  const rightX = margin + colW + 20;
  const startY = y;
  sectionTitle(doc, "TRIGGERING SIGNALS", leftX, startY);
  sectionTitle(doc, "RECOMMENDED ACTIONS", rightX, startY);
  let ly = startY + 16;
  let ry = startY + 16;
  doc.setFontSize(9);
  inc.signals.forEach((s, i) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    const num = `${i + 1}. `;
    doc.text(num + s.source, leftX, ly);
    ly += 12;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(s.detail, colW);
    doc.text(lines, leftX, ly);
    ly += lines.length * 11 + 4;
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.text(new Date(s.timestamp).toUTCString(), leftX, ly);
    ly += 14;
    doc.setFontSize(9);
  });
  inc.recommendedActions.forEach((a) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(`•  ${a}`, colW);
    doc.text(lines, rightX, ry);
    ry += lines.length * 11 + 6;
  });
  y = Math.max(ly, ry) + 16;

  // Historical precedent
  sectionTitle(doc, "HISTORICAL PRECEDENT", margin, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(inc.historical.title, margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Flagged: ${inc.historical.flaggedDate}  ·  Public: ${inc.historical.publicDate}  ·  Lead time: ${inc.historical.leadTimeDays} days earlier`,
    margin,
    y,
  );
  y += 24;

  // Decision trace
  sectionTitle(doc, "DECISION TRACE — SYSTEM LOG", margin, y);
  y += 14;
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  inc.decisionTrace.forEach((l) => {
    const line = `[${l.timestamp}] eval → candidate="${l.candidate}" verdict=${l.verdict} reason="${l.reason}"`;
    const lines = doc.splitTextToSize(line, W - margin * 2);
    doc.setTextColor(l.verdict === "SELECTED" ? 0 : 120, l.verdict === "SELECTED" ? 100 : 0, 0);
    doc.text(lines, margin, y);
    y += lines.length * 10 + 2;
  });
  y += 12;

  // Counterfactual
  sectionTitle(doc, `WHY NOT "${inc.counterfactual.alternativeName}"?`, margin, y);
  y += 16;
  // table header
  const cols = ["METRIC", "RECOMMENDED", "ALTERNATIVE", "Δ"];
  const colXs = [margin, margin + 110, margin + 110 + 150, margin + 110 + 150 + 150];
  doc.setFillColor(220, 240, 245);
  doc.rect(margin, y - 10, W - margin * 2, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  cols.forEach((c, i) => doc.text(c, colXs[i], y + 2));
  y += 18;
  doc.setFont("helvetica", "normal");
  inc.counterfactual.rows.forEach((r) => {
    doc.text(r.metric, colXs[0], y);
    doc.setTextColor(0, 120, 160);
    doc.text(r.recommended, colXs[1], y);
    doc.setTextColor(100, 100, 100);
    doc.text(r.alternative, colXs[2], y);
    doc.setTextColor(0, 140, 60);
    doc.text(r.delta, colXs[3], y);
    doc.setTextColor(20, 20, 20);
    y += 14;
  });
  y += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const expLines = doc.splitTextToSize(inc.counterfactual.explanation, W - margin * 2);
  doc.text(expLines, margin, y);
  y += expLines.length * 11 + 16;

  // GoI context
  sectionTitle(doc, "GOVERNMENT OF INDIA CONTEXT", margin, y);
  y += 16;
  doc.setFontSize(9);
  inc.goiContext.forEach((g) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(g.label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const vlines = doc.splitTextToSize(g.value, W - margin * 2 - 140);
    doc.text(vlines, margin + 140, y);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(g.source, margin, y + 12);
    doc.setFontSize(9);
    y += Math.max(vlines.length * 11 + 4, 22);
  });

  // Footer
  doc.setFillColor(7, 17, 26);
  doc.rect(0, doc.internal.pageSize.getHeight() - 30, W, 30, "F");
  doc.setTextColor(120, 180, 200);
  doc.setFontSize(8);
  doc.text("EnergyResilience AI · Government of India · Tier 3 — CONFIDENTIAL", margin, doc.internal.pageSize.getHeight() - 12);

  const filename = `incident-report-${slug(inc.location)}-${todayStamp()}.pdf`;
  doc.save(filename);
}

function sectionTitle(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFillColor(34, 211, 238);
  doc.rect(x, y - 9, 3, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 90, 110);
  doc.text(text, x + 8, y);
}
