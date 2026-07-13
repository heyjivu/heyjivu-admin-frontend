import { strToU8, zipSync } from 'fflate';

type WorkbookCell = string | number | null | undefined;

export function downloadXlsx(
  fileName: string,
  sheetName: string,
  headers: string[],
  rows: WorkbookCell[][]
): void {
  const worksheet = buildWorksheet(headers, rows);
  const files = {
    '[Content_Types].xml': strToU8(contentTypesXml),
    '_rels/.rels': strToU8(rootRelationshipsXml),
    'docProps/app.xml': strToU8(appPropertiesXml),
    'docProps/core.xml': strToU8(corePropertiesXml),
    'xl/workbook.xml': strToU8(buildWorkbookXml(sheetName)),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRelationshipsXml),
    'xl/styles.xml': strToU8(stylesXml),
    'xl/worksheets/sheet1.xml': strToU8(worksheet)
  };
  const bytes = zipSync(files, { level: 6 });
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildWorksheet(headers: string[], rows: WorkbookCell[][]): string {
  const allRows = [headers, ...rows];
  const rowXml = allRows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => buildCell(value, rowIndex + 1, columnIndex, rowIndex === 0)).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');
  const lastCell = `${columnName(Math.max(headers.length - 1, 0))}${Math.max(allRows.length, 1)}`;
  const columnWidths = headers.map((header, index) => {
    const longestValue = rows.reduce((longest, row) => Math.max(longest, String(row[index] ?? '').length), header.length);
    const width = Math.min(Math.max(longestValue + 2, 12), 44);
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join('');

  return xml(`
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
      <sheetFormatPr defaultRowHeight="15"/>
      <cols>${columnWidths}</cols>
      <sheetData>${rowXml}</sheetData>
      <autoFilter ref="A1:${lastCell}"/>
    </worksheet>
  `);
}

function buildCell(value: WorkbookCell, row: number, column: number, header: boolean): string {
  const reference = `${columnName(column)}${row}`;
  const style = header ? ' s="1"' : '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"${style}><v>${value}</v></c>`;
  }

  return `<c r="${reference}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(String(value ?? ''))}</t></is></c>`;
}

function columnName(index: number): string {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildWorkbookXml(sheetName: string): string {
  return xml(`
    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <sheets><sheet name="${escapeXml(sheetName.slice(0, 31) || 'Users')}" sheetId="1" r:id="rId1"/></sheets>
    </workbook>
  `);
}

function xml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body.replace(/>\s+</g, '><').trim()}`;
}

const contentTypesXml = xml(`
  <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
    <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
    <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  </Types>
`);

const rootRelationshipsXml = xml(`
  <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
    <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
  </Relationships>
`);

const workbookRelationshipsXml = xml(`
  <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  </Relationships>
`);

const stylesXml = xml(`
  <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>
    <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/><bgColor indexed="64"/></patternFill></fill></fills>
    <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
    <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
    <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
    <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  </styleSheet>
`);

const appPropertiesXml = xml(`
  <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
    <Application>HeyJivu Admin</Application>
  </Properties>
`);

const corePropertiesXml = xml(`
  <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <dc:creator>HeyJivu Admin</dc:creator>
    <cp:lastModifiedBy>HeyJivu Admin</cp:lastModifiedBy>
  </cp:coreProperties>
`);
