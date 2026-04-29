// src/components/modal-mantenciones/TableSkeletonRows.tsx
import React from "react";

type Props = {
  cols: number;
  rows?: number;
};

export default function TableSkeletonRows({ cols, rows = 8 }: Props) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={`sk-${i}`} className="border-t border-slate-200">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={`sk-${i}-${j}`} className="px-4 py-3">
              <div className="h-4 w-full max-w-[260px] animate-pulse rounded bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}