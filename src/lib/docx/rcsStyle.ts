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
} from 'docx';

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

export const CONTENT_WIDTH_DXA = 9360;

export const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: COLOR.MED_GRAY },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR.MED_GRAY },
  left: { style: BorderStyle.SINGLE, size: 1, color: COLOR.MED_GRAY },
  right: { style: BorderStyle.SINGLE, size: 1, color: COLOR.MED_GRAY },
} as const;

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
              style: { paragraph: { indent: { left: 560, hanging: 280 } } },
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
              style: { paragraph: { indent: { left: 560, hanging: 280 } } },
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

export function spacer() {
  return new Paragraph({ children: [new TextRun('')], spacing: { before: 80, after: 80 } });
}

export function body(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: 'Arial', color: COLOR.TEXT_DARK })],
    spacing: { after: 80 },
  });
}

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
