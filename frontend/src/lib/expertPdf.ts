import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { formatPlannerCurrency } from './marketContext';
import type { ExpertDashboardInsights } from './expertInsights';
import type { ExpertCapitalStructureInsights } from './expertCapitalStructure';
import type { ExpertValidationResult } from './plannerApi';
import type { ExpertFormState } from './expertPlanner';

type RGB = [number, number, number];

const COLORS = {
  dark: [13, 27, 42] as RGB,
  primary: [26, 122, 60] as RGB,
  slate: [100, 116, 139] as RGB,
  border: [229, 231, 235] as RGB,
  neutralFill: [249, 250, 251] as RGB,
  greenFill: [240, 253, 244] as RGB,
  amberFill: [255, 251, 235] as RGB,
  redFill: [254, 242, 242] as RGB,
  white: [255, 255, 255] as RGB,
} as const;

const PAGE = {
  width: 210,
  height: 297,
  marginX: 14,
  marginY: 16,
  contentWidth: 182,
} as const;

function setFill(doc: jsPDF, color: RGB) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setDraw(doc: jsPDF, color: RGB) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function setText(doc: jsPDF, color: RGB) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function drawRoundedCard(doc: jsPDF, x: number, y: number, width: number, height: number, fill: RGB, border: RGB) {
  setFill(doc, fill);
  setDraw(doc, border);
  doc.roundedRect(x, y, width, height, 5, 5, 'FD');
}

function ensureSpace(doc: jsPDF, y: number, neededHeight: number): number {
  if (y + neededHeight <= PAGE.height - PAGE.marginY) {
    return y;
  }

  doc.addPage();
  return PAGE.marginY;
}

function addHeader(doc: jsPDF, caseName: string, subtitle: string, chips: string[]): number {
  const x = PAGE.marginX;
  const y = PAGE.marginY;
  drawRoundedCard(doc, x, y, PAGE.contentWidth, 28, COLORS.dark, COLORS.dark);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  setText(doc, COLORS.white);
  doc.text(caseName, x + 5, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(subtitle, x + 5, y + 15);

  let chipX = x + 5;
  chips.forEach((chip) => {
    const width = doc.getTextWidth(chip) + 8;
    setFill(doc, [28, 46, 66]);
    doc.roundedRect(chipX, y + 18, width, 6, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, [210, 244, 221]);
    doc.text(chip, chipX + 4, y + 22.2);
    chipX += width + 2;
  });

  return y + 34;
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return `${(value * 100).toFixed(2)}%`;
}

function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return `${value >= 0 ? '+' : '-'}${Math.abs(value * 100).toFixed(2)}%`;
}

function drawTextCard(
  doc: jsPDF,
  title: string,
  lines: string[],
  startY: number,
  fill: RGB = COLORS.white,
  border: RGB = COLORS.border,
): number {
  const lineHeight = 5;
  let cardHeight = 16;
  const wrappedGroups = lines.map((line) => doc.splitTextToSize(line, PAGE.contentWidth - 10));
  wrappedGroups.forEach((group) => {
    cardHeight += Math.max(group.length, 1) * lineHeight;
  });
  cardHeight += 4;

  const y = ensureSpace(doc, startY, cardHeight + 4);
  drawRoundedCard(doc, PAGE.marginX, y, PAGE.contentWidth, cardHeight, fill, border);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setText(doc, COLORS.dark);
  doc.text(title, PAGE.marginX + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  setText(doc, COLORS.slate);
  let lineY = y + 14;
  wrappedGroups.forEach((group) => {
    doc.text(group, PAGE.marginX + 5, lineY);
    lineY += Math.max(group.length, 1) * lineHeight;
  });

  return y + cardHeight + 4;
}

function drawMetricGrid(
  doc: jsPDF,
  title: string,
  helper: string,
  metrics: Array<{ label: string; value: string }>,
  startY: number,
): number {
  const y = ensureSpace(doc, startY, 48);
  drawRoundedCard(doc, PAGE.marginX, y, PAGE.contentWidth, 42, COLORS.white, COLORS.border);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setText(doc, COLORS.dark);
  doc.text(title, PAGE.marginX + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setText(doc, COLORS.slate);
  doc.text(doc.splitTextToSize(helper, PAGE.contentWidth - 10), PAGE.marginX + 5, y + 14);

  const boxY = y + 20;
  const gap = 3;
  const boxWidth = (PAGE.contentWidth - 10 - (gap * (metrics.length - 1))) / metrics.length;
  metrics.forEach((metric, index) => {
    const boxX = PAGE.marginX + 5 + (index * (boxWidth + gap));
    drawRoundedCard(doc, boxX, boxY, boxWidth, 16, COLORS.neutralFill, COLORS.border);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, COLORS.slate);
    doc.text(doc.splitTextToSize(metric.label.toUpperCase(), boxWidth - 4), boxX + 2, boxY + 4.5);
    doc.setFontSize(12);
    setText(doc, COLORS.dark);
    doc.text(metric.value, boxX + 2, boxY + 11);
  });

  return y + 48;
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setText(doc, COLORS.slate);
    doc.text('Generated by VunaMentor Expert Mode', PAGE.width / 2, PAGE.height - 10, { align: 'center' });
  }
}

export function getExpertPDFFileName(caseName: string): string {
  return `Vuna_Expert_${caseName.substring(0, 24).replace(/\s+/g, '_')}.pdf`;
}

export function generateExpertPDF(options: {
  form: ExpertFormState;
  result: ExpertValidationResult;
  currencyCode: string;
  dashboardInsights: ExpertDashboardInsights;
  capitalStructureInsights: ExpertCapitalStructureInsights | null;
}) {
  const { form, result, currencyCode, dashboardInsights, capitalStructureInsights } = options;
  const doc = new jsPDF();

  let y = addHeader(
    doc,
    form.caseName || 'Expert Case',
    `${new Date().toLocaleDateString()} • ${form.industry || 'General small business'} • Backend validated`,
    ['Expert report', result.engine, result.wacc !== null ? 'WACC path' : 'Direct hurdle'],
  );

  y = drawMetricGrid(
    doc,
    'Decision Headline',
    dashboardInsights.headlineMessage,
    [
      { label: dashboardInsights.headlineLabel, value: formatSignedPercent(dashboardInsights.headlineValue) },
      { label: 'NPV', value: result.npv === null ? 'N/A' : formatPlannerCurrency(result.npv, currencyCode) },
      { label: 'IRR', value: formatPercent(result.irr) },
      { label: 'Discount rate', value: result.discount_rate_percent === null ? 'N/A' : `${result.discount_rate_percent.toFixed(2)}%` },
    ],
    y,
  );

  y = drawTextCard(
    doc,
    'Hurdle Context',
    [dashboardInsights.hurdleMessage, dashboardInsights.regionalContextMessage],
    y,
    COLORS.greenFill,
    [187, 247, 208],
  );

  y = drawMetricGrid(
    doc,
    'Valuation Summary',
    dashboardInsights.dcfMessage,
    [
      { label: 'Intrinsic value', value: dashboardInsights.dcfIntrinsicValue === null ? 'N/A' : formatPlannerCurrency(dashboardInsights.dcfIntrinsicValue, currencyCode) },
      { label: 'Terminal value', value: formatPlannerCurrency(result.terminal_value, currencyCode) },
      { label: 'WACC', value: formatPercent(result.wacc) },
      { label: 'ROIC', value: formatPercent(result.roic) },
    ],
    y,
  );

  if (dashboardInsights.revenueMultipleMessage || dashboardInsights.valuationBridgeMessage || dashboardInsights.terminalDependencyMessage) {
    y = drawTextCard(
      doc,
      'Valuation Interpretation',
      [
        dashboardInsights.revenueMultipleMessage || 'No annual revenue was entered, so the market-multiple comparison was skipped.',
        dashboardInsights.valuationBridgeMessage || 'The DCF value should be treated as the primary valuation signal here.',
        dashboardInsights.terminalDependencyMessage || 'Terminal value was not a dominant issue in this case.',
      ],
      y,
      COLORS.amberFill,
      [245, 158, 11],
    );
  }

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'This Case', 'Africa & Middle East Avg']],
    body: dashboardInsights.benchmarkRows.map((row) => [
      row.metric,
      formatPercent(row.thisBusiness),
      formatPercent(row.regionalAverage),
    ]),
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      lineColor: COLORS.border,
      lineWidth: 0.1,
      textColor: COLORS.dark,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: COLORS.neutralFill,
    },
    margin: { left: PAGE.marginX, right: PAGE.marginX },
  });
  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;

  y = drawTextCard(
    doc,
    'Assumptions',
    dashboardInsights.assumptions.map((entry) => `${entry.label}: ${entry.value}${entry.helper ? ` — ${entry.helper}` : ''}`),
    y,
  );

  if (capitalStructureInsights) {
    y = drawMetricGrid(
      doc,
      'Capital Structure',
      capitalStructureInsights.verdictMessage,
      [
        { label: 'Debt share', value: `${(capitalStructureInsights.currentDebtShare * 100).toFixed(0)}%` },
        { label: 'Coverage', value: capitalStructureInsights.currentCoverageRatio === null ? 'N/A' : `${capitalStructureInsights.currentCoverageRatio.toFixed(2)}x` },
        { label: 'Rating', value: capitalStructureInsights.currentRating },
        { label: 'Lowest-WACC zone', value: `${(capitalStructureInsights.optimalDebtShare * 100).toFixed(0)}% debt` },
      ],
      y,
    );

    y = drawTextCard(
      doc,
      'Capital Structure Interpretation',
      [
        capitalStructureInsights.counterintuitiveLesson,
        `Current WACC: ${capitalStructureInsights.currentWacc === null ? 'N/A' : `${(capitalStructureInsights.currentWacc * 100).toFixed(2)}%`}. Lowest modeled WACC: ${capitalStructureInsights.optimalWacc === null ? 'N/A' : `${(capitalStructureInsights.optimalWacc * 100).toFixed(2)}%`}.`,
      ],
      y,
      COLORS.neutralFill,
      COLORS.border,
    );
  }

  addFooter(doc);
  doc.save(getExpertPDFFileName(form.caseName || 'Expert_Case'));
}
