import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("[mail] SMTP_USER/SMTP_PASS not configured — emails skipped");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.info(`[mail:dry-run] to=${options.to} subject=${options.subject}`);
    return { ok: false as const, skipped: true };
  }

  const from =
    process.env.SMTP_FROM ??
    `Atlas Academic Publishing <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  return { ok: true as const, skipped: false };
}

export function welcomeEmailHtml(name: string) {
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#0b1f33">
    <h1 style="font-size:22px">Welcome to Atlas, ${name}</h1>
    <p>Your account is ready. You can sign in, submit manuscripts, and track peer review from your dashboard.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login" style="background:#0f6b6a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Sign in</a></p>
    <p style="color:#5b6b7c;font-size:13px">Atlas Academic Publishing</p>
  </div>`;
}

export function loginAlertEmailHtml(name: string, when: string) {
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#0b1f33">
    <h1 style="font-size:22px">New sign-in to your Atlas account</h1>
    <p>Hi ${name},</p>
    <p>We noticed a successful sign-in at <strong>${when}</strong>.</p>
    <p style="color:#5b6b7c;font-size:13px">If this was not you, reset your password or contact support.</p>
  </div>`;
}

export function reviewFeedbackEmailHtml(opts: {
  authorName: string;
  title: string;
  status: string;
  message: string;
  manuscriptId: string;
}) {
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#0b1f33">
    <h1 style="font-size:22px">Review update for ${opts.manuscriptId}</h1>
    <p>Hi ${opts.authorName},</p>
    <p>Your manuscript <strong>${opts.title}</strong> has a new editorial update.</p>
    <p><strong>Status:</strong> ${opts.status}</p>
    <div style="background:#eef2f6;padding:14px;border-radius:10px;margin:16px 0">
      ${opts.message.replace(/\n/g, "<br/>")}
    </div>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard" style="background:#0f6b6a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open dashboard</a></p>
  </div>`;
}

export function reviewerInviteEmailHtml(opts: {
  name: string;
  email: string;
  tempNote: string;
}) {
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#0b1f33">
    <h1 style="font-size:22px">You have been added as a reviewer</h1>
    <p>Hi ${opts.name},</p>
    <p>A super admin created a reviewer account for you on Atlas Academic Publishing.</p>
    <p><strong>Email:</strong> ${opts.email}</p>
    <p>${opts.tempNote}</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin/login" style="background:#0f6b6a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open admin panel</a></p>
  </div>`;
}
