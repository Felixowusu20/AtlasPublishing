import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { getAppBaseUrl } from "@/lib/app-url";

const BRAND = {
  name: "Nahda Publications",
  green: "#1e6847",
  ink: "#0b1f33",
  muted: "#5b6b7c",
  line: "#d7dee7",
  paper: "#f7faf8",
};

function appBaseUrl() {
  return getAppBaseUrl();
}

function logoFilePath() {
  return path.join(process.cwd(), "public", "brand", "logo-nahda.png");
}

function getTransporter() {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASS ?? "").replace(/\s+/g, "");

  if (!user || !pass) {
    console.warn("[mail] SMTP_USER/SMTP_PASS not configured — emails skipped");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

/** Shared document-style letterhead with Nahda logo. */
function emailDocument(opts: {
  title: string;
  bodyHtml: string;
  cta?: { href: string; label: string };
  footerNote?: string;
}) {
  const logoSrc = "cid:nahda-logo";
  const cta = opts.cta
    ? `<p style="margin:28px 0 8px">
        <a href="${opts.cta.href}"
           style="background:${BRAND.green};color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-family:Georgia,'Times New Roman',serif;font-size:15px">
          ${opts.cta.label}
        </a>
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.paper}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.paper};padding:28px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BRAND.line}">
          <tr>
            <td style="padding:28px 36px 18px;border-bottom:1px solid ${BRAND.line}">
              <img src="${logoSrc}" alt="Nahda Publications" width="200" style="display:block;width:200px;max-width:70%;height:auto;border:0" />
            </td>
          </tr>
          <tr>
            <td style="padding:28px 36px 8px;font-family:Georgia,'Times New Roman',serif;color:${BRAND.ink};font-size:16px;line-height:1.65">
              <h1 style="margin:0 0 18px;font-size:22px;line-height:1.35;font-weight:700;color:${BRAND.ink}">
                ${opts.title}
              </h1>
              ${opts.bodyHtml}
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px 28px;border-top:1px solid ${BRAND.line};font-family:Georgia,'Times New Roman',serif;color:${BRAND.muted};font-size:13px;line-height:1.55">
              ${opts.footerNote ? `<p style="margin:0 0 10px">${opts.footerNote}</p>` : ""}
              <p style="margin:0;color:${BRAND.green};font-weight:600">${BRAND.name}</p>
              <p style="margin:4px 0 0">Scholarly publishing for researchers worldwide</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Send an email. Never throws — SMTP failures are logged and reported
 * via the return value so fire-and-forget callers can't crash the server.
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; skipped: boolean; error?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    console.info(`[mail:dry-run] to=${options.to} subject=${options.subject}`);
    return { ok: false, skipped: true };
  }

  const from =
    process.env.SMTP_FROM ??
    `Nahda Publications <${process.env.SMTP_USER}>`;

  const attachments: {
    filename: string;
    path: string;
    cid: string;
  }[] = [];

  const logoPath = logoFilePath();
  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: "logo-nahda.png",
      path: logoPath,
      cid: "nahda-logo",
    });
  }

  try {
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments,
    });
    return { ok: true, skipped: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[mail] failed to send "${options.subject}" to ${options.to}: ${message}`,
    );
    return { ok: false, skipped: false, error: message };
  }
}

export function welcomeEmailHtml(name: string) {
  const loginUrl = `${appBaseUrl()}/login`;
  return emailDocument({
    title: `Welcome to Nahda Publications`,
    bodyHtml: `
      <p style="margin:0 0 14px">Dear ${escapeHtml(name)},</p>
      <p style="margin:0 0 14px">
        Your author account is ready. You may sign in to submit manuscripts,
        track peer review, and manage your publications.
      </p>
    `,
    cta: { href: loginUrl, label: "Sign in to your account" },
  });
}

export function loginAlertEmailHtml(name: string, when: string) {
  return emailDocument({
    title: "New sign-in to your account",
    bodyHtml: `
      <p style="margin:0 0 14px">Dear ${escapeHtml(name)},</p>
      <p style="margin:0 0 14px">
        We recorded a successful sign-in to your Nahda Publications account at
        <strong>${escapeHtml(when)}</strong>.
      </p>
      <p style="margin:0 0 14px">
        If this was not you, please reset your password or contact support.
      </p>
    `,
  });
}

export function reviewFeedbackEmailHtml(opts: {
  authorName: string;
  title: string;
  status: string;
  message: string;
  manuscriptId: string;
  submissionUrl: string;
  needsRevision?: boolean;
}) {
  return emailDocument({
    title: `Editorial update: ${escapeHtml(opts.manuscriptId)}`,
    bodyHtml: `
      <p style="margin:0 0 14px">Dear ${escapeHtml(opts.authorName)},</p>
      <p style="margin:0 0 14px">
        Your manuscript <strong>${escapeHtml(opts.title)}</strong>
        (${escapeHtml(opts.manuscriptId)}) has a new editorial update.
      </p>
      <p style="margin:0 0 8px"><strong>Status:</strong> ${escapeHtml(opts.status)}</p>
      <div style="background:${BRAND.paper};border:1px solid ${BRAND.line};padding:16px 18px;margin:16px 0">
        <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.muted}">
          Editor / reviewer message
        </p>
        <p style="margin:0;white-space:pre-wrap">${escapeHtml(opts.message).replace(/\n/g, "<br/>")}</p>
      </div>
      ${
        opts.needsRevision
          ? `<p style="margin:0 0 14px">Please revise your manuscript and use <strong>Resubmit</strong> on your author portal to return the corrected file for review.</p>`
          : ""
      }
    `,
    cta: { href: opts.submissionUrl, label: "Open manuscript" },
  });
}

export function resubmissionEmailHtml(opts: {
  authorName: string;
  title: string;
  manuscriptId: string;
  submissionUrl: string;
}) {
  return emailDocument({
    title: `Resubmission received: ${escapeHtml(opts.manuscriptId)}`,
    bodyHtml: `
      <p style="margin:0 0 14px">Dear ${escapeHtml(opts.authorName)},</p>
      <p style="margin:0 0 14px">
        We have received your revised manuscript
        <strong>${escapeHtml(opts.title)}</strong>. It is now back under review.
      </p>
    `,
    cta: { href: opts.submissionUrl, label: "Track progress" },
  });
}

export function reviewerResubmissionNoticeHtml(opts: {
  reviewerName: string;
  authorName: string;
  title: string;
  manuscriptId: string;
  adminUrl: string;
}) {
  return emailDocument({
    title: `Author resubmitted ${escapeHtml(opts.manuscriptId)}`,
    bodyHtml: `
      <p style="margin:0 0 14px">Dear ${escapeHtml(opts.reviewerName)},</p>
      <p style="margin:0 0 14px">
        ${escapeHtml(opts.authorName)} has uploaded a revised file for
        <strong>${escapeHtml(opts.title)}</strong>.
      </p>
    `,
    cta: { href: opts.adminUrl, label: "Open in inbox" },
  });
}

export function reviewerInviteEmailHtml(opts: {
  name: string;
  email: string;
  tempNote: string;
}) {
  return emailDocument({
    title: "Reviewer account created",
    bodyHtml: `
      <p style="margin:0 0 14px">Dear ${escapeHtml(opts.name)},</p>
      <p style="margin:0 0 14px">
        A reviewer account has been created for you on Nahda Publications.
      </p>
      <p style="margin:0 0 14px"><strong>Email:</strong> ${escapeHtml(opts.email)}</p>
      <p style="margin:0 0 14px">${escapeHtml(opts.tempNote)}</p>
    `,
    cta: {
      href: `${appBaseUrl()}/admin/login`,
      label: "Open admin panel",
    },
  });
}

export function passwordResetEmailHtml(opts: {
  name: string;
  resetUrl: string;
}) {
  return emailDocument({
    title: "Reset your password",
    bodyHtml: `
      <p style="margin:0 0 14px">Dear ${escapeHtml(opts.name)},</p>
      <p style="margin:0 0 14px">
        We received a request to reset the password for your Nahda Publications
        author account. This link expires in one hour.
      </p>
    `,
    cta: { href: opts.resetUrl, label: "Choose a new password" },
    footerNote:
      "If you did not request this change, you may ignore this message. Your password will remain unchanged.",
  });
}

export function articlePublishedEmailHtml(opts: {
  authorName: string;
  title: string;
  manuscriptId: string;
  journalTitle: string;
  articleUrl: string;
  pdfUrl?: string | null;
}) {
  const links = opts.pdfUrl
    ? `
      <p style="margin:0 0 14px">
        Your article is now available. You may download the final PDF or visit
        the public article page.
      </p>`
    : `
      <p style="margin:0 0 14px">
        Your article is now available on the Nahda Publications website.
      </p>`;

  const secondary = opts.pdfUrl
    ? `<p style="margin:12px 0 0;font-size:14px">
         <a href="${opts.articleUrl}" style="color:${BRAND.green}">View article page</a>
       </p>`
    : "";

  return emailDocument({
    title: "Your article is published",
    bodyHtml: `
      <p style="margin:0 0 14px">Dear ${escapeHtml(opts.authorName)},</p>
      <p style="margin:0 0 14px">
        Your manuscript <strong>${escapeHtml(opts.title)}</strong>
        (${escapeHtml(opts.manuscriptId)}) has been published in
        <em>${escapeHtml(opts.journalTitle)}</em>.
      </p>
      ${links}
      ${secondary}
    `,
    cta: {
      href: opts.pdfUrl || opts.articleUrl,
      label: opts.pdfUrl
        ? "Download published PDF"
        : "View published article",
    },
  });
}

export function apcPaymentEmailHtml(opts: {
  authorName: string;
  title: string;
  manuscriptId: string;
  journalTitle: string;
  amountLabel: string;
  checkoutUrl: string;
  submissionUrl: string;
}) {
  return emailDocument({
    title: "Manuscript accepted: payment required",
    bodyHtml: `
      <p style="margin:0 0 14px">Dear ${escapeHtml(opts.authorName)},</p>
      <p style="margin:0 0 14px">
        <strong>${escapeHtml(opts.title)}</strong>
        (${escapeHtml(opts.manuscriptId)}) has been accepted for publication in
        <em>${escapeHtml(opts.journalTitle)}</em>.
      </p>
      <p style="margin:0 0 14px">
        To proceed to production, please pay the article processing charge of
        <strong>${escapeHtml(opts.amountLabel)}</strong>.
      </p>
      <p style="margin:0 0 14px;font-size:14px;color:${BRAND.muted}">
        You may also open your manuscript page:
        <a href="${opts.submissionUrl}" style="color:${BRAND.green}">${escapeHtml(opts.submissionUrl)}</a>
      </p>
    `,
    cta: { href: opts.checkoutUrl, label: "Pay article processing charge" },
  });
}
