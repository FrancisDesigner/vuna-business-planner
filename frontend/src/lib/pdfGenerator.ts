import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WizardState, CalculationResult } from '../types';
import { BusinessType, BUSINESS_TYPE_CONFIG } from './config';
import { DEFAULT_PLANNER_CURRENCY_CODE, formatPlannerCurrency } from './marketContext';
import { formatPaybackMonths, formatRecoveryTime } from './recoveryTime';

type RGB = [number, number, number];

const COLORS = {
  dark: [13, 27, 42] as RGB,
  primary: [26, 122, 60] as RGB,
  slate: [100, 116, 139] as RGB,
  border: [229, 231, 235] as RGB,
  neutralFill: [249, 250, 251] as RGB,
  greenFill: [240, 253, 244] as RGB,
  amberFill: [255, 251, 235] as RGB,
  amberBorder: [245, 158, 11] as RGB,
  white: [255, 255, 255] as RGB,
};

const PAGE = {
  width: 210,
  height: 297,
  marginX: 14,
  marginY: 16,
  contentWidth: 182,
};

interface MetricBox {
  label: string;
  value: string;
  helper: string;
  accent?: 'neutral' | 'green';
}

type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY: number } };

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

function addPageHeader(doc: jsPDF, title: string, subtitle: string, chips: string[]): number {
  const x = PAGE.marginX;
  const y = PAGE.marginY;
  drawRoundedCard(doc, x, y, PAGE.contentWidth, 28, COLORS.dark, COLORS.dark);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  setText(doc, COLORS.white);
  doc.text(title, x + 5, y + 9);

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

function ensureSpace(doc: jsPDF, y: number, neededHeight: number): number {
  if (y + neededHeight <= PAGE.height - PAGE.marginY) {
    return y;
  }

  doc.addPage();
  return PAGE.marginY;
}

function drawMetricGrid(doc: jsPDF, title: string, helper: string, metrics: MetricBox[], startY: number): number {
  const y = ensureSpace(doc, startY, 48);
  drawRoundedCard(doc, PAGE.marginX, y, PAGE.contentWidth, 42, COLORS.white, COLORS.border);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setText(doc, COLORS.dark);
  doc.text(title, PAGE.marginX + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setText(doc, COLORS.slate);
  const helperLines = doc.splitTextToSize(helper, PAGE.contentWidth - 10);
  doc.text(helperLines, PAGE.marginX + 5, y + 14);

  const boxY = y + 20;
  const gap = 3;
  const boxWidth = (PAGE.contentWidth - 10 - (gap * (metrics.length - 1))) / metrics.length;
  metrics.forEach((metric, index) => {
    const boxX = PAGE.marginX + 5 + (index * (boxWidth + gap));
    drawRoundedCard(
      doc,
      boxX,
      boxY,
      boxWidth,
      16,
      metric.accent === 'green' ? COLORS.greenFill : COLORS.neutralFill,
      metric.accent === 'green' ? [187, 247, 208] : COLORS.border,
    );
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, metric.accent === 'green' ? COLORS.primary : COLORS.slate);
    const labelLines = doc.splitTextToSize(metric.label.toUpperCase(), boxWidth - 4);
    doc.text(labelLines, boxX + 2, boxY + 4.5);
    doc.setFontSize(12);
    setText(doc, metric.accent === 'green' ? COLORS.primary : COLORS.dark);
    doc.text(metric.value, boxX + 2, boxY + 11);
  });

  return y + 48;
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
  const textHeight = Math.max(16, lines.length * lineHeight);
  const cardHeight = textHeight + 16;
  const y = ensureSpace(doc, startY, cardHeight + 4);
  drawRoundedCard(doc, PAGE.marginX, y, PAGE.contentWidth, cardHeight, fill, border);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setText(doc, fill === COLORS.amberFill ? [146, 64, 14] : COLORS.dark);
  doc.text(title, PAGE.marginX + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  setText(doc, fill === COLORS.amberFill ? [120, 53, 15] : COLORS.slate);
  let lineY = y + 14;
  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, PAGE.contentWidth - 10);
    doc.text(wrapped, PAGE.marginX + 5, lineY);
    lineY += wrapped.length * lineHeight;
  });

  return y + cardHeight + 4;
}

function drawTwoColumnTable(
  doc: jsPDF,
  startY: number,
  head: [string, string][],
  body: string[][],
) {
  autoTable(doc, {
    startY,
    head,
    body,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      lineColor: COLORS.border,
      lineWidth: 0.1,
      textColor: COLORS.dark,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
    },
    tableWidth: PAGE.contentWidth,
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 62, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: COLORS.neutralFill,
    },
    margin: { left: PAGE.marginX, right: PAGE.marginX },
  });
}

function getLastTableY(doc: jsPDF, fallback: number): number {
  return (doc as AutoTableDoc).lastAutoTable?.finalY ?? fallback;
}

function addReportChrome(doc: jsPDF, businessLabel: string) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);

    if (page > 1) {
      setFill(doc, COLORS.dark);
      doc.rect(0, 0, PAGE.width, 12, 'F');
      setFill(doc, COLORS.primary);
      doc.rect(0, 0, 4, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      setText(doc, COLORS.white);
      doc.text('VunaMentor', PAGE.marginX, 7.8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setText(doc, [210, 244, 221]);
      doc.text(`Business Plan Report | Simple Mode | ${businessLabel}`, PAGE.marginX + 24, 7.8);
      setText(doc, COLORS.white);
      doc.text(`Page ${page}`, PAGE.width - PAGE.marginX, 7.8, { align: 'right' });
    }

    setDraw(doc, COLORS.border);
    doc.line(PAGE.marginX, PAGE.height - 15, PAGE.width - PAGE.marginX, PAGE.height - 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setText(doc, COLORS.slate);
    doc.text('Generated by VunaMentor - plan.vunabooks.com', PAGE.marginX, PAGE.height - 9);
    doc.text('Confidential - for business owner use only', PAGE.width - PAGE.marginX, PAGE.height - 9, { align: 'right' });
  }
}

function drawCover(
  doc: jsPDF,
  businessName: string,
  location: string,
  businessLabel: string,
  currencyCode: string,
): number {
  setFill(doc, COLORS.dark);
  doc.roundedRect(PAGE.marginX, PAGE.marginY, PAGE.contentWidth, 74, 6, 6, 'F');
  setFill(doc, COLORS.primary);
  doc.rect(PAGE.marginX, PAGE.marginY, 5, 74, 'F');
  setFill(doc, [15, 74, 45]);
  doc.circle(PAGE.width - 22, PAGE.marginY + 16, 28, 'F');
  doc.circle(PAGE.width - 7, PAGE.marginY + 57, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, [168, 213, 188]);
  doc.text('VunaMentor / VunaBooks', PAGE.marginX + 12, PAGE.marginY + 13);

  doc.setFontSize(26);
  setText(doc, COLORS.white);
  const titleLines = doc.splitTextToSize(`Your ${businessLabel} Business Plan`, 112);
  doc.text(titleLines, PAGE.marginX + 12, PAGE.marginY + 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  setText(doc, [212, 237, 224]);
  doc.text(
    ['A complete, plain-language report of your business numbers,', 'what they mean, and what to do next.'],
    PAGE.marginX + 12,
    PAGE.marginY + 52,
  );

  const metaY = PAGE.marginY + 61;
  const metaW = (PAGE.contentWidth - 24) / 4;
  [
    ['MODE', 'Simple Mode'],
    ['BUSINESS TYPE', businessLabel],
    ['LOCATION', location],
    ['CURRENCY', currencyCode],
  ].forEach(([label, value], index) => {
    const x = PAGE.marginX + 12 + (metaW * index);
    setFill(doc, [15, 74, 45]);
    setDraw(doc, COLORS.primary);
    doc.roundedRect(x, metaY, metaW - 3, 11, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    setText(doc, [168, 213, 188]);
    doc.text(label, x + 2, metaY + 4);
    doc.setFontSize(7.8);
    setText(doc, COLORS.white);
    doc.text(doc.splitTextToSize(value, metaW - 8), x + 2, metaY + 8);
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, COLORS.primary);
  doc.text('EXECUTIVE SUMMARY', PAGE.marginX, PAGE.marginY + 86);
  doc.setFontSize(16);
  setText(doc, COLORS.dark);
  doc.text('Your Business at a Glance', PAGE.marginX, PAGE.marginY + 94);
  setFill(doc, COLORS.primary);
  doc.rect(PAGE.marginX, PAGE.marginY + 98, PAGE.contentWidth, 1.8, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  setText(doc, COLORS.dark);
  const intro = doc.splitTextToSize(
    `This report is your personal business guide. It was created from the numbers you entered into VunaMentor. Everything here is about ${businessName} - what you sell, how much you earn, and what to watch out for.`,
    PAGE.contentWidth,
  );
  doc.text(intro, PAGE.marginX, PAGE.marginY + 110);

  return PAGE.marginY + 112 + (intro.length * 5);
}

function drawSectionTitle(doc: jsPDF, label: string, title: string): number {
  doc.addPage();
  const y = 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, COLORS.primary);
  doc.text(label.toUpperCase(), PAGE.marginX, y);
  doc.setFontSize(16);
  setText(doc, COLORS.dark);
  doc.text(title, PAGE.marginX, y + 8);
  setFill(doc, COLORS.primary);
  doc.rect(PAGE.marginX, y + 12, PAGE.contentWidth, 1.8, 'F');
  return y + 20;
}

function drawParagraph(doc: jsPDF, text: string, y: number, options: { size?: number; color?: RGB; width?: number } = {}): number {
  const width = options.width ?? PAGE.contentWidth;
  const size = options.size ?? 9.8;
  y = ensureSpace(doc, y, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  setText(doc, options.color ?? COLORS.dark);
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, PAGE.marginX, y);
  return y + (lines.length * (size * 0.48)) + 4;
}

function drawCallout(
  doc: jsPDF,
  title: string,
  body: string,
  y: number,
  tone: 'green' | 'amber' = 'amber',
): number {
  const fill = tone === 'green' ? COLORS.greenFill : COLORS.amberFill;
  const border = tone === 'green' ? COLORS.primary : COLORS.amberBorder;
  const titleLines = doc.splitTextToSize(title, PAGE.contentWidth - 18);
  const bodyLines = doc.splitTextToSize(body, PAGE.contentWidth - 18);
  const height = 14 + (titleLines.length * 4.2) + (bodyLines.length * 4.4);
  y = ensureSpace(doc, y, height + 4);
  drawRoundedCard(doc, PAGE.marginX, y, PAGE.contentWidth, height, fill, border);
  setFill(doc, border);
  doc.rect(PAGE.marginX, y, 3, height, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(doc, COLORS.dark);
  doc.text(titleLines, PAGE.marginX + 7, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.3);
  setText(doc, COLORS.dark);
  doc.text(bodyLines, PAGE.marginX + 7, y + 14 + (titleLines.length * 4.2));
  return y + height + 6;
}

function drawBarComparison(
  doc: jsPDF,
  y: number,
  rows: Array<{ label: string; buy: number; sell: number }>,
  formatCurrency: (value: number) => string,
): number {
  if (rows.length === 0) {
    return y;
  }

  const height = Math.max(34, rows.length * 13 + 10);
  y = ensureSpace(doc, y, height + 4);
  const maxSell = Math.max(...rows.map((row) => row.sell), 1);
  const labelWidth = 34;
  const barWidth = PAGE.contentWidth - labelWidth - 46;

  rows.slice(0, 5).forEach((row, index) => {
    const rowY = y + 7 + (index * 13);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText(doc, COLORS.dark);
    doc.text(doc.splitTextToSize(row.label || `Item ${index + 1}`, labelWidth - 2), PAGE.marginX, rowY);

    setFill(doc, COLORS.greenFill);
    doc.roundedRect(PAGE.marginX + labelWidth, rowY - 4, (row.sell / maxSell) * barWidth, 5, 2, 2, 'F');
    setFill(doc, COLORS.primary);
    doc.roundedRect(PAGE.marginX + labelWidth, rowY - 4, (row.buy / maxSell) * barWidth, 5, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setText(doc, COLORS.slate);
    doc.text(`Buy ${formatCurrency(row.buy)} | Sell ${formatCurrency(row.sell)}`, PAGE.marginX + labelWidth + barWidth + 3, rowY);
  });

  return y + height + 4;
}

function drawWaterfall(
  doc: jsPDF,
  y: number,
  results: CalculationResult,
  formatCurrency: (value: number) => string,
): number {
  const rows = [
    { label: 'Monthly sales', value: Math.max(results.monthlyRevenue, 0), color: COLORS.primary },
    { label: 'Restock cost', value: Math.max(results.monthlyRestockCost, 0), color: [192, 57, 43] as RGB },
    { label: 'Running costs', value: Math.max(results.totalMonthlyFixedCosts, 0), color: COLORS.amberBorder },
    { label: 'Net profit', value: Math.max(results.monthlyProfit, 0), color: COLORS.dark },
  ];
  const height = 56;
  y = ensureSpace(doc, y, height + 8);
  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  const chartX = PAGE.marginX + 18;
  const chartW = PAGE.contentWidth - 22;
  const chartH = 38;
  const barW = chartW / (rows.length * 1.7);
  const gap = (chartW - (barW * rows.length)) / (rows.length + 1);

  setDraw(doc, COLORS.border);
  [0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const lineY = y + chartH - (chartH * ratio);
    doc.line(chartX, lineY, chartX + chartW, lineY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    setText(doc, COLORS.slate);
    doc.text(formatCurrency(maxValue * ratio), PAGE.marginX, lineY + 1.5);
  });

  rows.forEach((row, index) => {
    const x = chartX + gap + (index * (barW + gap));
    const barH = Math.max((row.value / maxValue) * chartH, row.value > 0 ? 2 : 0);
    setFill(doc, row.color);
    doc.roundedRect(x, y + chartH - barH, barW, barH, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setText(doc, COLORS.dark);
    doc.text(formatCurrency(row.value), x + (barW / 2), y + chartH - barH - 2, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(doc, COLORS.slate);
    doc.text(doc.splitTextToSize(row.label, barW + 7), x + (barW / 2), y + chartH + 6, { align: 'center' });
  });

  return y + height + 4;
}

function drawRecoveryTimeline(
  doc: jsPDF,
  y: number,
  months: number,
): number {
  y = ensureSpace(doc, y, 28);
  const trackY = y + 11;
  const trackW = PAGE.contentWidth;
  setFill(doc, COLORS.border);
  doc.roundedRect(PAGE.marginX, trackY, trackW, 5, 2.5, 2.5, 'F');
  const safeMonths = Number.isFinite(months) ? Math.max(months, 0) : 24;
  const fillW = Math.min(safeMonths / 24, 1) * trackW;
  setFill(doc, COLORS.primary);
  doc.roundedRect(PAGE.marginX, trackY, fillW, 5, 2.5, 2.5, 'F');
  setFill(doc, COLORS.amberBorder);
  doc.circle(PAGE.marginX + fillW, trackY + 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setText(doc, COLORS.slate);
  doc.text('Month 0', PAGE.marginX, trackY + 12);
  doc.text('Month 24', PAGE.marginX + trackW, trackY + 12, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  setText(doc, COLORS.dark);
  doc.text(
    Number.isFinite(months) ? `Recovery point: about ${Math.ceil(months)} months` : 'Recovery point: not yet achievable',
    PAGE.marginX + fillW,
    trackY - 3,
    { align: 'center' },
  );
  return y + 28;
}

export function getPDFFileName(businessName: string): string {
  return `Vuna_Plan_${businessName.substring(0, 20).replace(/\s+/g, '_')}.pdf`;
}

function buildStartupCostRows(
  state: WizardState,
  businessType: BusinessType,
  formatCurrency: (value: number) => string,
) {
  const rows = [
    ...(businessType === 'manufacturing'
      ? []
      : state.step2_buckets.seedCosts
          .filter((item) => item.amount > 0)
          .map((item) => [item.name || 'Startup cost', formatCurrency(item.amount)])),
    ...state.step2_buckets.foundationCosts
      .filter((item) => item.costCategory === 'one-time' && item.amount > 0)
      .map((item) => [`${item.name || 'One-time cost'} (one-time)`, formatCurrency(item.amount)]),
  ];

  return rows.length > 0 ? rows : [['No startup costs entered', formatCurrency(0)]];
}

function buildMonthlyRunningCostRows(state: WizardState, formatCurrency: (value: number) => string) {
  const rows = [
    ...state.step2_buckets.foundationCosts
      .filter((item) => item.costCategory === 'monthly' && item.amount > 0)
      .map((item) => [`${item.name || 'Monthly foundation cost'} (monthly)`, formatCurrency(item.amount)]),
    ...state.step2_buckets.fuelCosts
      .filter((item) => item.amount > 0)
      .map((item) => [item.name || 'Running cost', formatCurrency(item.amount)]),
    ...state.step2_buckets.protectionCosts
      .filter((item) => item.amount > 0)
      .map((item) => [item.name || 'Protection cost', formatCurrency(item.amount)]),
  ];

  return rows.length > 0 ? rows : [['No monthly costs entered', formatCurrency(0)]];
}

function formatStartupRecoveryLabel(totalStartupMoney: number, investmentPaybackMonths: number): string {
  if (totalStartupMoney <= 0) {
    return 'No startup money entered';
  }

  if (!Number.isFinite(investmentPaybackMonths)) {
    return 'Not recoverable yet';
  }

  return formatPaybackMonths(investmentPaybackMonths);
}

function buildStartupRecoveryNarrative(
  totalStartupMoney: number,
  monthlyProfit: number,
  paybackTime: string,
  formatCurrency: (value: number) => string,
): string {
  if (totalStartupMoney <= 0) {
    return 'No startup money was entered, so there is no startup recovery time to calculate yet.';
  }

  if (monthlyProfit <= 0) {
    return 'Not recoverable yet. At the current profit level, the startup money is not yet being recovered. Improve sales, prices, or costs before relying on this business for recovery.';
  }

  return `At ${formatCurrency(monthlyProfit)} monthly profit, it will take about ${paybackTime} to recover ${formatCurrency(totalStartupMoney)}.`;
}

function getOfferSectionTitle(businessType: BusinessType): string {
  if (businessType === 'service') {
    return 'Your Services and What They Earn';
  }

  if (businessType === 'manufacturing') {
    return 'Your Product and What It Earns';
  }

  return 'Your Products and What They Earn';
}

function buildPDFDocument(
  state: WizardState,
  results: CalculationResult,
  businessType: BusinessType = 'manufacturing',
) {
  const doc = new jsPDF();
  const config = BUSINESS_TYPE_CONFIG[businessType];
  const currencyCode = state.currencyCode || DEFAULT_PLANNER_CURRENCY_CODE;
  const formatCurrency = (value: number): string => formatPlannerCurrency(value, currencyCode);
  const businessName = state.step1_entry.activityDescription || 'My Business';
  const location = state.step1_entry.location || state.marketCountryName || 'your area';
  const businessLabel = config.label;
  const unitsLabel = config.unitNamePlural;
  const startupCostRows = buildStartupCostRows(state, businessType, formatCurrency);
  const monthlyRunningCostRows = buildMonthlyRunningCostRows(state, formatCurrency);
  const operatingBreakEvenTime = formatRecoveryTime(results.recoveryDays);
  const paybackTime = formatStartupRecoveryLabel(results.totalInitialInvestment, results.investmentPaybackMonths);
  const startupRecoveryTimelineMonths = results.totalInitialInvestment > 0
    ? results.investmentPaybackMonths
    : Number.POSITIVE_INFINITY;
  const lineItems = results.lineItemBreakdown.length > 0
    ? results.lineItemBreakdown
    : [{
      id: 'primary',
      name: businessName,
      buyPrice: results.weightedAvgVariableCost,
      sellPrice: results.weightedAvgSellingPrice,
      profitPerItem: results.contributionMargin,
      unitsPerWeek: results.totalUnitsPerWeek,
      mixPercent: 1,
      weeklyRevenue: results.weeklyRevenue,
      weeklyCost: results.weeklyCost,
      weeklyProfit: results.weeklyProfit,
      allocatedBreakEvenUnits: results.operatingBreakEvenUnits,
      allocatedBreakEvenRevenue: results.operatingBreakEvenRevenue,
    }];
  const topVolumeItem = [...lineItems].sort((a, b) => b.unitsPerWeek - a.unitsPerWeek)[0];
  const topProfitItem = [...lineItems].sort((a, b) => b.profitPerItem - a.profitPerItem)[0];
  const biggestRunningCost = [...state.step2_buckets.foundationCosts, ...state.step2_buckets.fuelCosts, ...state.step2_buckets.protectionCosts]
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0];

  let y = drawCover(doc, businessName, location, businessLabel, currencyCode);

  y = drawMetricGrid(doc, 'Your numbers today', 'These are the key numbers behind one normal week of sales.', [
    {
      label: `Average profit per ${config.unitNameSingular}`,
      value: formatCurrency(results.contributionMargin),
      helper: '',
      accent: 'green',
    },
    {
      label: 'Monthly net profit',
      value: formatCurrency(results.monthlyProfit),
      helper: '',
      accent: 'green',
    },
    {
      label: 'Safe take-home this month',
      value: formatCurrency(Math.max(results.safeTakeHomeAmount, 0)),
      helper: '',
    },
  ], y);
  y = drawMetricGrid(doc, 'Operating target and recovery', 'These numbers tell you what must happen for the business to stay safe.', [
    {
      label: `Weekly ${unitsLabel} now`,
      value: `${results.totalUnitsPerWeek.toLocaleString()} ${unitsLabel}`,
      helper: '',
    },
    {
      label: 'Monthly sales target',
      value: Number.isFinite(results.operatingBreakEvenUnits)
        ? `${Math.ceil(results.operatingBreakEvenUnits).toLocaleString()} ${unitsLabel}`
        : 'Not possible',
      helper: '',
      accent: 'green',
    },
    {
      label: 'Startup recovery time',
      value: paybackTime,
      helper: '',
    },
  ], y);
  y = drawCallout(
    doc,
    'What this means for you',
    results.monthlyProfit > 0
      ? `${businessName} is making an estimated ${formatCurrency(results.monthlyProfit)} profit per month. The safe take-home amount is ${formatCurrency(results.safeTakeHomeAmount)}. Keep ${formatCurrency(results.safetyBufferAmount)} in the business so you can restock, handle slow days, and protect cash.`
      : `${businessName} is not yet profitable at the numbers entered. You need to review price, cost, or weekly sales before taking money out of the business.`,
    y,
    results.monthlyProfit > 0 ? 'green' : 'amber',
  );

  y = drawSectionTitle(doc, 'Section 1', getOfferSectionTitle(businessType));
  y = drawParagraph(
    doc,
    `This section explains what each ${config.unitNameSingular} earns. The difference between what it costs you and what the customer pays is the money that helps cover running costs and profit.`,
    y,
  );
  if (topVolumeItem && topProfitItem) {
    y = drawParagraph(
      doc,
      `${topVolumeItem.name || 'Your main item'} has the highest weekly volume at ${topVolumeItem.unitsPerWeek.toLocaleString()} ${unitsLabel} per week. ${topProfitItem.name || 'Your strongest item'} has the strongest profit per ${config.unitNameSingular} at ${formatCurrency(topProfitItem.profitPerItem)}.`,
      y,
    );
  }
  autoTable(doc, {
    startY: y,
    head: [['Name', 'Buy/Cost', 'Sell/Charge', `Profit/${config.unitNameSingular}`, `${unitsLabel}/week`, 'Weekly profit']],
    body: lineItems.map((item) => [
      item.name.trim(),
      formatCurrency(item.buyPrice),
      formatCurrency(item.sellPrice),
      formatCurrency(item.profitPerItem),
      item.unitsPerWeek.toLocaleString(),
      formatCurrency(item.weeklyProfit),
    ]),
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: COLORS.border,
      lineWidth: 0.1,
      textColor: COLORS.dark,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
    },
    tableWidth: PAGE.contentWidth,
    columnStyles: {
      0: { cellWidth: 52 },
      1: { cellWidth: 24, halign: 'right' },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: COLORS.neutralFill,
    },
    foot: [[
      'Total / average',
      formatCurrency(results.weightedAvgVariableCost),
      formatCurrency(results.weightedAvgSellingPrice),
      formatCurrency(results.contributionMargin),
      results.totalUnitsPerWeek.toLocaleString(),
      formatCurrency(results.weeklyProfit),
    ]],
    footStyles: {
      fillColor: COLORS.greenFill,
      textColor: COLORS.dark,
      fontStyle: 'bold',
    },
    margin: { left: PAGE.marginX, right: PAGE.marginX },
  });
  y = getLastTableY(doc, y) + 8;
  y = drawParagraph(doc, 'Buying versus selling price - visual comparison', y, { size: 11, color: COLORS.dark });
  y = drawBarComparison(
    doc,
    y,
    lineItems.map((item) => ({ label: item.name || config.unitNameSingular, buy: item.buyPrice, sell: item.sellPrice })),
    formatCurrency,
  );
  y = drawCallout(
    doc,
    `${topProfitItem?.name || 'Your best earner'} deserves attention`,
    topProfitItem
      ? `${topProfitItem.name} earns ${formatCurrency(topProfitItem.profitPerItem)} per ${config.unitNameSingular}. If you can sell more of this without hurting customer demand, total profit can grow faster.`
      : 'The best growth opportunity is usually the item or service with strong profit and steady demand.',
    y,
    'green',
  );

  y = drawSectionTitle(doc, 'Section 2', 'Your Monthly Costs');
  y = drawParagraph(
    doc,
    `${businessLabel} businesses must separate money used to restock or deliver work from money used to keep the business open. Both must be paid before profit is real.`,
    y,
  );
  const tableGap = 6;
  const halfWidth = (PAGE.contentWidth - tableGap) / 2;
  autoTable(doc, {
    startY: y,
    head: [['Monthly running costs', 'Amount']],
    body: [
      ...monthlyRunningCostRows,
      ['Total running costs', formatCurrency(results.totalMonthlyFixedCosts)],
    ],
    theme: 'grid',
    styles: { fontSize: 8.4, cellPadding: 2.4, lineColor: COLORS.border, lineWidth: 0.1 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold' },
    footStyles: { fillColor: COLORS.greenFill, textColor: COLORS.dark, fontStyle: 'bold' },
    tableWidth: halfWidth,
    margin: { left: PAGE.marginX },
    columnStyles: { 0: { cellWidth: halfWidth - 28 }, 1: { cellWidth: 28, halign: 'right' } },
  });
  autoTable(doc, {
    startY: y,
    head: [['Monthly restock/work costs', 'Amount']],
    body: [
      ...lineItems.map((item) => [
        `${item.name || config.unitNameSingular} (${item.unitsPerWeek.toLocaleString()}/wk)`,
        formatCurrency(item.weeklyCost * (52 / 12)),
      ]),
      ['Total restock/work costs', formatCurrency(results.monthlyRestockCost)],
    ],
    theme: 'grid',
    styles: { fontSize: 8.4, cellPadding: 2.4, lineColor: COLORS.border, lineWidth: 0.1 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold' },
    footStyles: { fillColor: COLORS.greenFill, textColor: COLORS.dark, fontStyle: 'bold' },
    tableWidth: halfWidth,
    margin: { left: PAGE.marginX + halfWidth + tableGap },
    columnStyles: { 0: { cellWidth: halfWidth - 28 }, 1: { cellWidth: 28, halign: 'right' } },
  });
  y = getLastTableY(doc, y) + 8;
  y = drawParagraph(
    doc,
    `Your total monthly cost is ${formatCurrency(results.monthlyRestockCost + results.totalMonthlyFixedCosts)}. Monthly sales revenue is ${formatCurrency(results.monthlyRevenue)}, leaving estimated monthly profit of ${formatCurrency(results.monthlyProfit)}.`,
    y,
  );
  if (biggestRunningCost) {
    y = drawCallout(
      doc,
      `Watch out: ${biggestRunningCost.name || 'one running cost'} is your biggest running cost`,
      `${biggestRunningCost.name || 'This cost'} is ${formatCurrency(biggestRunningCost.amount)}. If it rises, your profit can shrink quickly. Review this cost before renewing, expanding, or committing to a long agreement.`,
      y,
      'amber',
    );
  }
  y = drawParagraph(doc, 'Monthly money flow - from sales to profit', y, { size: 11, color: COLORS.dark });
  y = drawWaterfall(doc, y, results, formatCurrency);

  y = drawSectionTitle(doc, 'Section 3', 'Your Monthly Sales Target');
  y = drawParagraph(
    doc,
    `A sales target is the minimum number of ${unitsLabel} you must sell in a month to cover running costs. It is your floor, not your dream goal.`,
    y,
  );
  drawTwoColumnTable(doc, y, [['How the target is calculated', 'Amount']], [
    ['Total monthly running costs', formatCurrency(results.totalMonthlyFixedCosts)],
    [`Average profit per ${config.unitNameSingular}`, formatCurrency(results.contributionMargin)],
    ['Monthly sales target', Number.isFinite(results.operatingBreakEvenUnits) ? `${Math.ceil(results.operatingBreakEvenUnits).toLocaleString()} ${unitsLabel}` : 'Not possible'],
    ['Time to reach target at current pace', operatingBreakEvenTime],
  ]);
  y = getLastTableY(doc, y) + 8;
  y = drawParagraph(
    doc,
    Number.isFinite(results.requiredUnitsPerWeek)
      ? `This target is about ${Math.ceil(results.requiredUnitsPerWeek).toLocaleString()} ${unitsLabel} per week. You currently sell ${results.totalUnitsPerWeek.toLocaleString()} ${unitsLabel} per week.`
      : 'At this price and cost structure, the business does not yet have a practical break-even target.',
    y,
  );
  y = drawCallout(
    doc,
    results.totalUnitsPerWeek >= results.requiredUnitsPerWeek ? 'You are ahead of your target' : 'You are below your target',
    results.totalUnitsPerWeek >= results.requiredUnitsPerWeek
      ? `You are selling enough to cover running costs. Protect this position by tracking weekly sales and keeping stock available.`
      : `You need roughly ${Math.ceil(results.unitsPerWeekGap).toLocaleString()} more ${unitsLabel} per week, or you need to reduce costs or adjust prices.`,
    y,
    results.totalUnitsPerWeek >= results.requiredUnitsPerWeek ? 'green' : 'amber',
  );

  y = drawSectionTitle(doc, 'Section 4', 'Getting Your Startup Money Back');
  y = drawParagraph(
    doc,
    'Startup money is the cash you put in before the business could operate normally. A healthy plan shows how long business profit will take to recover that money.',
    y,
  );
  drawTwoColumnTable(doc, y, [['Startup money used', 'Amount']], [
    ...startupCostRows,
    ['Opening stock or work cash', formatCurrency(results.firstStockCost)],
    ['Total startup money', formatCurrency(results.totalInitialInvestment)],
  ]);
  y = getLastTableY(doc, y) + 8;
  y = drawParagraph(
    doc,
    buildStartupRecoveryNarrative(
      results.totalInitialInvestment,
      results.monthlyProfit,
      paybackTime,
      formatCurrency,
    ),
    y,
  );
  y = drawRecoveryTimeline(doc, y, startupRecoveryTimelineMonths);
  y = drawCallout(
    doc,
    'Do not withdraw too much during recovery',
    'Taking out more than the safe take-home amount slows recovery and may leave the business without enough cash for stock, supplies, or a slow week.',
    y,
    'amber',
  );

  y = drawSectionTitle(doc, 'Section 5', 'What You Can Safely Take Home');
  y = drawParagraph(
    doc,
    'Your business is not a salary. It needs cash to survive, restock, and handle surprises. The safe take-home amount leaves a buffer in the business.',
    y,
  );
  drawTwoColumnTable(doc, y, [['Monthly money breakdown', 'Amount']], results.monthlyProfit > 0 ? [
    ['Monthly sales money', formatCurrency(results.monthlyRevenue)],
    ['Minus monthly restock', `-${formatCurrency(results.monthlyRestockCost)}`],
    ['Minus monthly running costs', `-${formatCurrency(results.totalMonthlyFixedCosts)}`],
    ['Monthly profit', formatCurrency(results.monthlyProfit)],
    ['Safety buffer (20%)', `-${formatCurrency(results.safetyBufferAmount)}`],
    ['Safe to take home', formatCurrency(results.safeTakeHomeAmount)],
    ['Safe to spend per week', formatCurrency(results.safeTakeHomeWeeklyAmount)],
    ['Safe to spend per day', formatCurrency(results.safeTakeHomeDailyAmount)],
    ['Keep in your business each week', formatCurrency(results.safetyBufferWeeklyAmount)],
    ['Keep in your business each day', formatCurrency(results.safetyBufferDailyAmount)],
  ] : [
    ['Monthly profit', formatCurrency(results.monthlyProfit)],
    ['Losing each day', formatCurrency(results.lossPerDay)],
    ['Weekly gap to break even', Number.isFinite(results.unitsPerWeekGap) ? `${Math.ceil(results.unitsPerWeekGap).toLocaleString()} ${config.unitNamePlural}` : 'Review price'],
    ['Safe to take home', formatCurrency(0)],
  ]);
  y = getLastTableY(doc, y) + 8;
  y = drawMetricGrid(doc, 'Safe owner spending guide', 'Use this as a practical limit, not a promise.', [
    { label: 'Safe per month', value: formatCurrency(Math.max(results.safeTakeHomeAmount, 0)), helper: '', accent: 'green' },
    { label: 'Safe per week', value: formatCurrency(Math.max(results.safeTakeHomeWeeklyAmount, 0)), helper: '' },
    { label: 'Safe per day', value: formatCurrency(Math.max(results.safeTakeHomeDailyAmount, 0)), helper: '' },
  ], y);
  y = drawMetricGrid(doc, 'Keep in the business', 'This buffer protects stock, supplies, and slow weeks.', [
    { label: 'Keep per month', value: formatCurrency(Math.max(results.safetyBufferAmount, 0)), helper: '', accent: 'green' },
    { label: 'Keep per week', value: formatCurrency(Math.max(results.safetyBufferWeeklyAmount, 0)), helper: '' },
    { label: 'Keep per day', value: formatCurrency(Math.max(results.safetyBufferDailyAmount, 0)), helper: '' },
  ], y);
  y = drawCallout(
    doc,
    `Think of ${formatCurrency(Math.max(results.safeTakeHomeDailyAmount, 0))}/day as your daily wage from this business`,
    'If you need more personal income, first grow sales, improve margin, or add a stronger product or service. Do not simply remove more cash from the business.',
    y,
    'green',
  );

  y = drawSectionTitle(doc, 'Section 6', 'Profit Versus Cash');
  y = drawParagraph(
    doc,
    'Profit and cash are not always the same. If customers pay later, the business can look profitable on paper while still running short of money in hand.',
    y,
  );
  drawTwoColumnTable(doc, y, [['Cash reality check', 'Amount']], [
    ['Main goal', results.purposeHeadline],
    ['Monthly profit', formatCurrency(results.monthlyProfit)],
    ['Estimated cash collected', formatCurrency(results.estimatedCashCollected)],
    ['Estimated cash in hand after monthly costs', formatCurrency(results.estimatedCashPosition)],
    ['Customer payment timing', state.step1_entry.customerPaymentTiming.replaceAll('_', ' ')],
    ['Bad month cash in hand', formatCurrency(results.badMonthEstimatedCashPosition)],
  ]);
  y = getLastTableY(doc, y) + 8;
  if (results.cashGapMessage) {
    y = drawCallout(doc, 'Cash warning', results.cashGapMessage, y, 'amber');
  }
  if (results.growthWarningMessage) {
    y = drawCallout(doc, 'Growth warning', results.growthWarningMessage, y, 'amber');
  }
  y = drawParagraph(
    doc,
    `Bad month check: if sales fall by about 25%, monthly revenue becomes ${formatCurrency(results.badMonthMonthlyRevenue)}, profit becomes ${formatCurrency(results.badMonthMonthlyProfit)}, and estimated cash in hand becomes ${formatCurrency(results.badMonthEstimatedCashPosition)}.`,
    y,
  );

  y = drawSectionTitle(doc, 'Section 7', 'Your Pricing Options');
  y = drawParagraph(
    doc,
    'Your current price may work, but pricing options help you test whether a small increase can improve profit without hurting demand.',
    y,
  );
  autoTable(doc, {
    startY: y,
    head: [['Option', 'Multiplier', 'Average price', 'Comment']],
    body: results.pricingOptions.map((option) => [
      option.label,
      `x${option.multiplier.toFixed(2)}`,
      formatCurrency(option.averageSuggestedPrice),
      option.description,
    ]),
    theme: 'grid',
    styles: { fontSize: 8.8, cellPadding: 2.7, lineColor: COLORS.border, lineWidth: 0.1, overflow: 'linebreak' },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLORS.neutralFill },
    margin: { left: PAGE.marginX, right: PAGE.marginX },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 34, halign: 'right' },
      3: { cellWidth: 94 },
    },
  });
  y = getLastTableY(doc, y) + 8;
  y = drawCallout(
    doc,
    'Pricing tip: test before you commit',
    `Try raising one strong ${config.unitNameSingular} or service first. Watch whether customers still buy at the same pace before changing everything.`,
    y,
    'amber',
  );

  y = drawSectionTitle(doc, 'Section 8', 'Your Next Steps - Action Plan');
  y = drawParagraph(
    doc,
    'Knowing your numbers is the first step. Acting on them is what protects and grows the business.',
    y,
  );
  const actionRows = [
    ['This week', 'Track daily sales', `Write down every ${config.unitNameSingular} sold each day. Check whether weekly sales reach ${results.totalUnitsPerWeek.toLocaleString()} ${unitsLabel}.`],
    ['This month', 'Stay within your take-home limit', `Do not take out more than ${formatCurrency(Math.max(results.safeTakeHomeAmount, 0))} this month. Keep the buffer inside the business.`],
    ['Next 3 months', 'Test one improvement', topProfitItem ? `Try selling more ${topProfitItem.name} or testing a small price increase.` : 'Test one small price or sales improvement and watch customer response.'],
    ['Within 6 months', 'Build a cash cushion', `Aim to keep at least ${formatCurrency(Math.max(results.safetyBufferAmount, 0))} in the business as a monthly safety habit.`],
    ['Recovery point', 'Review the plan again', Number.isFinite(results.investmentPaybackMonths) ? `When you reach about ${paybackTime}, update the plan and decide whether to reinvest or take more home.` : 'Update the plan after improving price, costs, or weekly sales.'],
  ];
  actionRows.forEach(([period, title, body]) => {
    y = ensureSpace(doc, y, 27);
    setFill(doc, COLORS.greenFill);
    setDraw(doc, COLORS.border);
    doc.roundedRect(PAGE.marginX, y, PAGE.contentWidth, 22, 4, 4, 'FD');
    setFill(doc, COLORS.primary);
    doc.roundedRect(PAGE.marginX, y, 32, 22, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    setText(doc, COLORS.white);
    doc.text(doc.splitTextToSize(period, 26), PAGE.marginX + 4, y + 9);
    doc.setFontSize(9.5);
    setText(doc, COLORS.dark);
    doc.text(title, PAGE.marginX + 38, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setText(doc, COLORS.slate);
    doc.text(doc.splitTextToSize(body, PAGE.contentWidth - 43), PAGE.marginX + 38, y + 14);
    y += 27;
  });

  y = drawSectionTitle(doc, 'About This Report', 'How VunaMentor Works');
  y = drawParagraph(
    doc,
    'VunaMentor is the planning tool inside VunaBooks. This report was generated automatically from the numbers entered in Simple Mode.',
    y,
  );
  y = drawParagraph(
    doc,
    'Simple Mode is designed for business owners who prefer plain-language guidance over technical accounting terms. All calculations are based on the values entered by the user.',
    y,
  );
  y = drawCallout(
    doc,
    'Disclaimer',
    'This report is guidance only. VunaMentor does not independently verify your prices, sales volumes, costs, taxes, or legal requirements. If your real numbers change, update the planner and generate a new report.',
    y,
    'amber',
  );

  addReportChrome(doc, businessLabel);
  return doc;
}

export function generatePDFBlob(
  state: WizardState,
  results: CalculationResult,
  businessType: BusinessType = 'manufacturing',
): Blob {
  const doc = buildPDFDocument(state, results, businessType);
  return doc.output('blob');
}

export function generatePDF(
  state: WizardState,
  results: CalculationResult,
  businessType: BusinessType = 'manufacturing',
) {
  const businessName = state.step1_entry.activityDescription || 'My Business';
  const doc = buildPDFDocument(state, results, businessType);
  doc.save(getPDFFileName(businessName));
}
