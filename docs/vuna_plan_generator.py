"""
VunaMentor Business Plan PDF Generator — Simple Mode
Retail Shop Report | Uganda
Cloneable template for AI coders building plan.vunabooks.com
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics import renderPDF
from reportlab.platypus.flowables import Flowable
import math

# ─────────────────────────────────────────────
# BRAND COLOURS
# ─────────────────────────────────────────────
VUNA_GREEN      = colors.HexColor("#1A7A4A")   # primary brand
VUNA_DARK       = colors.HexColor("#0D3D25")   # headings
VUNA_LIGHT_BG   = colors.HexColor("#F0F7F3")   # section tint
VUNA_ACCENT     = colors.HexColor("#F5A623")   # highlight / callout
VUNA_ACCENT_LIGHT = colors.HexColor("#FEF3DC") # callout bg
VUNA_TABLE_HDR  = colors.HexColor("#1A7A4A")
VUNA_TABLE_ALT  = colors.HexColor("#F0F7F3")
VUNA_BORDER     = colors.HexColor("#C8E0D3")
TEXT_DARK       = colors.HexColor("#1A1A1A")
TEXT_MID        = colors.HexColor("#444444")
TEXT_LIGHT      = colors.HexColor("#777777")
WHITE           = colors.white
RED_SOFT        = colors.HexColor("#C0392B")

PAGE_W, PAGE_H = A4
MARGIN = 2.2 * cm

# ─────────────────────────────────────────────
# STYLES
# ─────────────────────────────────────────────
base = getSampleStyleSheet()

def S(name, parent="Normal", **kw):
    return ParagraphStyle(name, parent=base[parent], **kw)

styles = {
    "cover_title": S("cover_title", "Title",
        fontSize=28, leading=34, textColor=WHITE,
        fontName="Helvetica-Bold", alignment=TA_LEFT),

    "cover_sub": S("cover_sub",
        fontSize=13, leading=18, textColor=colors.HexColor("#D4EDE0"),
        fontName="Helvetica", alignment=TA_LEFT),

    "cover_meta": S("cover_meta",
        fontSize=10, leading=14, textColor=colors.HexColor("#A8D5BC"),
        fontName="Helvetica"),

    "section_label": S("section_label",
        fontSize=8, leading=10, textColor=VUNA_GREEN,
        fontName="Helvetica-Bold", spaceAfter=2,
        spaceBefore=18, letterSpacing=1.2),

    "h1": S("h1", "Heading1",
        fontSize=16, leading=20, textColor=VUNA_DARK,
        fontName="Helvetica-Bold", spaceBefore=0, spaceAfter=6),

    "h2": S("h2", "Heading2",
        fontSize=12, leading=16, textColor=VUNA_DARK,
        fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=4),

    "body": S("body",
        fontSize=10.5, leading=16, textColor=TEXT_DARK,
        fontName="Helvetica", alignment=TA_JUSTIFY, spaceAfter=6),

    "body_small": S("body_small",
        fontSize=9.5, leading=14, textColor=TEXT_MID,
        fontName="Helvetica", alignment=TA_JUSTIFY, spaceAfter=4),

    "callout_title": S("callout_title",
        fontSize=10, leading=13, textColor=VUNA_DARK,
        fontName="Helvetica-Bold"),

    "callout_body": S("callout_body",
        fontSize=10, leading=14.5, textColor=TEXT_DARK,
        fontName="Helvetica"),

    "kpi_label": S("kpi_label",
        fontSize=8.5, leading=11, textColor=TEXT_LIGHT,
        fontName="Helvetica", alignment=TA_CENTER),

    "kpi_value": S("kpi_value",
        fontSize=18, leading=22, textColor=VUNA_GREEN,
        fontName="Helvetica-Bold", alignment=TA_CENTER),

    "kpi_sub": S("kpi_sub",
        fontSize=8, leading=10, textColor=TEXT_MID,
        fontName="Helvetica", alignment=TA_CENTER),

    "table_hdr": S("table_hdr",
        fontSize=9, leading=12, textColor=WHITE,
        fontName="Helvetica-Bold", alignment=TA_CENTER),

    "table_cell": S("table_cell",
        fontSize=9.5, leading=13, textColor=TEXT_DARK,
        fontName="Helvetica", alignment=TA_LEFT),

    "table_num": S("table_num",
        fontSize=9.5, leading=13, textColor=TEXT_DARK,
        fontName="Helvetica", alignment=TA_RIGHT),

    "table_num_bold": S("table_num_bold",
        fontSize=9.5, leading=13, textColor=VUNA_DARK,
        fontName="Helvetica-Bold", alignment=TA_RIGHT),

    "footer": S("footer",
        fontSize=8, leading=11, textColor=TEXT_LIGHT,
        fontName="Helvetica", alignment=TA_CENTER),

    "tag": S("tag",
        fontSize=8, leading=10, textColor=VUNA_GREEN,
        fontName="Helvetica-Bold", alignment=TA_CENTER),

    "disclaimer": S("disclaimer",
        fontSize=8.5, leading=12, textColor=TEXT_MID,
        fontName="Helvetica-Oblique", alignment=TA_JUSTIFY),
}

# ─────────────────────────────────────────────
# CUSTOM FLOWABLES
# ─────────────────────────────────────────────

class CoverBlock(Flowable):
    """Full-width green cover header block."""
    def __init__(self, width, height=7.5*cm):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        # Dark green bg
        c.setFillColor(VUNA_DARK)
        c.rect(0, 0, self.width, self.height, fill=1, stroke=0)
        # Accent bar left
        c.setFillColor(VUNA_GREEN)
        c.rect(0, 0, 0.55*cm, self.height, fill=1, stroke=0)
        # Decorative circle top-right
        c.setFillColor(colors.HexColor("#0F4A2D"))
        c.circle(self.width - 1.5*cm, self.height - 1*cm, 3*cm, fill=1, stroke=0)
        c.circle(self.width + 0.5*cm, self.height * 0.3, 2*cm, fill=1, stroke=0)


class SectionBand(Flowable):
    """Thin green top-border + light-bg section opener."""
    def __init__(self, width, height=0.18*cm):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        c.setFillColor(VUNA_GREEN)
        c.rect(0, 0, self.width, self.height, fill=1, stroke=0)


class CalloutBox(Flowable):
    """Amber callout / insight box."""
    def __init__(self, title, body, width, bg=None, border_color=None):
        super().__init__()
        self.title = title
        self.body = body
        self.width = width
        self.bg = bg or VUNA_ACCENT_LIGHT
        self.border_color = border_color or VUNA_ACCENT
        self._title_para = Paragraph(title, styles["callout_title"])
        self._body_para  = Paragraph(body,  styles["callout_body"])
        self.pad = 0.35*cm

    def wrap(self, availW, availH):
        inner = self.width - 2*self.pad - 0.3*cm
        tw, th = self._title_para.wrap(inner, availH)
        bw, bh = self._body_para.wrap(inner, availH)
        self.height = th + bh + 2.5*self.pad + 0.1*cm
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(self.bg)
        c.setStrokeColor(self.border_color)
        c.roundRect(0, 0, self.width, self.height, 4, fill=1, stroke=1)
        # left accent strip
        c.setFillColor(self.border_color)
        c.rect(0, 0, 0.3*cm, self.height, fill=1, stroke=0)
        # draw paragraphs
        x = 0.3*cm + self.pad
        y = self.height - self.pad
        w, h = self._title_para.wrap(self.width - x - self.pad, self.height)
        y -= h
        self._title_para.drawOn(c, x, y)
        y -= 0.1*cm
        w, h = self._body_para.wrap(self.width - x - self.pad, y)
        y -= h
        self._body_para.drawOn(c, x, y)


class GreenCalloutBox(CalloutBox):
    def __init__(self, title, body, width):
        super().__init__(title, body, width,
                         bg=VUNA_LIGHT_BG, border_color=VUNA_GREEN)


class KPIRow(Flowable):
    """Row of 3 KPI metric cards."""
    def __init__(self, items, width):
        """items: list of (label, value, sub) tuples, max 3."""
        super().__init__()
        self.items = items
        self.width = width
        self.height = 2.6*cm
        self.gap = 0.25*cm

    def draw(self):
        c = self.canv
        n = len(self.items)
        card_w = (self.width - self.gap*(n-1)) / n
        for i, (label, value, sub) in enumerate(self.items):
            x = i * (card_w + self.gap)
            # card bg
            c.setFillColor(VUNA_LIGHT_BG)
            c.setStrokeColor(VUNA_BORDER)
            c.roundRect(x, 0, card_w, self.height, 4, fill=1, stroke=1)
            # top green stripe
            c.setFillColor(VUNA_GREEN)
            c.roundRect(x, self.height - 0.18*cm, card_w, 0.18*cm, 2, fill=1, stroke=0)
            # label
            lbl = Paragraph(label, styles["kpi_label"])
            lw, lh = lbl.wrap(card_w - 0.4*cm, self.height)
            lbl.drawOn(c, x + 0.2*cm, self.height - lh - 0.4*cm)
            # value
            val = Paragraph(value, styles["kpi_value"])
            vw, vh = val.wrap(card_w - 0.4*cm, self.height)
            val.drawOn(c, x + 0.2*cm, self.height - lh - vh - 0.45*cm)
            # sub
            if sub:
                s = Paragraph(sub, styles["kpi_sub"])
                sw, sh = s.wrap(card_w - 0.4*cm, self.height)
                s.drawOn(c, x + 0.2*cm, 0.25*cm)


class ProfitWaterfallChart(Flowable):
    """Simple waterfall / bar breakdown chart drawn with canvas."""
    def __init__(self, width, height=5.5*cm):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        pad_l, pad_r, pad_b, pad_t = 1.0*cm, 0.3*cm, 1.0*cm, 0.5*cm
        chart_w = self.width - pad_l - pad_r
        chart_h = self.height - pad_b - pad_t

        bars = [
            ("Monthly\nSales", 585000, VUNA_GREEN, True),
            ("Restock\nCost", 429000, RED_SOFT, False),
            ("Running\nCosts", 118000, colors.HexColor("#E67E22"), False),
            ("Net\nProfit", 38000, VUNA_DARK, True),
        ]
        max_val = 585000
        bar_w = chart_w / (len(bars) * 1.8)
        gap   = (chart_w - bar_w * len(bars)) / (len(bars) + 1)

        # grid lines
        c.setStrokeColor(VUNA_BORDER)
        c.setLineWidth(0.3)
        for pct in [0.25, 0.5, 0.75, 1.0]:
            y = pad_b + chart_h * pct
            c.line(pad_l, y, pad_l + chart_w, y)
            label = f"{int(max_val*pct/1000)}K"
            c.setFillColor(TEXT_LIGHT)
            c.setFont("Helvetica", 6.5)
            c.drawRightString(pad_l - 0.1*cm, y - 0.15*cm, label)

        # baseline
        c.setStrokeColor(TEXT_MID)
        c.setLineWidth(0.5)
        c.line(pad_l, pad_b, pad_l + chart_w, pad_b)

        for i, (lbl, val, col, bold) in enumerate(bars):
            x = pad_l + gap*(i+1) + bar_w*i
            bh = chart_h * (val / max_val)
            # shadow
            c.setFillColor(colors.HexColor("#DDDDDD"))
            c.roundRect(x+1, pad_b-1, bar_w, bh, 2, fill=1, stroke=0)
            # bar
            c.setFillColor(col)
            c.roundRect(x, pad_b, bar_w, bh, 2, fill=1, stroke=0)
            # value label on top
            c.setFillColor(VUNA_DARK if bold else TEXT_MID)
            c.setFont("Helvetica-Bold" if bold else "Helvetica", 6.8)
            amount = f"{val:,}"
            c.drawCentredString(x + bar_w/2, pad_b + bh + 0.1*cm, amount)
            # category label below
            c.setFillColor(TEXT_MID)
            c.setFont("Helvetica", 7)
            for j, line in enumerate(lbl.split("\n")):
                c.drawCentredString(x + bar_w/2, pad_b - 0.35*cm - j*0.28*cm, line)

        # chart title
        c.setFillColor(TEXT_LIGHT)
        c.setFont("Helvetica-Oblique", 7.5)
        c.drawRightString(pad_l + chart_w, pad_b + chart_h + 0.12*cm,
                          "All amounts in UGX")


class PricingBar(Flowable):
    """Horizontal pricing comparison bar."""
    def __init__(self, items, width, height=3.2*cm):
        """items: list of (label, buy, sell, color)"""
        super().__init__()
        self.items = items
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        n = len(self.items)
        row_h = (self.height - 0.3*cm) / n
        pad_l = 2.2*cm
        max_sell = max(i[2] for i in self.items) * 1.05
        bar_area = self.width - pad_l - 2*cm

        colors_list = [VUNA_GREEN, colors.HexColor("#2980B9"), colors.HexColor("#8E44AD")]

        for i, (label, buy, sell, _) in enumerate(self.items):
            y = self.height - (i+1)*row_h + 0.1*cm
            col = colors_list[i % len(colors_list)]
            # label
            c.setFillColor(TEXT_DARK)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(0, y + row_h*0.3, label)

            bw = bar_area * buy / max_sell
            sw = bar_area * sell / max_sell

            # sell bar
            c.setFillColor(colors.HexColor("#E8F5EE"))
            c.roundRect(pad_l, y + row_h*0.35, sw, row_h*0.35, 2, fill=1, stroke=0)
            # buy bar
            c.setFillColor(col)
            c.roundRect(pad_l, y + row_h*0.35, bw, row_h*0.35, 2, fill=1, stroke=0)

            # sell price label
            c.setFillColor(TEXT_DARK)
            c.setFont("Helvetica", 7.5)
            c.drawString(pad_l + sw + 0.1*cm, y + row_h*0.42,
                         f"Sell: {sell:,} UGX")
            # buy price
            c.setFillColor(WHITE)
            c.setFont("Helvetica-Bold", 7)
            if bw > 0.8*cm:
                c.drawString(pad_l + 0.1*cm, y + row_h*0.44,
                             f"Buy: {buy:,}")


class RecoveryTimeline(Flowable):
    """Visual timeline bar showing startup recovery months."""
    def __init__(self, width, total_months=13.4, height=1.8*cm):
        super().__init__()
        self.width = width
        self.height = height
        self.total_months = total_months

    def draw(self):
        c = self.canv
        bar_h = 0.55*cm
        y = self.height * 0.45
        bar_w = self.width

        # background track
        c.setFillColor(VUNA_BORDER)
        c.roundRect(0, y, bar_w, bar_h, bar_h/2, fill=1, stroke=0)

        # filled portion (13.4 out of ~24 months)
        fill_frac = min(self.total_months / 24, 1)
        fill_w = bar_w * fill_frac
        c.setFillColor(VUNA_GREEN)
        c.roundRect(0, y, fill_w, bar_h, bar_h/2, fill=1, stroke=0)

        # marker at filled point
        mx = fill_w
        c.setFillColor(VUNA_ACCENT)
        c.circle(mx, y + bar_h/2, 0.22*cm, fill=1, stroke=0)

        # labels
        c.setFont("Helvetica", 7)
        c.setFillColor(TEXT_MID)
        c.drawString(0, y - 0.35*cm, "Month 0")
        c.drawCentredString(mx, y - 0.35*cm, "Month 13")
        c.drawRightString(bar_w, y - 0.35*cm, "Month 24")

        c.setFont("Helvetica-Bold", 7.5)
        c.setFillColor(VUNA_DARK)
        c.drawCentredString(mx, y + bar_h + 0.18*cm,
                            "↑ Breakeven point: ~13 months")


# ─────────────────────────────────────────────
# TABLE HELPERS
# ─────────────────────────────────────────────
def styled_table(data, col_widths, alt_rows=True, footer_row=False):
    n_cols = len(data[0])
    ts = [
        ("BACKGROUND",  (0,0), (-1,0),  VUNA_TABLE_HDR),
        ("TEXTCOLOR",   (0,0), (-1,0),  WHITE),
        ("FONTNAME",    (0,0), (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",    (0,0), (-1,-1), 9),
        ("ROWBACKGROUND",(0,1),(-1,-1), [WHITE, VUNA_TABLE_ALT]),
        ("GRID",        (0,0), (-1,-1), 0.4, VUNA_BORDER),
        ("LINEABOVE",   (0,0), (-1,0),  0,   VUNA_BORDER),
        ("TOPPADDING",  (0,0), (-1,-1), 6),
        ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING",(0,0),(-1,-1), 8),
        ("ALIGN",       (0,0), (-1,-1), "LEFT"),
        ("VALIGN",      (0,0), (-1,-1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, VUNA_TABLE_ALT]),
    ]
    if footer_row:
        ts += [
            ("BACKGROUND",  (0,-1), (-1,-1), VUNA_LIGHT_BG),
            ("FONTNAME",    (0,-1), (-1,-1), "Helvetica-Bold"),
            ("LINEABOVE",   (0,-1), (-1,-1), 0.8, VUNA_GREEN),
        ]
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle(ts))
    return t


def HR(width=None):
    return HRFlowable(width="100%", thickness=0.5, color=VUNA_BORDER,
                      spaceAfter=8, spaceBefore=8)


def sp(h=0.2):
    return Spacer(1, h*cm)


def section_header(label, title):
    return [
        sp(0.5),
        Paragraph(label.upper(), styles["section_label"]),
        Paragraph(title, styles["h1"]),
        SectionBand(PAGE_W - 2*MARGIN),
        sp(0.3),
    ]


# ─────────────────────────────────────────────
# PAGE TEMPLATE (header / footer)
# ─────────────────────────────────────────────
def on_page(canvas, doc):
    canvas.saveState()
    pw = A4[0]

    # Header bar (skip cover page)
    if doc.page > 1:
        canvas.setFillColor(VUNA_DARK)
        canvas.rect(0, A4[1] - 1.1*cm, pw, 1.1*cm, fill=1, stroke=0)
        canvas.setFillColor(VUNA_GREEN)
        canvas.rect(0, A4[1] - 1.1*cm, 0.4*cm, 1.1*cm, fill=1, stroke=0)
        canvas.setFillColor(WHITE)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawString(1*cm, A4[1] - 0.75*cm, "VunaMentor")
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#A8D5BC"))
        canvas.drawString(3.2*cm, A4[1] - 0.75*cm, "Business Plan Report  |  Simple Mode  |  Retail")
        canvas.setFillColor(WHITE)
        canvas.drawRightString(pw - 1*cm, A4[1] - 0.75*cm,
                               f"Page {doc.page}")

    # Footer
    canvas.setFillColor(TEXT_LIGHT)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(MARGIN, 0.7*cm,
                      "Generated by VunaMentor · plan.vunabooks.com")
    canvas.drawRightString(pw - MARGIN, 0.7*cm,
                           "Confidential — for business owner use only")
    canvas.setStrokeColor(VUNA_BORDER)
    canvas.setLineWidth(0.4)
    canvas.line(MARGIN, 1.05*cm, pw - MARGIN, 1.05*cm)

    canvas.restoreState()


# ─────────────────────────────────────────────
# BUILD STORY
# ─────────────────────────────────────────────
def build():
    doc = SimpleDocTemplate(
        "/mnt/user-data/outputs/VunaMentor_Retail_Plan.pdf",
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=1.5*cm, bottomMargin=1.6*cm,
        title="VunaMentor Business Plan — Retail Shop",
        author="VunaMentor / VunaBooks",
    )

    W = PAGE_W - 2*MARGIN
    story = []

    # ══════════════════════════════════════════
    # COVER
    # ══════════════════════════════════════════
    story.append(CoverBlock(W, height=6.8*cm))

    # Overlay text via table trick (draw on top of cover block isn't straightforward,
    # so we use a coloured-background Table for the cover area)
    cover_data = [[
        Paragraph("VunaMentor", S("ct1", fontSize=9, textColor=VUNA_GREEN,
                                   fontName="Helvetica-Bold")),
    ]]
    # Instead, let's use a Table with dark background as cover
    story = []  # reset

    cover_table_data = [[
        Paragraph(
            '<font color="#A8D5BC" size="9"><b>VunaMentor</b></font>  '
            '<font color="#6CB890" size="9">/ VunaBooks</font>',
            S("ct_brand", fontName="Helvetica", fontSize=9)),
    ],[
        Paragraph(
            '<font color="white" size="26"><b>Your Retail Shop\nBusiness Plan</b></font>',
            S("ct_title", fontName="Helvetica-Bold", fontSize=26,
              leading=32, textColor=WHITE)),
    ],[
        Paragraph(
            '<font color="#D4EDE0" size="11">A complete, plain-language report of your business numbers,<br/>'
            'what they mean, and what to do next.</font>',
            S("ct_sub", fontName="Helvetica", fontSize=11,
              leading=16, textColor=colors.HexColor("#D4EDE0"))),
    ],[
        sp(0.4),
    ],[
        Table([
            [
                Paragraph('<font color="#A8D5BC" size="8">MODE</font><br/>'
                          '<font color="white" size="10"><b>Simple Mode</b></font>',
                          S("x", fontName="Helvetica", fontSize=8, leading=13)),
                Paragraph('<font color="#A8D5BC" size="8">BUSINESS TYPE</font><br/>'
                          '<font color="white" size="10"><b>Retail Shop</b></font>',
                          S("x", fontName="Helvetica", fontSize=8, leading=13)),
                Paragraph('<font color="#A8D5BC" size="8">LOCATION</font><br/>'
                          '<font color="white" size="10"><b>Uganda</b></font>',
                          S("x", fontName="Helvetica", fontSize=8, leading=13)),
                Paragraph('<font color="#A8D5BC" size="8">CURRENCY</font><br/>'
                          '<font color="white" size="10"><b>UGX</b></font>',
                          S("x", fontName="Helvetica", fontSize=8, leading=13)),
            ]
        ], colWidths=[W/4]*4,
           style=TableStyle([
               ("BACKGROUND", (0,0),(-1,-1), colors.HexColor("#0F4A2D")),
               ("TOPPADDING", (0,0),(-1,-1), 8),
               ("BOTTOMPADDING",(0,0),(-1,-1),8),
               ("LEFTPADDING",(0,0),(-1,-1),10),
               ("GRID",(0,0),(-1,-1),0.4,colors.HexColor("#1A7A4A")),
           ])),
    ]]

    cover = Table(cover_table_data, colWidths=[W],
                  style=TableStyle([
                      ("BACKGROUND", (0,0),(-1,-1), VUNA_DARK),
                      ("TOPPADDING", (0,0),(-1,-1), 0),
                      ("BOTTOMPADDING",(0,0),(-1,-1),0),
                      ("LEFTPADDING",(0,0),(-1,-1),0.55*cm),
                      ("RIGHTPADDING",(0,0),(-1,-1),0.3*cm),
                      ("ROWPADDING", (0,0),(0,0), 14),
                      ("TOPPADDING", (0,0),(0,0), 20),
                  ]))

    # Wrap cover in a frame
    story.append(sp(0.0))
    story.append(Table(
        [[cover]],
        colWidths=[W],
        style=TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),VUNA_DARK),
            ("TOPPADDING",(0,0),(-1,-1),24),
            ("BOTTOMPADDING",(0,0),(-1,-1),24),
            ("LEFTPADDING",(0,0),(-1,-1),0),
            ("RIGHTPADDING",(0,0),(-1,-1),0),
            ("BOX",(0,0),(-1,-1),0,VUNA_DARK),
        ])
    ))

    story.append(sp(0.6))

    # ── EXECUTIVE SUMMARY ──────────────────────
    for el in section_header("Executive Summary", "Your Business at a Glance"):
        story.append(el)

    story.append(Paragraph(
        "This report is your personal business guide. It was created from the numbers "
        "you entered into VunaMentor. Everything here is about <b>your</b> shop — "
        "what you sell, how much you earn, and what to watch out for. Read it carefully, "
        "keep it somewhere safe, and refer back to it whenever you make a big decision.",
        styles["body"]))

    story.append(sp(0.3))

    # KPI cards row 1
    story.append(KPIRow([
        ("Average profit per item sold", "1,200 UGX", "per item"),
        ("Monthly net profit", "38,000 UGX", "after all costs"),
        ("Safe take-home this month", "30,400 UGX", "80% of profit"),
    ], W))
    story.append(sp(0.25))

    story.append(KPIRow([
        ("Weekly items to sell", "30 items", "across 3 products"),
        ("Monthly sales target", "99 items", "to cover all costs"),
        ("Startup recovery time", "~13 months", "at current profit pace"),
    ], W))

    story.append(sp(0.4))

    story.append(CalloutBox(
        "📌 What this means for you",
        "You are running a healthy small retail business. You sell three products — "
        "Colgate, Pads, and Sugar — and each week you make about <b>36,000 UGX in gross profit</b> "
        "before costs. After paying rent, transport, and supplies, your monthly take-home "
        "is <b>30,400 UGX</b>. Your business is on track. Keep restocking regularly, "
        "watch your costs, and avoid taking more than 30,400 UGX out of the business each month.",
        W))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 1: YOUR PRODUCTS
    # ══════════════════════════════════════════
    for el in section_header("Section 1", "Your Products and What They Earn"):
        story.append(el)

    story.append(Paragraph(
        "You currently sell <b>three products</b>. Each one has a buying price (what you pay "
        "the supplier) and a selling price (what your customer pays you). The difference "
        "between those two numbers is called your <b>profit per item</b> — that is the money "
        "you keep for each unit sold.",
        styles["body"]))

    story.append(sp(0.2))

    story.append(Paragraph(
        "Sugar is your <b>highest-volume product</b> — you sell 15 units a week. "
        "Colgate gives you the <b>highest profit per item</b> at 1,900 UGX each. "
        "Pads sell the fewest units but still contribute a steady 5,000 UGX to your weekly income. "
        "Together, these three products bring in <b>135,000 UGX in weekly sales revenue</b>.",
        styles["body"]))

    story.append(sp(0.3))

    # Product breakdown table
    prod_data = [
        [Paragraph("Product", styles["table_hdr"]),
         Paragraph("Buy Price\n(UGX)", styles["table_hdr"]),
         Paragraph("Sell Price\n(UGX)", styles["table_hdr"]),
         Paragraph("Profit\nper Item", styles["table_hdr"]),
         Paragraph("Units\n/Week", styles["table_hdr"]),
         Paragraph("Weekly\nProfit (UGX)", styles["table_hdr"])],
        ["Colgate",      "3,100", "5,000", "1,900 UGX", "10", "19,000"],
        ["Pads",         "4,000", "5,000", "1,000 UGX",  "5",  "5,000"],
        ["Sugar",        "3,200", "4,000",   "800 UGX", "15", "12,000"],
        [Paragraph("<b>TOTAL / AVERAGE</b>", styles["table_cell"]),
         "–", "–",
         Paragraph("<b>1,200 UGX avg</b>", styles["table_num_bold"]),
         Paragraph("<b>30</b>", styles["table_num_bold"]),
         Paragraph("<b>36,000</b>", styles["table_num_bold"])],
    ]
    story.append(styled_table(prod_data,
        [3.2*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2*cm, 3.1*cm],
        footer_row=True))

    story.append(sp(0.3))

    # Pricing bar chart
    story.append(Paragraph("Buying vs. Selling Price — Visual Comparison",
                            styles["h2"]))
    story.append(Paragraph(
        "The chart below shows how much you pay versus how much you receive for each product. "
        "The wider the gap between the two bars, the more profit you make per sale.",
        styles["body_small"]))
    story.append(sp(0.2))
    story.append(PricingBar([
        ("Colgate", 3100, 5000, VUNA_GREEN),
        ("Pads",    4000, 5000, VUNA_GREEN),
        ("Sugar",   3200, 4000, VUNA_GREEN),
    ], W))

    story.append(sp(0.4))

    story.append(GreenCalloutBox(
        "💡 Insight: Colgate is your best earner per item",
        "Even though Sugar sells the most units, Colgate makes you 1,900 UGX profit per sale — "
        "more than double Sugar's 800 UGX. If you can sell more Colgate, your total weekly profit "
        "will grow faster without needing to increase your overall stock volume.",
        W))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 2: YOUR COSTS
    # ══════════════════════════════════════════
    for el in section_header("Section 2", "Your Monthly Costs"):
        story.append(el)

    story.append(Paragraph(
        "Every business has two kinds of costs: money you spend to <b>buy goods to sell</b> "
        "(called restock costs), and money you spend to <b>keep the business running</b> "
        "(called running costs). Both come out of your sales money before you can call anything profit.",
        styles["body"]))

    story.append(sp(0.3))

    # Two-column cost tables
    left_data = [
        [Paragraph("Monthly Running Costs", styles["table_hdr"]),
         Paragraph("Amount (UGX)", styles["table_hdr"])],
        ["Shop rent", "100,000"],
        ["Bags & receipts", "4,000"],
        ["Utilities (power/water)", "10,000"],
        ["Transport to supplier", "4,000"],
        [Paragraph("<b>Total running costs</b>", styles["table_cell"]),
         Paragraph("<b>118,000</b>", styles["table_num_bold"])],
    ]
    right_data = [
        [Paragraph("Monthly Restock Costs", styles["table_hdr"]),
         Paragraph("Amount (UGX)", styles["table_hdr"])],
        ["Colgate (10/wk × 4wks × 3,100)", "124,000"],
        ["Pads (5/wk × 4wks × 4,000)",      "80,000"],
        ["Sugar (15/wk × 4wks × 3,200)",    "192,000"],
        ["Buffer stock / rounding",           "33,000"],
        [Paragraph("<b>Total restock</b>", styles["table_cell"]),
         Paragraph("<b>429,000</b>", styles["table_num_bold"])],
    ]

    left_t  = styled_table(left_data,  [3.2*cm, 2.8*cm], footer_row=True)
    right_t = styled_table(right_data, [3.8*cm, 2.5*cm], footer_row=True)

    story.append(Table([[left_t, sp(0), right_t]],
        colWidths=[6.2*cm, 0.4*cm, 6.6*cm],
        style=TableStyle([
            ("VALIGN",(0,0),(-1,-1),"TOP"),
            ("LEFTPADDING",(0,0),(-1,-1),0),
            ("RIGHTPADDING",(0,0),(-1,-1),0),
        ])))

    story.append(sp(0.35))
    story.append(Paragraph(
        "Your <b>total monthly cost</b> is <b>547,000 UGX</b> — that is 429,000 UGX to restock "
        "your goods plus 118,000 UGX to run the shop. Your monthly sales revenue is 585,000 UGX, "
        "which leaves you with <b>38,000 UGX net profit</b> each month.",
        styles["body"]))

    story.append(sp(0.3))

    story.append(CalloutBox(
        "⚠️  Watch out: Rent is your biggest running cost",
        "Shop rent at 100,000 UGX makes up <b>85% of your monthly running costs</b>. "
        "If your rent increases, your profit will shrink quickly. Always negotiate your rent "
        "before renewing, and consider whether sales volume can be increased to absorb any rise.",
        W, bg=colors.HexColor("#FEF9EC"), border_color=VUNA_ACCENT))

    story.append(sp(0.4))

    # Waterfall chart
    story.append(Paragraph("Monthly Money Flow — From Sales to Profit", styles["h2"]))
    story.append(Paragraph(
        "This chart shows where your sales money goes each month. "
        "The green bar on the left is what you earn. The red and orange bars show what "
        "gets spent. The dark green bar on the right is what remains as profit.",
        styles["body_small"]))
    story.append(ProfitWaterfallChart(W, height=5.5*cm))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 3: SALES TARGET
    # ══════════════════════════════════════════
    for el in section_header("Section 3", "Your Monthly Sales Target"):
        story.append(el)

    story.append(Paragraph(
        "A sales target is the <b>minimum number of items you must sell</b> in a month just to cover "
        "all your costs and keep the business going. It is not your goal — it is your <b>floor</b>. "
        "Anything you sell above this number adds to your profit.",
        styles["body"]))

    story.append(sp(0.25))

    target_data = [
        [Paragraph("How the Target is Calculated", styles["table_hdr"]),
         Paragraph("", styles["table_hdr"]),
         Paragraph("Amount", styles["table_hdr"])],
        ["Total monthly running costs", "÷", "118,000 UGX"],
        ["Average profit per item sold", "÷", "1,200 UGX"],
        [Paragraph("<b>Monthly sales target</b>", styles["table_cell"]),
         "=",
         Paragraph("<b>99 items / month</b>", styles["table_num_bold"])],
    ]
    story.append(styled_table(target_data, [7*cm, 1.2*cm, 5.1*cm], footer_row=True))

    story.append(sp(0.3))
    story.append(Paragraph(
        "You need to sell approximately <b>99 items every month</b> to cover your running costs. "
        "That breaks down to about <b>25 items per week</b>, or roughly <b>4 items per day</b>. "
        "You are currently selling 30 items per week — which means you are <b>already exceeding "
        "your target</b> and generating profit every month.",
        styles["body"]))

    story.append(sp(0.25))

    # Mini target progress visual
    story.append(Table([[
        Table([[
            Paragraph("Current weekly sales", styles["kpi_label"]),
            Paragraph("30 items", styles["kpi_value"]),
            Paragraph("per week", styles["kpi_sub"]),
        ]], colWidths=[W/3],
        style=TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),VUNA_LIGHT_BG),
            ("TOPPADDING",(0,0),(-1,-1),10),
            ("BOTTOMPADDING",(0,0),(-1,-1),10),
            ("BOX",(0,0),(-1,-1),0.4,VUNA_BORDER),
        ])),

        Table([[
            Paragraph("Needed per week (min)", styles["kpi_label"]),
            Paragraph("25 items", S("kv2", fontSize=18, leading=22,
                                     textColor=VUNA_ACCENT, fontName="Helvetica-Bold",
                                     alignment=TA_CENTER)),
            Paragraph("minimum to break even", styles["kpi_sub"]),
        ]], colWidths=[W/3],
        style=TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),VUNA_ACCENT_LIGHT),
            ("TOPPADDING",(0,0),(-1,-1),10),
            ("BOTTOMPADDING",(0,0),(-1,-1),10),
            ("BOX",(0,0),(-1,-1),0.4,VUNA_ACCENT),
        ])),

        Table([[
            Paragraph("Target reached by", styles["kpi_label"]),
            Paragraph("Day 23", S("kv3", fontSize=18, leading=22,
                                   textColor=VUNA_GREEN, fontName="Helvetica-Bold",
                                   alignment=TA_CENTER)),
            Paragraph("of each month", styles["kpi_sub"]),
        ]], colWidths=[W/3],
        style=TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),VUNA_LIGHT_BG),
            ("TOPPADDING",(0,0),(-1,-1),10),
            ("BOTTOMPADDING",(0,0),(-1,-1),10),
            ("BOX",(0,0),(-1,-1),0.4,VUNA_BORDER),
        ])),
    ]], colWidths=[W/3, W/3, W/3],
    style=TableStyle([
        ("LEFTPADDING",(0,0),(-1,-1),0),
        ("RIGHTPADDING",(0,0),(-1,-1),0),
        ("TOPPADDING",(0,0),(-1,-1),0),
        ("BOTTOMPADDING",(0,0),(-1,-1),0),
    ])))

    story.append(sp(0.3))
    story.append(GreenCalloutBox(
        "✅ You are ahead of your target",
        "At 30 items per week, you reach your monthly sales target by around Day 23 of each month. "
        "The last week of every month is essentially bonus profit. Use that extra money wisely — "
        "either reinvest it in stock or set it aside for slow months ahead.",
        W))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 4: STARTUP RECOVERY
    # ══════════════════════════════════════════
    for el in section_header("Section 4", "Getting Your Startup Money Back"):
        story.append(el)

    story.append(Paragraph(
        "When you started your business, you spent money upfront — on a licence and on your "
        "first month of stock. That money is called your <b>startup investment</b>. VunaMentor "
        "calculates how long it will take for your business profits to pay that money back to you.",
        styles["body"]))

    story.append(sp(0.25))

    startup_data = [
        [Paragraph("Startup Costs Breakdown", styles["table_hdr"]),
         Paragraph("Amount (UGX)", styles["table_hdr"])],
        ["Business licence (one-time fee)", "80,000"],
        ["First month of stock / supplies", "429,000"],
        [Paragraph("<b>Total startup investment</b>", styles["table_cell"]),
         Paragraph("<b>509,000</b>", styles["table_num_bold"])],
    ]
    story.append(styled_table(startup_data, [9.5*cm, 3.8*cm], footer_row=True))

    story.append(sp(0.3))
    story.append(Paragraph(
        "Your business earns <b>38,000 UGX in net profit every month</b>. "
        "At that rate, it will take approximately <b>13 months and 12 days</b> for your "
        "cumulative profits to equal your startup investment of 509,000 UGX. "
        "After that point, everything your business earns is <b>real, unencumbered profit</b>.",
        styles["body"]))

    story.append(sp(0.3))

    story.append(Paragraph("Recovery Progress Timeline", styles["h2"]))
    story.append(RecoveryTimeline(W))

    story.append(sp(0.5))
    story.append(Paragraph(
        "<b>Is 13 months normal?</b> Yes — for a small retail shop in Uganda, recovering "
        "startup money within 12–18 months is considered healthy. You are within that range. "
        "If you want to recover faster, you can increase your sales volume or raise your prices "
        "slightly — see Section 5 for guidance on pricing options.",
        styles["body"]))

    story.append(sp(0.3))
    story.append(CalloutBox(
        "⚠️  Do not withdraw more than your safe amount during recovery",
        "Taking out more money than your safe take-home amount will <b>slow down your recovery</b> "
        "and may leave the business without enough cash to restock. Stick to the safe limits in "
        "Section 5 until you have recovered your startup investment.",
        W, bg=colors.HexColor("#FEF9EC"), border_color=VUNA_ACCENT))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 5: TAKE-HOME PAY
    # ══════════════════════════════════════════
    for el in section_header("Section 5", "What You Can Safely Take Home"):
        story.append(el)

    story.append(Paragraph(
        "Your business is not a salary. It is a living thing that needs money to survive "
        "and grow. If you take out too much, you may not have enough to restock, pay rent, "
        "or handle a slow week. VunaMentor calculates a <b>safe take-home amount</b> — "
        "the maximum you can withdraw without putting the business at risk.",
        styles["body"]))

    story.append(sp(0.3))

    takehome_data = [
        [Paragraph("Monthly Money Breakdown", styles["table_hdr"]),
         Paragraph("Amount (UGX)", styles["table_hdr"])],
        ["Monthly sales revenue",       "585,000"],
        ["Minus: Monthly restock cost", "(429,000)"],
        ["Minus: Monthly running costs","(118,000)"],
        [Paragraph("<b>Monthly net profit</b>", styles["table_cell"]),
         Paragraph("<b>38,000</b>", styles["table_num_bold"])],
        ["Minus: 20% safety buffer (kept in business)", "(7,600)"],
        [Paragraph("<b>Safe amount to take home</b>", styles["table_cell"]),
         Paragraph("<b>30,400</b>", styles["table_num_bold"])],
    ]
    story.append(styled_table(takehome_data, [9.5*cm, 3.8*cm], footer_row=True))

    story.append(sp(0.3))
    story.append(Paragraph(
        "The <b>20% safety buffer</b> is money you leave in the business every month. "
        "It is your cushion for unexpected situations — a slow week, a price increase from "
        "your supplier, or an urgent repair. It is <b>not lost</b>; it stays in the business "
        "and builds up over time as your emergency fund.",
        styles["body"]))

    story.append(sp(0.3))

    story.append(KPIRow([
        ("Safe to take home / month", "30,400 UGX", ""),
        ("Safe to spend / week",      "7,015 UGX",  "÷ 4.33 weeks"),
        ("Safe to spend / day",         "999 UGX",  "÷ 30 days"),
    ], W))
    story.append(sp(0.2))
    story.append(KPIRow([
        ("Keep in business / month", "7,600 UGX",  "safety buffer 20%"),
        ("Keep in business / week",  "1,754 UGX",  "÷ 4.33 weeks"),
        ("Keep in business / day",     "250 UGX",  "÷ 30 days"),
    ], W))

    story.append(sp(0.35))
    story.append(GreenCalloutBox(
        "💡 Think of 999 UGX/day as your personal daily wage from this business",
        "If you need more personal income, the answer is not to take more from the business — "
        "it is to <b>grow the business</b> by selling more items or adding a fourth product. "
        "Growing your weekly sales from 30 to 40 items would increase your monthly profit "
        "significantly without changing your cost structure.",
        W))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 6: PRICING OPTIONS
    # ══════════════════════════════════════════
    for el in section_header("Section 6", "Your Pricing Options"):
        story.append(el)

    story.append(Paragraph(
        "Your current prices are working — but you have room to adjust them if you want "
        "to increase your profit or recover your startup money faster. VunaMentor gives "
        "you three clear pricing options: <b>Low, Medium, and High</b>. Each option applies "
        "a single, consistent multiplier across all your products so your pricing stays fair and "
        "predictable to customers.",
        styles["body"]))

    story.append(sp(0.3))

    # Pricing options table
    pricing_data = [
        [Paragraph("Option", styles["table_hdr"]),
         Paragraph("Multiplier", styles["table_hdr"]),
         Paragraph("Colgate Sell\n(UGX)", styles["table_hdr"]),
         Paragraph("Pads Sell\n(UGX)", styles["table_hdr"]),
         Paragraph("Sugar Sell\n(UGX)", styles["table_hdr"]),
         Paragraph("Est. Monthly\nProfit (UGX)", styles["table_hdr"]),
         Paragraph("Recommended?", styles["table_hdr"])],
        [Paragraph("<b>Low</b> (current)", styles["table_cell"]),
         "×1.00", "5,000", "5,000", "4,000", "38,000",
         Paragraph('<font color="#1A7A4A">✓ Good if competitive</font>',
                   styles["table_cell"])],
        [Paragraph("<b>Medium</b>", styles["table_cell"]),
         "×1.10", "5,500", "5,500", "4,400", "~56,000",
         Paragraph('<font color="#F5A623"><b>★ Recommended</b></font>',
                   styles["table_cell"])],
        [Paragraph("<b>High</b>", styles["table_cell"]),
         "×1.20", "6,000", "6,000", "4,800", "~74,000",
         Paragraph('<font color="#777">Use if low competition</font>',
                   styles["table_cell"])],
    ]
    story.append(styled_table(pricing_data,
        [2.8*cm, 2.0*cm, 2.0*cm, 2.0*cm, 2.0*cm, 2.5*cm, 2.0*cm]))

    story.append(sp(0.3))
    story.append(Paragraph(
        "The <b>Medium pricing option (×1.10)</b> is the most balanced choice. "
        "It adds a 10% increase on every item — for example, Colgate moves from 5,000 to 5,500 UGX. "
        "This small increase is unlikely to drive customers away, but it would raise your estimated "
        "monthly profit from 38,000 to approximately <b>56,000 UGX</b> — an improvement of almost 50%.",
        styles["body"]))

    story.append(sp(0.25))
    story.append(Paragraph(
        "The <b>High pricing option (×1.20)</b> gives you the fastest profit growth, "
        "but it comes with a risk: if nearby shops sell the same goods cheaper, your customers may "
        "go there instead. Only use the High option if you know your competition well.",
        styles["body"]))

    story.append(sp(0.35))
    story.append(CalloutBox(
        "📌 Pricing tip: Test before you commit",
        "Before raising all prices at once, try raising just one product — for example, "
        "increase Colgate from 5,000 to 5,500 UGX for two weeks and observe whether customers "
        "still buy at the same rate. If they do, you can safely apply the increase to all items.",
        W, bg=VUNA_ACCENT_LIGHT, border_color=VUNA_ACCENT))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 7: ACTION PLAN
    # ══════════════════════════════════════════
    for el in section_header("Section 7", "Your Next Steps — Action Plan"):
        story.append(el)

    story.append(Paragraph(
        "Knowing your numbers is the first step. Acting on them is what grows your business. "
        "Below is a simple action plan based on your VunaMentor report.",
        styles["body"]))

    story.append(sp(0.3))

    actions = [
        ("This Week",
         "Track your daily sales",
         "Write down every item you sell each day. After 7 days, check whether you reached "
         "your weekly target of 30 items. This habit will tell you quickly if something is wrong."),
        ("This Month",
         "Stay within your take-home limit",
         "Do not withdraw more than 30,400 UGX this month. Leave the 7,600 UGX safety "
         "buffer in the business. Check your cash at the end of the month."),
        ("Next 3 Months",
         "Test a price increase on one product",
         "Choose Colgate and raise the price from 5,000 to 5,500 UGX. Watch your sales for "
         "two weeks. If customers still buy, apply the same increase to Pads."),
        ("Within 6 Months",
         "Consider adding a fourth product",
         "Once you are comfortable with your cash flow, look for a fourth item that your "
         "customers often ask for. Adding one product with 1,000+ UGX profit per item "
         "could add 15,000–20,000 UGX to your monthly profit."),
        ("Within 13 Months",
         "Celebrate recovering your startup investment",
         "At your current pace, by Month 13 your business will have fully paid back your "
         "509,000 UGX startup cost. At that point, consider reinvesting a portion of your "
         "profit back into growing your stock."),
    ]

    action_rows = []
    for period, title, body in actions:
        action_rows.append([
            Paragraph(period, S("aperiod", fontSize=8.5, textColor=WHITE,
                                fontName="Helvetica-Bold", alignment=TA_CENTER,
                                leading=12)),
            [Paragraph(f"<b>{title}</b>", styles["callout_title"]),
             Paragraph(body, styles["body_small"])],
        ])

    for i, row in enumerate(action_rows):
        period_cell = Table([[row[0]]], colWidths=[2.2*cm],
            style=TableStyle([
                ("BACKGROUND",(0,0),(-1,-1), VUNA_GREEN if i % 2 == 0 else VUNA_DARK),
                ("TOPPADDING",(0,0),(-1,-1),10),
                ("BOTTOMPADDING",(0,0),(-1,-1),10),
                ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ]))

        body_content = row[1]
        body_cell = Table([[
            Paragraph(f"<b>{actions[i][1]}</b>", styles["callout_title"]),
        ],[
            Paragraph(actions[i][2], styles["body_small"]),
        ]], colWidths=[W - 2.4*cm],
        style=TableStyle([
            ("TOPPADDING",(0,0),(-1,-1),6),
            ("BOTTOMPADDING",(0,0),(-1,-1),4),
            ("LEFTPADDING",(0,0),(-1,-1),10),
        ]))

        bg = VUNA_LIGHT_BG if i % 2 == 0 else WHITE
        row_table = Table([[period_cell, body_cell]], colWidths=[2.2*cm, W - 2.2*cm],
            style=TableStyle([
                ("BACKGROUND",(0,0),(-1,-1), bg),
                ("TOPPADDING",(0,0),(-1,-1),0),
                ("BOTTOMPADDING",(0,0),(-1,-1),0),
                ("LEFTPADDING",(0,0),(-1,-1),0),
                ("RIGHTPADDING",(0,0),(-1,-1),0),
                ("BOX",(0,0),(-1,-1),0.4,VUNA_BORDER),
                ("LINEBELOW",(0,0),(-1,-1),0.3,VUNA_BORDER),
                ("VALIGN",(0,0),(-1,-1),"TOP"),
            ]))
        story.append(row_table)
        story.append(sp(0.08))

    story.append(sp(0.4))
    story.append(GreenCalloutBox(
        "🌱 Remember: Small, consistent actions beat big, irregular ones",
        "You do not need to change everything at once. Track your numbers weekly, stay within "
        "your take-home limit, and make one small improvement each month. Over 13 months, "
        "those small steps will recover your startup investment and build a stable business.",
        W))

    # ══════════════════════════════════════════
    # FINAL PAGE: DISCLAIMER + ABOUT
    # ══════════════════════════════════════════
    story.append(PageBreak())

    for el in section_header("About This Report", "How VunaMentor Works"):
        story.append(el)

    story.append(Paragraph(
        "VunaMentor is the business planning tool built into <b>VunaBooks</b>, "
        "Uganda's small business accounting and advisory platform at "
        "<b>plan.vunabooks.com</b>. This report was generated automatically from the "
        "numbers you entered in Simple Mode.",
        styles["body"]))

    story.append(sp(0.25))
    story.append(Paragraph(
        "Simple Mode is designed for business owners who are <b>new to financial planning</b> "
        "or who prefer plain-language guidance over technical accounting terms. "
        "All calculations in this report use standard retail business formulas.",
        styles["body"]))

    story.append(sp(0.35))
    story.append(HR())

    story.append(Paragraph("Disclaimer", styles["h2"]))
    story.append(Paragraph(
        "This report is based entirely on the numbers you entered. VunaMentor does not verify "
        "prices, sales volumes, or costs with external sources. If your real numbers change — "
        "for example, if your rent increases or you start selling more items — you should "
        "update your VunaMentor plan to get a new report. This document is for <b>guidance only</b> "
        "and does not constitute professional financial or legal advice.",
        styles["disclaimer"]))

    story.append(sp(0.5))

    # Footer logo block
    story.append(Table([[
        Paragraph(
            '<font size="14"><b><font color="#1A7A4A">Vuna</font>'
            '<font color="#0D3D25">Books</font></b></font>',
            S("logo", fontName="Helvetica-Bold", fontSize=14)),
        Paragraph(
            '<font color="#777">plan.vunabooks.com<br/>'
            'Simple accounting for Ugandan businesses</font>',
            S("logoSub", fontSize=8.5, leading=12, textColor=TEXT_LIGHT)),
    ]], colWidths=[4*cm, W-4*cm],
    style=TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),VUNA_LIGHT_BG),
        ("TOPPADDING",(0,0),(-1,-1),12),
        ("BOTTOMPADDING",(0,0),(-1,-1),12),
        ("LEFTPADDING",(0,0),(-1,-1),14),
        ("BOX",(0,0),(-1,-1),0.5,VUNA_BORDER),
    ])))

    # ── BUILD ─────────────────────────
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print("✅  PDF written to /mnt/user-data/outputs/VunaMentor_Retail_Plan.pdf")


if __name__ == "__main__":
    build()
