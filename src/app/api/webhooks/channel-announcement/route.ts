import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  fetchOgImage,
  parseWhatsAppAnnouncementText,
} from "@/lib/whatsapp-announcement";
import { jsonCreated, jsonError, jsonOk } from "@/lib/api";

/**
 * Automation webhook for channel → announcements.
 * Auth: Authorization: Bearer <ANNOUNCEMENT_WEBHOOK_SECRET>
 *        or x-nahda-webhook-secret header
 *
 * Body options:
 *  { "text": "<pasted WhatsApp post>" }
 *  { "title", "summary", "href?", "imageUrl?" }
 *
 * Note: WhatsApp Channels have no public feed API. Use this from n8n / Make /
 * a relay bot, or call from admin paste import.
 */
const textSchema = z.object({
  text: z.string().min(8),
  imageUrl: z.string().url().optional().nullable(),
});

const fieldsSchema = z.object({
  title: z.string().min(2),
  summary: z.string().min(2),
  href: z.string().url().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

function authorize(request: Request): boolean {
  const secret = process.env.ANNOUNCEMENT_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : null;
  const header = request.headers.get("x-nahda-webhook-secret")?.trim();
  return bearer === secret || header === secret;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return jsonError("Unauthorized webhook", 401);
  }

  try {
    const raw = await request.json();
    let title: string;
    let summary: string;
    let href: string | null;
    let imageUrl: string | null;

    if (typeof raw?.text === "string") {
      const body = textSchema.parse(raw);
      const parsed = parseWhatsAppAnnouncementText(body.text);
      title = parsed.title;
      summary = parsed.summary;
      href = parsed.href;
      imageUrl = body.imageUrl?.trim() || null;
    } else {
      const body = fieldsSchema.parse(raw);
      title = body.title.trim();
      summary = body.summary.trim();
      href = body.href?.trim() || null;
      imageUrl = body.imageUrl?.trim() || null;
    }

    if (!imageUrl && href) {
      imageUrl = await fetchOgImage(href);
    }

    if (href) {
      const existing = await prisma.announcement.findFirst({
        where: { href },
        orderBy: { publishedAt: "desc" },
      });
      if (existing) {
        return jsonOk({
          announcement: existing,
          deduped: true,
          message: "Already imported for this link.",
        });
      }
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        summary,
        href,
        imageUrl,
        isActive: true,
      },
    });

    return jsonCreated({ announcement, deduped: false });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    if (err instanceof Error) {
      return jsonError(err.message);
    }
    console.error("[channel-announcement webhook]", err);
    return jsonError("Webhook failed", 500);
  }
}
