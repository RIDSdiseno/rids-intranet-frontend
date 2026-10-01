  // src/types/xlsx-populate.d.ts

  declare module "xlsx-populate/browser/xlsx-populate" {
      export type CellValue =
          string |
          number |
          boolean |
          Date |
          null |
          undefined;

      export interface Cell {
          value(): CellValue;

          value(
              v: CellValue
          ): Cell;

          relativeCell(
              rowOffset: number,
              colOffset: number
          ): Cell;
      }

      export interface Column {
          width(): number;

          width(
              value: number
          ): Column;
      }

      export interface Row {
          height(): number;

          height(
              value: number
          ): Row;
      }

      export interface Range {
          merged(): boolean;

          merged(
              value: boolean
          ): Range;

          style(
              value: Record<
                  string,
                  unknown
              >
          ): Range;
      }

      export interface Worksheet {
          /* =========================
            CELDAS
          ========================= */

          cell(
              address: string
          ): Cell;

          cell(
              row: number,
              column: number
          ): Cell;

          /* =========================
            RANGOS
          ========================= */

          range(
              address: string
          ): Range;

          range(
              startRow: number,
              startColumn: number,
              endRow: number,
              endColumn: number
          ): Range;

          /* =========================
            COLUMNAS / FILAS
          ========================= */

          column(
              column:
                  number |
                  string
          ): Column;

          row(
              row: number
          ): Row;

          /* =========================
            NOMBRE HOJA
          ========================= */

          name(): string;

          name(
              value: string
          ): Worksheet;

          /* =========================
            FREEZE
          ========================= */

          freezePanes?(
              row: number,
              column: number
          ): Worksheet;
      }

      export interface Workbook {
          sheet(
              nameOrIndex:
                  string |
                  number
          ): Worksheet;

          outputAsync():
              Promise<ArrayBuffer>;
      }

      interface XlsxPopulateStatic {
          fromDataAsync(
              data:
                  ArrayBuffer |
                  Uint8Array |
                  Blob
          ): Promise<Workbook>;

          fromBlankAsync():
              Promise<Workbook>;
      }

      const XlsxPopulate:
          XlsxPopulateStatic;

      export type Sheet =
          Worksheet;

      export default XlsxPopulate;
  }