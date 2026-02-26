import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  ImageRun,
  UnderlineType,
} from 'docx';

// Colour constants (from RCS TOC Document Style Guide)
export const COLOR = {
  DEEP_BLUE: '1F4E79',
  MID_BLUE: '2E75B6',
  LIGHT_BLUE: 'D6E4F0',
  ACCENT_GOLD: 'C9A84C',
  LIGHT_GOLD: 'FDF3DC',
  WHITE: 'FFFFFF',
  LIGHT_GRAY: 'F5F5F5',
  MED_GRAY: 'DDDDDD',
  TEXT_DARK: '1A1A1A',
} as const;

// Page setup constants
export const CONTENT_WIDTH_DXA = 9360;

// Standard cell borders
export const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: COLOR.MED_GRAY },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR.MED_GRAY },
  left: { style: BorderStyle.SINGLE, size: 1, color: COLOR.MED_GRAY },
  right: { style: BorderStyle.SINGLE, size: 1, color: COLOR.MED_GRAY },
} as const;

// -------------------------
// Document helpers
// -------------------------

export function createRcsDoc(children: (Paragraph | Table)[]) {
  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children,
      },
    ],
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '\u2022',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 560, hanging: 280 },
                },
              },
            },
          ],
        },
        {
          reference: 'numbers',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 560, hanging: 280 },
                },
              },
            },
          ],
        },
      ],
    },
  });
}

export async function packDoc(doc: Document) {
  return Packer.toBuffer(doc);
}

// -------------------------
// Components (exact per guide)
// -------------------------

// 1) TITLE BLOCK
export function titleBlock(teacherName: string, className: string, subtitle: string, courseDetail?: string) {
  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH_DXA],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
            shading: { fill: COLOR.DEEP_BLUE, type: ShadingType.CLEAR },
            borders: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR.ACCENT_GOLD },
            },
            margins: { top: 300, bottom: 300, left: 360, right: 360 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: teacherName,
                    size: 22,
                    color: COLOR.ACCENT_GOLD,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({
                    text: className,
                    bold: true,
                    size: 40,
                    color: COLOR.WHITE,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: subtitle,
                    size: 28,
                    color: COLOR.ACCENT_GOLD,
                    font: 'Arial',
                  }),
                ],
              }),
              ...(courseDetail
                ? [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 80 },
                      children: [
                        new TextRun({
                          text: courseDetail,
                          size: 22,
                          color: COLOR.LIGHT_BLUE,
                          font: 'Arial',
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          }),
        ],
      }),
    ],
  });
}

// Header variant (separate named variant)
export function headerWithWordmark(opts: {
  wordmarkPng: Buffer;
  teacherName: string;
  className: string;
  subtitle: string;
  courseDetail?: string;
}) {
  const leftW = 2600;
  const rightW = CONTENT_WIDTH_DXA - leftW;

  const img = new ImageRun({
    type: 'png',
    data: opts.wordmarkPng,
    transformation: { width: 210, height: 70 },
  });

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [leftW, rightW],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: leftW, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: COLOR.WHITE },
              bottom: { style: BorderStyle.NONE, size: 0, color: COLOR.WHITE },
              left: { style: BorderStyle.NONE, size: 0, color: COLOR.WHITE },
              right: { style: BorderStyle.NONE, size: 0, color: COLOR.WHITE },
            },
            margins: { top: 120, bottom: 120, left: 0, right: 200 },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [img],
              }),
            ],
          }),
          new TableCell({
            width: { size: rightW, type: WidthType.DXA },
            shading: { fill: COLOR.DEEP_BLUE, type: ShadingType.CLEAR },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: COLOR.WHITE },
              left: { style: BorderStyle.NONE, size: 0, color: COLOR.WHITE },
              right: { style: BorderStyle.NONE, size: 0, color: COLOR.WHITE },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR.ACCENT_GOLD },
            },
            margins: { top: 260, bottom: 260, left: 260, right: 260 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: opts.teacherName,
                    size: 22,
                    color: COLOR.ACCENT_GOLD,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({
                    text: opts.className,
                    bold: true,
                    size: 40,
                    color: COLOR.WHITE,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: opts.subtitle,
                    size: 28,
                    color: COLOR.ACCENT_GOLD,
                    font: 'Arial',
                  }),
                ],
              }),
              ...(opts.courseDetail
                ? [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 80 },
                      children: [
                        new TextRun({
                          text: opts.courseDetail,
                          size: 22,
                          color: COLOR.LIGHT_BLUE,
                          font: 'Arial',
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          }),
        ],
      }),
    ],
  });
}

// 2) SECTION HEADER
export function sectionHeader(label: string, title: string) {
  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH_DXA],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
            shading: { fill: COLOR.DEEP_BLUE, type: ShadingType.CLEAR },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: COLOR.ACCENT_GOLD },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.ACCENT_GOLD },
              left: { style: BorderStyle.SINGLE, size: 4, color: COLOR.ACCENT_GOLD },
              right: { style: BorderStyle.SINGLE, size: 4, color: COLOR.ACCENT_GOLD },
            },
            margins: { top: 160, bottom: 160, left: 240, right: 240 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: label,
                    bold: true,
                    size: 20,
                    color: COLOR.ACCENT_GOLD,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 36,
                    color: COLOR.WHITE,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// 3) SUB-HEADER
export function subHeader(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, color: COLOR.MID_BLUE, font: 'Arial' })],
    spacing: { before: 200, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR.MED_GRAY } },
  });
}

// 4) BODY PARAGRAPH
export function body(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: 'Arial', color: COLOR.TEXT_DARK })],
    spacing: { after: 80 },
  });
}

// 5) BULLET ITEM
export function bulletItem(text: string) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun({ text, size: 20, font: 'Arial', color: COLOR.TEXT_DARK })],
    spacing: { before: 30, after: 30 },
  });
}

// 6) NUMBERED ITEM
export function numberedItem(text: string) {
  return new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    children: [new TextRun({ text, size: 20, font: 'Arial', color: COLOR.TEXT_DARK })],
    spacing: { before: 30, after: 30 },
  });
}

// 7) SPACER
export function spacer() {
  return new Paragraph({
    children: [new TextRun('')],
    spacing: { before: 80, after: 80 },
  });
}

// 8) BLUE INFO BOX
export function blueBox(title: string, children: Paragraph[]) {
  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH_DXA],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: COLOR.MID_BLUE },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.MID_BLUE },
              left: { style: BorderStyle.SINGLE, size: 12, color: COLOR.MID_BLUE },
              right: { style: BorderStyle.SINGLE, size: 4, color: COLOR.MID_BLUE },
            },
            shading: { fill: COLOR.LIGHT_BLUE, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 20,
                    font: 'Arial',
                    color: COLOR.DEEP_BLUE,
                  }),
                ],
                spacing: { after: 80 },
              }),
              ...children,
            ],
          }),
        ],
      }),
    ],
  });
}

// 9) GOLD HIGHLIGHT BOX
export function goldBox(title: string, children: Paragraph[]) {
  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH_DXA],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: COLOR.ACCENT_GOLD },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.ACCENT_GOLD },
              left: { style: BorderStyle.SINGLE, size: 12, color: COLOR.ACCENT_GOLD },
              right: { style: BorderStyle.SINGLE, size: 4, color: COLOR.ACCENT_GOLD },
            },
            shading: { fill: COLOR.LIGHT_GOLD, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 20,
                    font: 'Arial',
                    color: COLOR.ACCENT_GOLD,
                  }),
                ],
                spacing: { after: 80 },
              }),
              ...children,
            ],
          }),
        ],
      }),
    ],
  });
}

// 10) INFO TABLE
export function infoTable(rows: Array<[label: string, value: string]>) {
  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [2200, 7160],
    rows: rows.map(([label, value], i) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2200, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: COLOR.LIGHT_BLUE, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: label,
                    bold: true,
                    size: 19,
                    font: 'Arial',
                    color: COLOR.DEEP_BLUE,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 7160, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: i % 2 === 0 ? COLOR.WHITE : COLOR.LIGHT_GRAY, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: value, size: 19, font: 'Arial', color: COLOR.TEXT_DARK })],
              }),
            ],
          }),
        ],
      })
    ),
  });
}

// 11) ROLE TABLE
export function roleTable(rows: Array<[who: string, responsibility: string]>) {
  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [2400, 6960],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2400, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: COLOR.MID_BLUE, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'WHO', bold: true, size: 19, font: 'Arial', color: COLOR.WHITE }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 6960, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: COLOR.MID_BLUE, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'RESPONSIBILITY',
                    bold: true,
                    size: 19,
                    font: 'Arial',
                    color: COLOR.WHITE,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      ...rows.map(([who, resp], i) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 2400, type: WidthType.DXA },
              borders: cellBorders,
              shading: { fill: i % 2 === 0 ? COLOR.LIGHT_BLUE : COLOR.WHITE, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 80 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: who,
                      bold: true,
                      size: 19,
                      font: 'Arial',
                      color: COLOR.DEEP_BLUE,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 6960, type: WidthType.DXA },
              borders: cellBorders,
              shading: { fill: i % 2 === 0 ? COLOR.LIGHT_BLUE : COLOR.WHITE, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 80 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: resp, size: 19, font: 'Arial', color: COLOR.TEXT_DARK })],
                }),
              ],
            }),
          ],
        })
      ),
    ],
  });
}

// 12) PHASE TABLE (4 columns)
export function phaseTable(phases: Array<{ time: string; phase: string; activity: string; purpose: string }>) {
  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [1100, 1700, 4360, 2200],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1100, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: COLOR.MID_BLUE, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'TIME', bold: true, size: 18, font: 'Arial', color: COLOR.WHITE })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1700, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: COLOR.MID_BLUE, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'PHASE', bold: true, size: 18, font: 'Arial', color: COLOR.WHITE })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4360, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: COLOR.MID_BLUE, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'ACTIVITY', bold: true, size: 18, font: 'Arial', color: COLOR.WHITE }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2200, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: COLOR.MID_BLUE, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'PURPOSE', bold: true, size: 18, font: 'Arial', color: COLOR.WHITE }),
                ],
              }),
            ],
          }),
        ],
      }),
      ...phases.map(({ time, phase, activity, purpose }, i) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 1100, type: WidthType.DXA },
              borders: cellBorders,
              shading: { fill: i % 2 === 0 ? COLOR.LIGHT_GOLD : COLOR.WHITE, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 80 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: time, bold: true, size: 18, font: 'Arial', color: COLOR.DEEP_BLUE })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 1700, type: WidthType.DXA },
              borders: cellBorders,
              shading: { fill: i % 2 === 0 ? COLOR.LIGHT_GOLD : COLOR.WHITE, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 80 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: phase, bold: true, size: 18, font: 'Arial', color: COLOR.DEEP_BLUE })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 4360, type: WidthType.DXA },
              borders: cellBorders,
              shading: { fill: i % 2 === 0 ? COLOR.LIGHT_BLUE : COLOR.WHITE, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 80 },
              children: activity.split('\n\n').map((para) =>
                new Paragraph({
                  children: [new TextRun({ text: para, size: 18, font: 'Arial', color: COLOR.TEXT_DARK })],
                  spacing: { after: 60 },
                })
              ),
            }),
            new TableCell({
              width: { size: 2200, type: WidthType.DXA },
              borders: cellBorders,
              shading: { fill: i % 2 === 0 ? COLOR.LIGHT_BLUE : COLOR.WHITE, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 80 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: purpose,
                      size: 18,
                      font: 'Arial',
                      color: COLOR.TEXT_DARK,
                      italics: true,
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      ),
    ],
  });
}

// 13) ACTIVITY OPTION BLOCK
export function activityBox(
  number: string,
  title: string,
  description: string,
  details: Paragraph[]
) {
  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [600, 8760],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 600, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: COLOR.DEEP_BLUE, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 120, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: number,
                    bold: true,
                    size: 28,
                    font: 'Arial',
                    color: COLOR.ACCENT_GOLD,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 8760, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: COLOR.DEEP_BLUE, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 160, right: 120 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: title, bold: true, size: 22, font: 'Arial', color: COLOR.WHITE })],
              }),
              new Paragraph({
                children: [new TextRun({ text: description, size: 19, font: 'Arial', color: COLOR.LIGHT_BLUE })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 600, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: COLOR.LIGHT_GOLD, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 80 },
            children: [new Paragraph({ children: [] })],
          }),
          new TableCell({
            width: { size: 8760, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: COLOR.WHITE, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 160, right: 120 },
            children: details,
          }),
        ],
      }),
    ],
  });
}

// 13) ATTENDANCE SHEET TABLE (Word)
export function attendanceSheetTable(students: Array<{ first_name: string; last_name: string }>) {
  const colW = {
    num: 520,
    name: 4020,
    present: 860,
    absent: 860,
    late: 860,
    notes: 2240,
  };

  const headerRow = new TableRow({
    children: [
      attendanceHeaderCell('#', colW.num),
      attendanceHeaderCell('Student Name', colW.name),
      attendanceHeaderCell('Present', colW.present),
      attendanceHeaderCell('Absent', colW.absent),
      attendanceHeaderCell('Late', colW.late),
      attendanceHeaderCell('Notes', colW.notes),
    ],
  });

  const bodyRows = (students ?? []).map((s, i) => {
    const fill = i % 2 === 0 ? COLOR.LIGHT_BLUE : COLOR.WHITE;
    const n = String(i + 1);
    const full = `${String(s.last_name ?? '').trim()}, ${String(s.first_name ?? '').trim()}`.trim();

    return new TableRow({
      children: [
        attendanceBodyCell(n, colW.num, fill, AlignmentType.CENTER),
        attendanceBodyCell(full, colW.name, fill, AlignmentType.LEFT),
        attendanceBodyCell('', colW.present, fill, AlignmentType.CENTER),
        attendanceBodyCell('', colW.absent, fill, AlignmentType.CENTER),
        attendanceBodyCell('', colW.late, fill, AlignmentType.CENTER),
        attendanceBodyCell('', colW.notes, fill, AlignmentType.LEFT),
      ],
    });
  });

  const totalsFill = COLOR.LIGHT_GOLD;
  const totalsRow = new TableRow({
    children: [
      attendanceBodyCell('', colW.num, totalsFill, AlignmentType.CENTER),
      attendanceBodyCell('Totals', colW.name, totalsFill, AlignmentType.LEFT, true),
      attendanceBodyCell('', colW.present, totalsFill, AlignmentType.CENTER),
      attendanceBodyCell('', colW.absent, totalsFill, AlignmentType.CENTER),
      attendanceBodyCell('', colW.late, totalsFill, AlignmentType.CENTER),
      attendanceBodyCell('', colW.notes, totalsFill, AlignmentType.LEFT),
    ],
  });

  const signatureRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 6,
        width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
        borders: cellBorders,
        shading: { fill: COLOR.WHITE, type: ShadingType.CLEAR },
        margins: { top: 160, bottom: 160, left: 160, right: 160 },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'TOC Signature: ', bold: true, font: 'Arial', size: 20, color: COLOR.TEXT_DARK }),
              new TextRun({
                text: '______________________________',
                font: 'Arial',
                size: 20,
                color: COLOR.TEXT_DARK,
                underline: { type: UnderlineType.SINGLE },
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [colW.num, colW.name, colW.present, colW.absent, colW.late, colW.notes],
    rows: [headerRow, ...bodyRows, totalsRow, signatureRow],
  });
}

function attendanceHeaderCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders,
    shading: { fill: COLOR.MID_BLUE, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 80 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text, bold: true, size: 19, font: 'Arial', color: COLOR.WHITE })],
      }),
    ],
  });
}

type Alignment = (typeof AlignmentType)[keyof typeof AlignmentType];

function attendanceBodyCell(text: string, width: number, fill: string, align: Alignment, bold = false) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders,
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 80 },
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text, bold, size: 19, font: 'Arial', color: COLOR.TEXT_DARK })],
      }),
    ],
  });
}
