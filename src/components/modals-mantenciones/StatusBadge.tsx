// src/components/modal-mantenciones/StatusBadge.tsx
import React from "react";
import type { MantencionStatus } from "../../lib/mantencionesRemotasApi";

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type Props = {
  status: MantencionStatus | string;
};

export default function StatusBadge({ status }: Props) {
  const norm = (status || "").toUpperCase();

  const styles: Record<string, string> = {
    COMPLETADA: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    EN_CURSO: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  };

  const klass =
    styles[norm] || "bg-slate-50 text-slate-700 ring-1 ring-slate-200";

  return (
    <span
      className={clsx(
        "px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide",
        klass
      )}
    >
      {status}
    </span>
  );
}