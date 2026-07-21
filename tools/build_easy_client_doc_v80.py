from __future__ import annotations

import shutil
import zipfile
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
DESKTOP = Path.home() / "Desktop"
OUT_DIR = DESKTOP / "gaggum_option_simulator_easy_client_docs_v80"
ZIP_PATH = DESKTOP / "gaggum_option_simulator_easy_client_docs_v80.zip"

DOCX_PATH = OUT_DIR / "00_option_simulator_easy_guide_v80.docx"
PDF_PATH = OUT_DIR / "00_option_simulator_easy_guide_v80.pdf"
GENERATOR = ROOT / "tools" / "option_simulator_csv_generator.html"
SAMPLE_CSV = ROOT / "nd" / "images" / "simulator" / "products" / "1034" / "simulator.csv"

FONT_KO = "Apple SD Gothic Neo"
PDF_FONT = "ArialUnicode"
PDF_FONT_PATH = Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf")


def set_run_font(run, size=10.5, bold=False, color="111111"):
    run.font.name = FONT_KO
    run._element.rPr.rFonts.set(qn("w:eastAsia"), FONT_KO)
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = RGBColor.from_string(color)


def shade_cell(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def put_cell(cell, text, bold=False, fill=None):
    if fill:
        shade_cell(cell, fill)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    cell.text = ""
    p = cell.paragraphs[0]
    r = p.add_run(text)
    set_run_font(r, 9.5, bold=bold)


def add_table(doc, headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    for i, header in enumerate(headers):
        put_cell(table.rows[0].cells[i], header, bold=True, fill="E8EEF5")
    for row in rows:
        cells = table.add_row().cells
        for i, value in enumerate(row):
            put_cell(cells[i], value)
    if widths:
        for row in table.rows:
            for i, width in enumerate(widths):
                row.cells[i].width = Inches(width)
    doc.add_paragraph()


def add_callout(doc, title, body, fill="FFF6D9"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    cell = table.cell(0, 0)
    shade_cell(cell, fill)
    p = cell.paragraphs[0]
    r = p.add_run(title)
    set_run_font(r, 10.5, bold=True)
    p.add_run("\n")
    r = p.add_run(body)
    set_run_font(r, 10)
    doc.add_paragraph()


def add_code(doc, lines):
    table = doc.add_table(rows=1, cols=1)
    cell = table.cell(0, 0)
    shade_cell(cell, "F5F6F8")
    p = cell.paragraphs[0]
    r = p.add_run("\n".join(lines))
    r.font.name = "Courier New"
    r._element.rPr.rFonts.set(qn("w:eastAsia"), FONT_KO)
    r.font.size = Pt(9)
    doc.add_paragraph()


def setup_doc(doc):
    sec = doc.sections[0]
    sec.top_margin = Inches(0.75)
    sec.bottom_margin = Inches(0.75)
    sec.left_margin = Inches(0.8)
    sec.right_margin = Inches(0.8)
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = FONT_KO
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), FONT_KO)
    normal.font.size = Pt(10.5)
    normal.paragraph_format.line_spacing = 1.18
    normal.paragraph_format.space_after = Pt(5)
    for name, size, color in [
        ("Title", 22, "111111"),
        ("Heading 1", 15, "2E74B5"),
        ("Heading 2", 12.5, "1F4D78"),
    ]:
        st = styles[name]
        st.font.name = FONT_KO
        st._element.rPr.rFonts.set(qn("w:eastAsia"), FONT_KO)
        st.font.size = Pt(size)
        st.font.color.rgb = RGBColor.from_string(color)


def add_numbers(doc, items):
    for item in items:
        p = doc.add_paragraph(style="List Number")
        p.add_run(item)


def build_docx():
    doc = Document()
    setup_doc(doc)

    p = doc.add_paragraph(style="Title")
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run("옵션 시뮬레이터 CSV 수정 가이드")
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("제3자 운영자용 / 이 문서만 보고 수정할 수 있도록 정리")
    set_run_font(r, 11, color="666666")

    add_callout(
        doc,
        "핵심 한 문장",
        "CSV는 완성 이미지 목록이 아니라, 옵션값별로 어떤 레이어 이미지를 보여줄지 정하는 연결표입니다.",
        "EAF2F8",
    )

    doc.add_heading("1. 먼저 용어부터 이해하기", level=1)
    add_table(
        doc,
        ["용어", "뜻", "예시"],
        [
            ["layer", "이미지를 겹쳐 보여줄 부품 이름", "frame, top, seat"],
            ["image", "실제로 보여줄 PNG 이미지 경로", "top/wide-edge-maple.png"],
            ["옵션값", "고객이 사이트에서 선택하는 값", "700 x 500, 메이플, 블랙"],
            ["default=Y", "처음 열었을 때 보여줄 기본 조합", "기본 상판, 기본 프레임, 기본 의자"],
        ],
        widths=[1.25, 3.2, 2.05],
    )

    doc.add_heading("2. top과 seat가 여러 줄 나오는 이유", level=1)
    add_callout(
        doc,
        "중복이 아닙니다",
        "같은 layer 이름이 여러 번 나오는 것은 정상입니다. 같은 부품이라도 옵션값이 다르면 다른 이미지를 보여줘야 하기 때문입니다.",
    )
    add_table(
        doc,
        ["CSV 행", "의미"],
        [
            ["top, ..., top/plus-edge-matte-white.png, ..., 650 x 450, 엣지 상판, 매트 화이트", "650 x 450 / 엣지 / 매트 화이트 상판을 선택하면 이 top 이미지를 보여줍니다."],
            ["top, ..., top/wide-round-maple.png, ..., 700 x 500, 라운드 상판, 메이플", "700 x 500 / 라운드 / 메이플 상판을 선택하면 이 top 이미지를 보여줍니다."],
            ["seat, ..., seat/black.png, ..., 블랙", "의자 컬러가 블랙이면 이 seat 이미지를 보여줍니다."],
            ["seat, ..., seat/deep-green.png, ..., 딥그린", "의자 컬러가 딥그린이면 이 seat 이미지를 보여줍니다."],
        ],
        widths=[3.4, 3.1],
    )

    doc.add_heading("3. 기본 컬러만 쓰는 건가요?", level=1)
    add_callout(
        doc,
        "아닙니다",
        "CSV에는 기본 컬러만 적는 것이 아니라, 옵션 선택에 따라 바뀌어야 하는 이미지들을 모두 등록합니다. default=Y는 처음 보이는 기본 조합을 지정할 뿐, 전체 컬러를 제한하지 않습니다.",
    )
    add_code(
        doc,
        [
            "기본 조합 예시:",
            "frame,1,frame/basic-plus-white.png,Y,650 x 450,,,화이트,",
            "top,2,top/plus-edge-matte-white.png,Y,650 x 450,엣지 상판,매트 화이트,,",
            "seat,3,seat/black.png,Y,,,,,블랙",
        ],
    )

    doc.add_heading("4. 수정할 때는 이렇게만 보면 됩니다", level=1)
    add_numbers(
        doc,
        [
            "카페24 상품 옵션에 새 옵션값을 먼저 추가합니다.",
            "그 옵션값에 따라 이미지가 바뀌어야 하는지 확인합니다.",
            "이미지가 바뀐다면 PNG 이미지를 준비합니다.",
            "CSV에서 해당 layer 행을 추가합니다.",
            "image 칸에는 업로드한 이미지 경로를 적습니다.",
            "옵션값 칸에는 사이트에 보이는 옵션값과 동일하게 적습니다.",
            "저장한 simulator.csv와 이미지를 /web/upload/simulator/상품번호/ 폴더에 업로드합니다.",
        ],
    )

    doc.add_heading("5. 실제 추가 예시", level=1)
    doc.add_heading("의자 컬러에 레드가 추가되는 경우", level=2)
    add_code(doc, ["seat,3,seat/red.png,,,,,레드"])
    doc.add_heading("상판 컬러에 오크가 추가되는 경우", level=2)
    add_code(doc, ["top,2,top/wide-edge-oak.png,,700 x 500,엣지 상판,오크,,"])

    doc.add_heading("6. 파일 업로드 위치", level=1)
    add_code(
        doc,
        [
            "/web/upload/simulator/상품번호/",
            "  simulator.csv",
            "  top/",
            "    wide-edge-oak.png",
            "  seat/",
            "    red.png",
        ],
    )

    doc.add_heading("7. 마지막 체크", level=1)
    add_table(
        doc,
        ["확인 항목", "설명"],
        [
            ["같은 layer가 여러 줄 있다", "정상입니다. 옵션별 이미지 조건입니다."],
            ["default=Y가 있다", "처음 보일 기본 조합입니다."],
            ["옵션값이 사이트와 같다", "띄어쓰기까지 최대한 동일하게 맞춥니다."],
            ["image 경로와 파일명이 같다", "다르면 이미지만 안 보입니다."],
        ],
        widths=[2.1, 4.4],
    )

    doc.add_paragraph("정리하면, CSV는 ‘옵션값별 이미지 연결표’입니다. 옵션값이 늘어나면 그 옵션값에 맞는 이미지 행을 추가하면 됩니다.")
    doc.save(DOCX_PATH)


def pdf_styles():
    pdfmetrics.registerFont(TTFont(PDF_FONT, str(PDF_FONT_PATH)))
    base = getSampleStyleSheet()["BodyText"]
    return {
        "title": ParagraphStyle("title", parent=base, fontName=PDF_FONT, fontSize=20, leading=25, alignment=TA_CENTER, spaceAfter=6),
        "sub": ParagraphStyle("sub", parent=base, fontName=PDF_FONT, fontSize=10, leading=14, alignment=TA_CENTER, textColor=colors.HexColor("#666666"), spaceAfter=14),
        "h1": ParagraphStyle("h1", parent=base, fontName=PDF_FONT, fontSize=14, leading=18, textColor=colors.HexColor("#2E74B5"), spaceBefore=12, spaceAfter=6),
        "h2": ParagraphStyle("h2", parent=base, fontName=PDF_FONT, fontSize=11.5, leading=15, textColor=colors.HexColor("#1F4D78"), spaceBefore=8, spaceAfter=4),
        "body": ParagraphStyle("body", parent=base, fontName=PDF_FONT, fontSize=9.6, leading=13, spaceAfter=5),
        "small": ParagraphStyle("small", parent=base, fontName=PDF_FONT, fontSize=8.6, leading=11),
    }


def esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")


def pp(text, style):
    return Paragraph(esc(text), style)


def pdf_table(headers, rows, widths, st):
    data = [[pp(h, st["small"]) for h in headers]]
    data.extend([[pp(c, st["small"]) for c in row] for row in rows])
    table = Table(data, colWidths=[w * inch for w in widths], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8EEF5")),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#C8D0D8")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def pdf_callout(title, body, st, fill="#FFF6D9"):
    table = Table([[pp(f"{title}\n{body}", st["small"])]], colWidths=[7.1 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(fill)),
                ("BOX", (0, 0), (-1, -1), 0.35, colors.HexColor("#D8DDE3")),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def pdf_numbers(items, st):
    return ListFlowable(
        [ListItem(pp(item, st["body"]), leftIndent=12) for item in items],
        bulletType="1",
        start="1",
        leftIndent=18,
        bulletFontName=PDF_FONT,
        bulletFontSize=9,
    )


def build_pdf():
    st = pdf_styles()
    doc = SimpleDocTemplate(str(PDF_PATH), pagesize=letter, leftMargin=0.7 * inch, rightMargin=0.7 * inch, topMargin=0.65 * inch, bottomMargin=0.65 * inch)
    story = [
        pp("옵션 시뮬레이터 CSV 수정 가이드", st["title"]),
        pp("제3자 운영자용 / 이 문서만 보고 수정할 수 있도록 정리", st["sub"]),
        pdf_callout("핵심 한 문장", "CSV는 완성 이미지 목록이 아니라, 옵션값별로 어떤 레이어 이미지를 보여줄지 정하는 연결표입니다.", st, "#EAF2F8"),
        Spacer(1, 8),
        pp("1. 먼저 용어부터 이해하기", st["h1"]),
        pdf_table(["용어", "뜻", "예시"], [
            ["layer", "이미지를 겹쳐 보여줄 부품 이름", "frame, top, seat"],
            ["image", "실제로 보여줄 PNG 이미지 경로", "top/wide-edge-maple.png"],
            ["옵션값", "고객이 사이트에서 선택하는 값", "700 x 500, 메이플, 블랙"],
            ["default=Y", "처음 열었을 때 보여줄 기본 조합", "기본 상판, 기본 프레임, 기본 의자"],
        ], [1.2, 3.3, 2.6], st),
        pp("2. top과 seat가 여러 줄 나오는 이유", st["h1"]),
        pdf_callout("중복이 아닙니다", "같은 layer 이름이 여러 번 나오는 것은 정상입니다. 같은 부품이라도 옵션값이 다르면 다른 이미지를 보여줘야 하기 때문입니다.", st),
        pdf_table(["CSV 행", "의미"], [
            ["top, ..., top/plus-edge-matte-white.png, ..., 650 x 450, 엣지 상판, 매트 화이트", "650 x 450 / 엣지 / 매트 화이트 상판을 선택하면 이 top 이미지를 보여줍니다."],
            ["top, ..., top/wide-round-maple.png, ..., 700 x 500, 라운드 상판, 메이플", "700 x 500 / 라운드 / 메이플 상판을 선택하면 이 top 이미지를 보여줍니다."],
            ["seat, ..., seat/black.png, ..., 블랙", "의자 컬러가 블랙이면 이 seat 이미지를 보여줍니다."],
            ["seat, ..., seat/deep-green.png, ..., 딥그린", "의자 컬러가 딥그린이면 이 seat 이미지를 보여줍니다."],
        ], [3.45, 3.65], st),
        pp("3. 기본 컬러만 쓰는 건가요?", st["h1"]),
        pdf_callout("아닙니다", "CSV에는 기본 컬러만 적는 것이 아니라, 옵션 선택에 따라 바뀌어야 하는 이미지들을 모두 등록합니다. default=Y는 처음 보이는 기본 조합을 지정할 뿐, 전체 컬러를 제한하지 않습니다.", st),
        pp("4. 수정할 때는 이렇게만 보면 됩니다", st["h1"]),
        pdf_numbers([
            "카페24 상품 옵션에 새 옵션값을 먼저 추가합니다.",
            "그 옵션값에 따라 이미지가 바뀌어야 하는지 확인합니다.",
            "이미지가 바뀐다면 PNG 이미지를 준비합니다.",
            "CSV에서 해당 layer 행을 추가합니다.",
            "image 칸에는 업로드한 이미지 경로를 적습니다.",
            "옵션값 칸에는 사이트에 보이는 옵션값과 동일하게 적습니다.",
            "저장한 simulator.csv와 이미지를 /web/upload/simulator/상품번호/ 폴더에 업로드합니다.",
        ], st),
        pp("5. 실제 추가 예시", st["h1"]),
        pp("의자 컬러에 레드가 추가되는 경우", st["h2"]),
        pdf_table(["추가 행"], [["seat,3,seat/red.png,,,,,레드"]], [7.1], st),
        pp("상판 컬러에 오크가 추가되는 경우", st["h2"]),
        pdf_table(["추가 행"], [["top,2,top/wide-edge-oak.png,,700 x 500,엣지 상판,오크,,"]], [7.1], st),
        pp("6. 파일 업로드 위치", st["h1"]),
        pdf_table(["구조"], [["/web/upload/simulator/상품번호/\n  simulator.csv\n  top/wide-edge-oak.png\n  seat/red.png"]], [7.1], st),
        pp("7. 마지막 체크", st["h1"]),
        pdf_table(["확인 항목", "설명"], [
            ["같은 layer가 여러 줄 있다", "정상입니다. 옵션별 이미지 조건입니다."],
            ["default=Y가 있다", "처음 보일 기본 조합입니다."],
            ["옵션값이 사이트와 같다", "띄어쓰기까지 최대한 동일하게 맞춥니다."],
            ["image 경로와 파일명이 같다", "다르면 이미지만 안 보입니다."],
        ], [2.2, 4.9], st),
        pdf_callout("정리", "CSV는 옵션값별 이미지 연결표입니다. 옵션값이 늘어나면 그 옵션값에 맞는 이미지 행을 추가하면 됩니다.", st, "#EAF2F8"),
    ]
    doc.build(story)


def package():
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)
    build_docx()
    build_pdf()
    shutil.copy2(GENERATOR, OUT_DIR / "01_csv_generator.html")
    shutil.copy2(SAMPLE_CSV, OUT_DIR / "02_sample_simulator_csv_1034.csv")
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as z:
        for path in sorted(OUT_DIR.rglob("*")):
            z.write(path, path.relative_to(DESKTOP))


if __name__ == "__main__":
    package()
