// Shared PDF renderer for Product Proposals.
// Builds an actual PDF using jsPDF so we can open it in a new tab or download it
// without dropping the user into the browser's print dialog.

import jsPDF from 'jspdf';

type AnyProposal = Record<string, any> | null | undefined;

const MARGIN_X = 48;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;
const LINE_HEIGHT = 1.35;

const COLOR_TEXT: [number, number, number] = [26, 26, 46];
const COLOR_MUTED: [number, number, number] = [107, 114, 128];
const COLOR_H2: [number, number, number] = [49, 46, 129];
const COLOR_H3: [number, number, number] = [99, 102, 241];
const COLOR_RULE: [number, number, number] = [224, 231, 255];
const COLOR_BOX_BG: [number, number, number] = [245, 243, 255];
const COLOR_HIGHLIGHT_BG: [number, number, number] = [238, 242, 255];
const COLOR_HIGHLIGHT_BAR: [number, number, number] = [99, 102, 241];
const COLOR_FOOTER: [number, number, number] = [156, 163, 175];

const SCORE_HIGH_BG: [number, number, number] = [209, 250, 229];
const SCORE_HIGH_FG: [number, number, number] = [6, 95, 70];
const SCORE_MID_BG: [number, number, number] = [254, 243, 199];
const SCORE_MID_FG: [number, number, number] = [146, 64, 14];
const SCORE_LOW_BG: [number, number, number] = [254, 226, 226];
const SCORE_LOW_FG: [number, number, number] = [153, 27, 27];

class PdfWriter {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  y: number;

  constructor() {
    this.doc = new jsPDF({ unit: 'pt', format: 'letter' });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - MARGIN_X * 2;
    this.y = MARGIN_TOP;
  }

  ensureSpace(needed: number) {
    if (this.y + needed > this.pageHeight - MARGIN_BOTTOM) {
      this.doc.addPage();
      this.y = MARGIN_TOP;
    }
  }

  setFont(size: number, style: 'normal' | 'bold' | 'italic' = 'normal') {
    this.doc.setFont('helvetica', style);
    this.doc.setFontSize(size);
  }

  setColor(rgb: [number, number, number]) {
    this.doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  }

  paragraph(text: string, size = 11, style: 'normal' | 'bold' | 'italic' = 'normal', color = COLOR_TEXT, indent = 0) {
    if (!text) return;
    this.setFont(size, style);
    this.setColor(color);
    const lines = this.doc.splitTextToSize(text, this.contentWidth - indent) as string[];
    const lineHeight = size * LINE_HEIGHT;
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.doc.text(line, MARGIN_X + indent, this.y + size);
      this.y += lineHeight;
    }
  }

  spacer(amount: number) {
    this.y += amount;
  }

  h1(text: string) {
    this.paragraph(text, 22, 'bold', COLOR_TEXT);
    this.spacer(2);
  }

  h2(text: string) {
    this.spacer(14);
    this.ensureSpace(36);
    this.paragraph(text, 14, 'bold', COLOR_H2);
    const ruleY = this.y + 2;
    this.doc.setDrawColor(COLOR_RULE[0], COLOR_RULE[1], COLOR_RULE[2]);
    this.doc.setLineWidth(1.2);
    this.doc.line(MARGIN_X, ruleY, MARGIN_X + this.contentWidth, ruleY);
    this.spacer(8);
  }

  h3(text: string) {
    this.spacer(6);
    this.paragraph(text.toUpperCase(), 9, 'bold', COLOR_H3);
    this.spacer(2);
  }

  bullets(items: string[] | undefined, marker = '•') {
    if (!items || !items.length) return;
    this.setFont(11, 'normal');
    this.setColor(COLOR_TEXT);
    for (const item of items) {
      if (!item) continue;
      const lines = this.doc.splitTextToSize(item, this.contentWidth - 18) as string[];
      const lineHeight = 11 * LINE_HEIGHT;
      this.ensureSpace(lineHeight);
      this.doc.text(marker, MARGIN_X, this.y + 11);
      this.doc.text(lines[0], MARGIN_X + 14, this.y + 11);
      this.y += lineHeight;
      for (let i = 1; i < lines.length; i++) {
        this.ensureSpace(lineHeight);
        this.doc.text(lines[i], MARGIN_X + 14, this.y + 11);
        this.y += lineHeight;
      }
    }
    this.spacer(2);
  }

  numbered(items: string[] | undefined) {
    if (!items || !items.length) return;
    this.setFont(11, 'normal');
    this.setColor(COLOR_TEXT);
    items.forEach((item, idx) => {
      if (!item) return;
      const marker = `${idx + 1}.`;
      const lines = this.doc.splitTextToSize(item, this.contentWidth - 22) as string[];
      const lineHeight = 11 * LINE_HEIGHT;
      this.ensureSpace(lineHeight);
      this.doc.text(marker, MARGIN_X, this.y + 11);
      this.doc.text(lines[0], MARGIN_X + 18, this.y + 11);
      this.y += lineHeight;
      for (let i = 1; i < lines.length; i++) {
        this.ensureSpace(lineHeight);
        this.doc.text(lines[i], MARGIN_X + 18, this.y + 11);
        this.y += lineHeight;
      }
    });
    this.spacer(2);
  }

  highlight(label: string, text: string) {
    if (!text) return;
    const size = 11;
    const lineHeight = size * LINE_HEIGHT;
    const combined = `${label} ${text}`;
    const lines = this.doc.splitTextToSize(combined, this.contentWidth - 20) as string[];
    const boxHeight = lines.length * lineHeight + 12;
    this.ensureSpace(boxHeight + 4);
    const boxY = this.y;
    this.doc.setFillColor(COLOR_HIGHLIGHT_BG[0], COLOR_HIGHLIGHT_BG[1], COLOR_HIGHLIGHT_BG[2]);
    this.doc.roundedRect(MARGIN_X, boxY, this.contentWidth, boxHeight, 3, 3, 'F');
    this.doc.setFillColor(COLOR_HIGHLIGHT_BAR[0], COLOR_HIGHLIGHT_BAR[1], COLOR_HIGHLIGHT_BAR[2]);
    this.doc.rect(MARGIN_X, boxY, 3, boxHeight, 'F');
    this.setFont(size, 'normal');
    this.setColor(COLOR_TEXT);
    let textY = boxY + 6;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0) {
        this.setFont(size, 'bold');
        const labelWidth = this.doc.getTextWidth(label + ' ');
        this.doc.text(label, MARGIN_X + 10, textY + size);
        this.setFont(size, 'normal');
        const rest = line.slice(label.length).trimStart();
        this.doc.text(rest, MARGIN_X + 10 + labelWidth, textY + size);
      } else {
        this.doc.text(line, MARGIN_X + 10, textY + size);
      }
      textY += lineHeight;
    }
    this.y = boxY + boxHeight + 4;
  }

  twoColumnBoxes(left?: { label: string; value: string }, right?: { label: string; value: string }) {
    if (!left && !right) return;
    const gap = 12;
    const colWidth = (this.contentWidth - gap) / 2;
    const boxHeight = 48;
    this.ensureSpace(boxHeight + 6);
    const startY = this.y;
    const drawBox = (box: { label: string; value: string } | undefined, x: number) => {
      if (!box) return;
      this.doc.setFillColor(COLOR_BOX_BG[0], COLOR_BOX_BG[1], COLOR_BOX_BG[2]);
      this.doc.roundedRect(x, startY, colWidth, boxHeight, 4, 4, 'F');
      this.setFont(8, 'bold');
      this.setColor(COLOR_MUTED);
      this.doc.text(box.label.toUpperCase(), x + 10, startY + 16);
      this.setFont(13, 'bold');
      this.setColor(COLOR_H2);
      const valueLines = this.doc.splitTextToSize(box.value, colWidth - 20) as string[];
      this.doc.text(valueLines[0] || '', x + 10, startY + 34);
    };
    drawBox(left, MARGIN_X);
    drawBox(right, MARGIN_X + colWidth + gap);
    this.y = startY + boxHeight + 6;
  }

  scoreBadge(score: number) {
    const [bg, fg] = score >= 70
      ? [SCORE_HIGH_BG, SCORE_HIGH_FG]
      : score >= 45
        ? [SCORE_MID_BG, SCORE_MID_FG]
        : [SCORE_LOW_BG, SCORE_LOW_FG];
    const label = `${score}/100 Opportunity Score`;
    this.setFont(10, 'bold');
    const width = this.doc.getTextWidth(label) + 20;
    const height = 18;
    this.ensureSpace(height + 6);
    this.doc.setFillColor(bg[0], bg[1], bg[2]);
    this.doc.roundedRect(MARGIN_X, this.y, width, height, 9, 9, 'F');
    this.setColor(fg);
    this.doc.text(label, MARGIN_X + 10, this.y + 13);
    this.y += height + 8;
  }

  footer(text: string) {
    this.spacer(24);
    this.ensureSpace(20);
    this.doc.setDrawColor(229, 231, 235);
    this.doc.setLineWidth(0.5);
    this.doc.line(MARGIN_X, this.y, MARGIN_X + this.contentWidth, this.y);
    this.spacer(8);
    this.paragraph(text, 9, 'italic', COLOR_FOOTER);
  }

  blob(): Blob {
    return this.doc.output('blob');
  }

  save(filename: string) {
    this.doc.save(filename);
  }
}

function buildProposalPdf(proposal: AnyProposal, fallbackTitle: string): PdfWriter {
  const p = (proposal || {}) as Record<string, any>;
  const w = new PdfWriter();

  w.h1(p.productName || fallbackTitle);

  if (p.oneLiner) w.paragraph(p.oneLiner, 11, 'normal', COLOR_MUTED);
  if (p.tagline) w.paragraph(`"${p.tagline}"`, 12, 'italic', [68, 68, 68]);

  const score = p.researchBacking?.opportunityScore;
  if (typeof score === 'number') {
    w.spacer(6);
    w.scoreBadge(score);
  }

  if (p.summary) {
    w.h2('Summary');
    w.paragraph(p.summary);
  }

  if (p.problemStatement) {
    w.h2('Problem Statement');
    w.paragraph(p.problemStatement);
  }

  if (p.targetUser) {
    w.h2('Target User');
    if (p.targetUser.persona) w.paragraph(`Persona: ${p.targetUser.persona}`);
    if (p.targetUser.painPoints?.length) {
      w.h3('Pain Points');
      w.bullets(p.targetUser.painPoints);
    }
    if (p.targetUser.jobsToBeDone?.length) {
      w.h3('Jobs to Be Done');
      w.bullets(p.targetUser.jobsToBeDone);
    }
    if (p.targetUser.currentAlternatives?.length) {
      w.h3('Current Alternatives');
      w.bullets(p.targetUser.currentAlternatives);
    }
  }

  if (p.marketOpportunity) {
    w.h2('Market Opportunity');
    const left = p.marketOpportunity.targetMarketSize
      ? { label: 'Total Market (TAM)', value: String(p.marketOpportunity.targetMarketSize) }
      : undefined;
    const right = p.marketOpportunity.serviceableMarket
      ? { label: 'Serviceable Market (SAM)', value: String(p.marketOpportunity.serviceableMarket) }
      : undefined;
    w.twoColumnBoxes(left, right);
    if (p.marketOpportunity.competitorGaps?.length) {
      w.h3('Competitor Gaps');
      w.bullets(p.marketOpportunity.competitorGaps, '▲');
    }
  }

  if (p.solution) {
    w.h2('Solution');
    if (p.solution.uniqueDifferentiator) w.highlight('Differentiator:', p.solution.uniqueDifferentiator);
    if (p.solution.unfairAdvantage) w.highlight('Unfair Advantage:', p.solution.unfairAdvantage);
    if (p.solution.coreFeatures?.length) {
      w.h3('Core Features');
      w.numbered(p.solution.coreFeatures);
    }
  }

  if (p.mvpScope) {
    w.h2('MVP Scope');
    if (p.mvpScope.mustHave?.length) {
      w.h3('Must Have (v1)');
      w.bullets(p.mvpScope.mustHave, '✓');
    }
    if (p.mvpScope.niceToHave?.length) {
      w.h3('Nice to Have (v2)');
      w.bullets(p.mvpScope.niceToHave, '○');
    }
    if (p.mvpScope.outOfScope?.length) {
      w.h3('Out of Scope');
      w.bullets(p.mvpScope.outOfScope, '✗');
    }
  }

  if (p.monetization) {
    w.h2('Monetization');
    if (p.monetization.model) w.paragraph(`Model: ${p.monetization.model}`);
    if (p.monetization.pricing) w.paragraph(`Pricing: ${p.monetization.pricing}`);
    if (p.monetization.rationale) w.paragraph(p.monetization.rationale);
  }

  if (p.goToMarket) {
    w.h2('Go-to-Market');
    if (p.goToMarket.primaryChannel) w.highlight('Primary Channel:', p.goToMarket.primaryChannel);
    if (p.goToMarket.launchStrategy) w.paragraph(p.goToMarket.launchStrategy);
    if (p.goToMarket.first30Days) {
      w.h3('First 30 Days');
      w.paragraph(p.goToMarket.first30Days);
    }
  }

  if (p.risks?.length) {
    w.h2('Key Risks');
    w.bullets(p.risks, '!');
  }

  if (p.nextSteps?.length) {
    w.h2('Next Steps');
    w.numbered(p.nextSteps);
  }

  const backing = p.researchBacking;
  const footerParts = ['Generated by FounderLens Idea Coach'];
  if (backing) {
    footerParts.push(`Score: ${backing.opportunityScore ?? 'N/A'}/100`);
    footerParts.push(`${backing.dataPoints ?? 0} data points`);
  }
  w.footer(footerParts.join(' · '));

  return w;
}

function safeFileName(proposal: AnyProposal, fallbackTitle: string): string {
  const raw = (proposal as any)?.productName || fallbackTitle || 'product-proposal';
  const slug = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${slug || 'product-proposal'}.pdf`;
}

// Opens the proposal PDF in a new browser tab using the browser's built-in viewer.
export function openProposalPdf(proposal: AnyProposal, fallbackTitle: string) {
  const writer = buildProposalPdf(proposal, fallbackTitle);
  const blob = writer.blob();
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    // Popup blocked — fall back to a direct download so the user still gets the file.
    downloadProposalPdf(proposal, fallbackTitle);
    URL.revokeObjectURL(url);
    return;
  }
  // Revoke the blob URL after the new tab has had time to load it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Triggers a direct .pdf download of the proposal.
export function downloadProposalPdf(proposal: AnyProposal, fallbackTitle: string) {
  const writer = buildProposalPdf(proposal, fallbackTitle);
  writer.save(safeFileName(proposal, fallbackTitle));
}
