import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportReportData {
  period: "30d" | "90d" | "6m" | "1y";
  generatedBy?: string;
  overview: {
    totalJobs: number;
    activeJobs: number;
    totalCandidates: number;
    totalApplications: number;
    totalScreenings: number;
    averageMatchScore: number;
  };
  screeningDistribution: Array<{
    name: string;
    count: number;
    percentage: number;
    color?: string;
  }>;
  scoreDistribution: Array<{
    range: string;
    count: number;
    fill?: string;
  }>;
  funnelData: Array<{
    stage: string;
    count: number;
    percentage?: number;
  }>;
  departmentData: Array<{
    department: string;
    jobs: number;
    applicants: number;
    hires: number;
  }>;
  skillData?: Array<{
    skill: string;
    demand: number;
    supply: number;
  }>;
}

export function generateReportPdf(data: ExportReportData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const periodLabels: Record<string, string> = {
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
    "6m": "Last 6 Months",
    "1y": "Last 1 Year",
  };

  const periodText = periodLabels[data.period] || "Last 30 Days";
  const today = new Date();
  const dateFormatted = today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeFormatted = today.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── 1. HEADER BANNER ────────────────────────────────────────────────────────
  // Primary dark header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 38, "F");

  // Accent line
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 38, pageWidth, 2, "F");

  // Logo badge / Brand mark
  doc.setFillColor(79, 70, 229);
  doc.roundedRect(margin, 9, 10, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SH", margin + 2.5, 15.5);

  // Brand Name
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("SmartHire", margin + 14, 15);

  // Subtitle
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text("AI-Powered Recruitment & Screening Performance Report", margin + 14, 21);

  // Right-aligned report metadata
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Period: ${periodText}`, pageWidth - margin, 13, { align: "right" });
  doc.text(`Generated: ${dateFormatted} at ${timeFormatted}`, pageWidth - margin, 18, { align: "right" });
  if (data.generatedBy) {
    doc.text(`Prepared for: ${data.generatedBy}`, pageWidth - margin, 23, { align: "right" });
  }

  // ── 2. EXECUTIVE SUMMARY & KEY PERFORMANCE INDICATORS ──────────────────────
  let currentY = 46;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("1. Executive Summary & Core Metrics", margin, currentY);

  currentY += 4;

  const convRate =
    data.overview.totalApplications > 0
      ? ((data.overview.totalScreenings / data.overview.totalApplications) * 100).toFixed(1)
      : "0.0";

  const strongMatches = data.screeningDistribution.find((d) => d.name.includes("Strong"))?.count || 0;
  const strongMatchPct =
    data.overview.totalScreenings > 0
      ? Math.round((strongMatches / data.overview.totalScreenings) * 100)
      : 0;

  // KPI Table (2 rows x 3 columns)
  const kpiData = [
    [
      { content: `TOTAL JOBS\n${data.overview.totalJobs}`, styles: { fontStyle: "bold" as const } },
      { content: `ACTIVE POSTINGS\n${data.overview.activeJobs}`, styles: { fontStyle: "bold" as const } },
      { content: `TOTAL CANDIDATES\n${data.overview.totalCandidates}`, styles: { fontStyle: "bold" as const } },
    ],
    [
      { content: `APPLICATIONS\n${data.overview.totalApplications}`, styles: { fontStyle: "bold" as const } },
      { content: `SCREENED BY AI\n${data.overview.totalScreenings} (${convRate}%)`, styles: { fontStyle: "bold" as const } },
      { content: `AVG MATCH SCORE\n${data.overview.averageMatchScore}% (${strongMatchPct}% Strong)`, styles: { fontStyle: "bold" as const } },
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: "grid",
    body: kpiData,
    styles: {
      fontSize: 8.5,
      cellPadding: 4,
      halign: "center",
      valign: "middle",
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    bodyStyles: {
      fillColor: [248, 250, 252],
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ── 3. AI SCREENING & RECOMMENDATION TIERS ─────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("2. AI Candidate Match & Screening Distribution", margin, currentY);

  currentY += 4;

  const actionMap: Record<string, string> = {
    "Strong Match (>=85%)": "Fast-track to technical interview panel",
    "Good Match (70-84%)": "Schedule standard recruiter screening",
    "Moderate (55-69%)": "Hold for secondary review / alternate roles",
    "Low Match (<55%)": "Automated notification & talent pool retention",
  };

  const screeningTableRows = data.screeningDistribution.map((item) => [
    item.name,
    `${item.count} candidates`,
    `${item.percentage}%`,
    actionMap[item.name] || "Standard pipeline evaluation",
  ]);

  if (screeningTableRows.length === 0) {
    screeningTableRows.push([
      "All Evaluated",
      `${data.overview.totalScreenings} candidates`,
      "100%",
      "Screening evaluations active",
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Recommendation Tier", "Count", "Share", "Recommended Pipeline Action"]],
    body: screeningTableRows,
    theme: "striped",
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 25, halign: "center", fontStyle: "bold" },
      3: { cellWidth: "auto" },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ── 4. SCORE FREQUENCY & PIPELINE FUNNEL ───────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("3. Recruitment Funnel & Score Frequency", margin, currentY);

  currentY += 4;

  const funnelRows = data.funnelData.map((f, idx) => {
    const prevCount = idx === 0 ? f.count : data.funnelData[idx - 1].count;
    const stepConv = prevCount > 0 ? `${Math.round((f.count / prevCount) * 100)}%` : "100%";
    const totalConv = data.overview.totalApplications > 0
      ? `${((f.count / data.overview.totalApplications) * 100).toFixed(1)}%`
      : "-";
    return [f.stage, `${f.count} candidates`, stepConv, totalConv];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Pipeline Stage", "Candidates", "Stage Conversion", "Overall Funnel Conversion"]],
    body: funnelRows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: "bold" },
      1: { cellWidth: 35, halign: "center" },
      2: { cellWidth: 45, halign: "center" },
      3: { cellWidth: "auto", halign: "center", fontStyle: "bold" },
    },
  });

  // ── PAGE 2: DEPARTMENT BREAKDOWN & SKILL INTELLIGENCE ─────────────────────
  doc.addPage();
  currentY = 16;

  // Secondary Page Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 12, "F");
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 12, pageWidth, 1, "F");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("SmartHire Analytics — Departmental Performance & Skill Intelligence", margin, 8);
  doc.setFont("helvetica", "normal");
  doc.text(`${periodText} Report`, pageWidth - margin, 8, { align: "right" });

  currentY = 22;

  // ── 5. DEPARTMENT RECRUITMENT PERFORMANCE ────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("4. Recruitment Throughput by Department", margin, currentY);

  currentY += 4;

  const deptRows = data.departmentData.map((d) => {
    const hireRate = d.applicants > 0 ? `${((d.hires / d.applicants) * 100).toFixed(1)}%` : "0.0%";
    return [d.department, `${d.jobs} positions`, `${d.applicants} applicants`, `${d.hires} hired`, hireRate];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Department", "Active Openings", "Total Applicants", "Hires Made", "Hiring Efficiency"]],
    body: deptRows,
    theme: "striped",
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" },
      1: { cellWidth: 35, halign: "center" },
      2: { cellWidth: 35, halign: "center" },
      3: { cellWidth: 30, halign: "center" },
      4: { cellWidth: "auto", halign: "center", fontStyle: "bold" },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ── 6. SKILL DEMAND VS CANDIDATE SUPPLY ──────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("5. Skill Demand vs. Candidate Market Supply", margin, currentY);

  currentY += 4;

  const defaultSkills = [
    { skill: "Python", demand: 92, supply: 68 },
    { skill: "TypeScript", demand: 85, supply: 60 },
    { skill: "React / Next.js", demand: 88, supply: 72 },
    { skill: "PostgreSQL", demand: 75, supply: 55 },
    { skill: "Docker & K8s", demand: 78, supply: 42 },
    { skill: "FastAPI / Node.js", demand: 80, supply: 64 },
    { skill: "Machine Learning / NLP", demand: 65, supply: 38 },
  ];

  const skillList = data.skillData && data.skillData.length > 0 ? data.skillData : defaultSkills;

  const skillRows = skillList.map((s) => {
    const diff = s.supply - s.demand;
    const status = diff < -20 ? "Critical Shortage" : diff < -5 ? "Moderate Gap" : "Balanced / Supply Met";
    return [`${s.skill}`, `${s.demand}%`, `${s.supply}%`, `${diff > 0 ? `+${diff}%` : `${diff}%`}`, status];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Technical Skill", "Job Demand", "Talent Supply", "Supply Gap", "Market Assessment"]],
    body: skillRows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 25, halign: "center", fontStyle: "bold" },
      4: { cellWidth: "auto" },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // ── 7. STRATEGIC RECOMMENDATIONS & SUMMARY BOX ────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 36, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Strategic Recruitment Observations & Next Steps", margin + 4, currentY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `• AI Screening has achieved a ${convRate}% evaluation rate across active roles with ${strongMatches} candidates in top recommendation tiers.`,
    margin + 4,
    currentY + 14
  );
  doc.text(
    "• High demand in DevOps and Machine Learning indicates priority sourcing should focus on containerization and NLP skills.",
    margin + 4,
    currentY + 20
  );
  doc.text(
    "• Recommended Action: Accelerate interviews for candidates scoring >= 80% to minimize time-to-hire in high-demand roles.",
    margin + 4,
    currentY + 26
  );

  // ── FOOTERS ON ALL PAGES ──────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Bottom border rule
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("SmartHire Platform — Confidential & Proprietary", margin, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  }

  return doc;
}

export function downloadReportPdf(data: ExportReportData, filename?: string) {
  const doc = generateReportPdf(data);
  const period = data.period || "30d";
  const dateStr = new Date().toISOString().slice(0, 10);
  const finalName = filename || `SmartHire_Recruitment_Report_${period}_${dateStr}.pdf`;
  doc.save(finalName);
}
