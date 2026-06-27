export function buildHtmlDocument(bodyHtml: string, css: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
${css}
/* Print layout overrides for headless PDF */
@page { size: A4; margin: 8mm; }
body { background: white; margin: 0; padding: 0; }
.page-preview { padding: 0; }
.page-toolbar, .no-print, .card-remove, .page-label { display: none !important; }
.a4-page {
  width: 210mm;
  min-height: 297mm;
  page-break-after: always;
  box-shadow: none;
  margin: 0;
  padding: 4mm;
}
.a4-page:last-child { page-break-after: avoid; }
</style>
</head>
<body>
<div class="page-preview">
${bodyHtml}
</div>
</body>
</html>`;
}
