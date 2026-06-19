import html2canvas from "html2canvas";

type Html2CanvasOptions = NonNullable<Parameters<typeof html2canvas>[1]>;

const PDF_LIGHT_STYLE = `
  html,
  body {
    color-scheme: light !important;
    background: #ffffff !important;
  }

  .pdf-export-light,
  .pdf-export-light body,
  .pdf-export-light .page,
  .pdf-export-light .pdf-container {
    color-scheme: light !important;
    background: #ffffff !important;
    background-color: #ffffff !important;
    color: #111827 !important;
  }

  .pdf-export-light * {
    color-scheme: light !important;
    box-shadow: none !important;
  }

  .pdf-export-light p,
  .pdf-export-light span,
  .pdf-export-light div,
  .pdf-export-light label,
  .pdf-export-light li,
  .pdf-export-light td,
  .pdf-export-light th,
  .pdf-export-light h1,
  .pdf-export-light h2,
  .pdf-export-light h3,
  .pdf-export-light h4,
  .pdf-export-light h5,
  .pdf-export-light h6,
  .pdf-export-light b,
  .pdf-export-light strong {
    color: #111827 !important;
  }

  .pdf-export-light table,
  .pdf-export-light tbody,
  .pdf-export-light tr {
    background: #ffffff !important;
    background-color: #ffffff !important;
  }

  .pdf-export-light th,
  .pdf-export-light thead,
  .pdf-export-light thead tr {
    background: #f8fafc !important;
    background-color: #f8fafc !important;
    color: #111827 !important;
  }

  .pdf-export-light td {
    background-color: transparent !important;
    color: #111827 !important;
  }

  .pdf-export-light .pdf-section,
  .pdf-export-light .card,
  .pdf-export-light .info-box,
  .pdf-export-light .observaciones,
  .pdf-export-light .payment-info,
  .pdf-export-light .comentarios-box {
    color: #111827 !important;
    border-color: #d1d5db !important;
  }

  .pdf-export-light .card.gray,
  .pdf-export-light .bg-gray-50,
  .pdf-export-light .bg-slate-50 {
    background: #f9fafb !important;
    background-color: #f9fafb !important;
  }

  .pdf-export-light .card.blue,
  .pdf-export-light .bg-blue-50,
  .pdf-export-light .bg-cyan-50 {
    background: #eef6ff !important;
    background-color: #eef6ff !important;
  }

  .pdf-export-light .section-title,
  .pdf-export-light .empresa-nombre {
    color: #111827 !important;
  }

  .pdf-export-light .empresa-meta,
  .pdf-export-light .fechas,
  .pdf-export-light .item-desc,
  .pdf-export-light .item-meta,
  .pdf-export-light .footer {
    color: #374151 !important;
  }

  .pdf-export-light .sii-box,
  .pdf-export-light .sii-box * {
    color: #c43a3a !important;
  }

  .pdf-export-light img {
    background: transparent !important;
  }
`;

export function prepararContenedorPdf(
    container: HTMLElement,
    width: string
) {
    container.classList.add("pdf-export-light");

    container.style.position = "fixed";
    container.style.left = "-99999px";
    container.style.top = "0";
    container.style.width = width;
    container.style.background = "#ffffff";
    container.style.backgroundColor = "#ffffff";
    container.style.color = "#111827";
    container.style.zIndex = "-1";
    container.style.pointerEvents = "none";

    const style = document.createElement("style");
    style.setAttribute("data-pdf-light-style", "true");
    style.textContent = PDF_LIGHT_STYLE;

    container.prepend(style);
}

export function forzarModoClaroEnClone(clonedDoc: Document) {
    clonedDoc.documentElement.classList.remove("a11y-theme-dark");
    clonedDoc.documentElement.style.colorScheme = "light";

    if (clonedDoc.body) {
        clonedDoc.body.classList.remove("a11y-theme-dark");
        clonedDoc.body.style.background = "#ffffff";
        clonedDoc.body.style.backgroundColor = "#ffffff";
        clonedDoc.body.style.color = "#111827";
    }

    const style = clonedDoc.createElement("style");
    style.setAttribute("data-pdf-light-style", "true");
    style.textContent = PDF_LIGHT_STYLE;

    clonedDoc.head.appendChild(style);
}

export function getHtml2CanvasPdfOptions(
    options: Html2CanvasOptions = {}
): Html2CanvasOptions {
    const previousOnClone = options.onclone;

    return {
        ...options,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc, element) => {
            forzarModoClaroEnClone(clonedDoc);

            if (previousOnClone) {
                previousOnClone(clonedDoc, element);
            }
        },
    };
}