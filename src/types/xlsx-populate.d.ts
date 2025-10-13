// src/types/xlsx-populate.d.ts

declare module 'xlsx-populate/browser/xlsx-populate' {
  export type CellValue = string | number | boolean | Date | null | undefined;

  export interface Cell {
    value(): CellValue;
    value(v: CellValue): Cell;
    relativeCell(rowOffset: number, colOffset: number): Cell;
  }

  export interface Worksheet {
    cell(a1: string | [number, number]): Cell;
  }

  export interface Workbook {
    sheet(nameOrIndex: string | number): Worksheet;
    outputAsync(): Promise<ArrayBuffer>;
  }

  interface XlsxPopulateStatic {
    fromDataAsync(data: ArrayBuffer | Uint8Array | Blob): Promise<Workbook>;
    fromBlankAsync(): Promise<Workbook>;
  }

  const XlsxPopulate: XlsxPopulateStatic;
  export type Sheet = Worksheet;
  export default XlsxPopulate;
}
