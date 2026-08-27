import { getAppBaseUrl } from "@/lib/app-url";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ReceiptDownloadInput = {
  receiptNumber: string;
  authorNames: string;
  title: string;
  manuscriptId: string;
  journalTitle: string;
  amountLabel: string;
  paidAtLabel: string;
  reference?: string | null;
  customerEmail?: string | null;
};

/** Standalone printable/downloadable APC receipt (not the email CID version). */
export function apcReceiptDownloadHtml(opts: ReceiptDownloadInput) {
  const logoUrl = `${getAppBaseUrl()}/brand/logo-nahda.png`;
  const row = (label: string, value: string, last = false) => `
    <tr>
      <td style="padding:10px 0;${last ? "" : "border-bottom:1px solid #d7dee7;"}color:#5b6b7c;font-size:13px">${escapeHtml(label)}</td>
      <td style="padding:10px 0;${last ? "" : "border-bottom:1px solid #d7dee7;"}text-align:right;color:#0b1f33;font-size:14px">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(opts.receiptNumber)} — Nahda Publications receipt</title>
  <style>
    body { margin: 0; background: #f7faf8; color: #0b1f33; font-family: Georgia, "Times New Roman", serif; }
    .sheet { max-width: 640px; margin: 28px auto; background: #fff; border: 1px solid #d7dee7; padding: 32px 36px; }
    @media print { body { background: #fff; } .sheet { margin: 0; border: none; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="sheet">
    <img src="${escapeHtml(logoUrl)}" alt="Nahda Publications" width="180" style="display:block;width:180px;max-width:60%;height:auto" />
    <p style="margin:18px 0 6px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#5b6b7c;font-weight:700">Payment receipt</p>
    <h1 style="margin:0 0 18px;font-size:26px">Article processing charge</h1>
    <p style="margin:0 0 8px">Paid in full for <strong>${escapeHtml(opts.title)}</strong>.</p>
    <p style="margin:0 0 22px;color:#5b6b7c;font-size:14px">${escapeHtml(opts.authorNames)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d7dee7">
      <tr>
        <td style="background:#1e6847;padding:22px;text-align:center;color:#fff">
          <p style="margin:0;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;opacity:.8">Amount paid</p>
          <p style="margin:8px 0 0;font-size:34px;font-weight:700">${escapeHtml(opts.amountLabel)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 22px 18px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${row("Merchant", "Nahda Publications")}
            ${row("Receipt no.", `<span style="font-family:ui-monospace,Menlo,monospace;font-size:12px">${escapeHtml(opts.receiptNumber)}</span>`)}
            ${row("Paid on", escapeHtml(opts.paidAtLabel))}
            ${row("Journal", escapeHtml(opts.journalTitle))}
            ${row("Manuscript", `<span style="font-family:ui-monospace,Menlo,monospace;font-size:12px">${escapeHtml(opts.manuscriptId)}</span>`)}
            ${opts.customerEmail ? row("Billed to", escapeHtml(opts.customerEmail)) : ""}
            ${row("Reference", escapeHtml(opts.reference || "—"), true)}
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:18px 0 0;font-size:13px;color:#5b6b7c">
      Amounts are stated in US dollars (USD). Keep this receipt for your records.
    </p>
  </div>
</body>
</html>`;
}

export function receiptDownloadFilename(receiptNumber: string) {
  const safe = receiptNumber.replace(/[^A-Za-z0-9._-]/g, "-");
  return `${safe || "nahda-receipt"}.html`;
}
