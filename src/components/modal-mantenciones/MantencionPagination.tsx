import React from "react";

function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

type Props = {
    total: number;
    page: number;
    totalPages: number;
    pageSize: number;
    state: "idle" | "loading" | "error";
    setPage: React.Dispatch<React.SetStateAction<number>>;
    setPageSize: React.Dispatch<React.SetStateAction<number>>;
};

export default function MantencionPagination({
    total,
    page,
    totalPages,
    pageSize,
    state,
    setPage,
    setPageSize,
}: Props) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-cyan-200">
            <div className="text-sm text-slate-700 text-center sm:text-left">
                Total <strong className="text-slate-900">{total}</strong> • Página{" "}
                <strong className="text-slate-900">{page}</strong> de{" "}
                <strong className="text-slate-900">{totalPages}</strong>
            </div>

            <div className="grid grid-cols-3 sm:flex sm:items-center gap-2">
                <button
                    onClick={() => page > 1 && setPage((p) => p - 1)}
                    disabled={page <= 1 || state === "loading"}
                    className={clsx(
                        "inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm",
                        "border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50",
                        (page <= 1 || state === "loading") &&
                        "opacity-40 cursor-not-allowed hover:bg-white"
                    )}
                    type="button"
                >
                    Anterior
                </button>

                <select
                    value={pageSize}
                    onChange={(e) => {
                        setPage(1);
                        setPageSize(Number(e.target.value));
                    }}
                    className="rounded-2xl border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                >
                    {[10, 20, 50].map((n) => (
                        <option key={n} value={n}>
                            {n}/página
                        </option>
                    ))}
                </select>

                <button
                    onClick={() => page < totalPages && setPage((p) => p + 1)}
                    disabled={page >= totalPages || state === "loading"}
                    className={clsx(
                        "inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm",
                        "border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50",
                        (page >= totalPages || state === "loading") &&
                        "opacity-40 cursor-not-allowed hover:bg-white"
                    )}
                    type="button"
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
}