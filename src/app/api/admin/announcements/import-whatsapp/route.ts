import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  fetchOgImage,
  parseWhatsAppAnnouncementText,
} from "@/lib/whatsapp-announcement";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

const schema = z.object({
  text: z.string().min(8),
  /** If true, only parse + OG preview — do not create. */
  preview: z.boolean().optional(),
  imageUrl: z.string().url().optional().nullable(),
  publish: z.boolean().optional(),
});

/**
 * Import a WhatsApp channel paste into Announcements.
 * Auto-fills title, summary, link, and tries OG image from the apply URL.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const body = schema.parse(await request.json());
    const parsed = parseWhatsAppAnnouncementText(body.text);

    let imageUrl = body.imageUrl?.trim() || null;
    if (!imageUrl && parsed.href) {
      imageUrl = await fetchOgImage(parsed.href);
    }

    if (body.preview) {
      return jsonOk({
        preview: {
          title: parsed.title,
          summary: parsed.summary,
          href: parsed.href,
          imageUrl,
        },
      });
    }

    // Dedupe: same outbound link already published
    if (parsed.href) {
      const existing = await prisma.announcement.findFirst({
        where: { href: parsed.href },
        orderBy: { publishedAt: "desc" },
      });
      if (existing) {
        return jsonOk({
          announcement: existing,
          deduped: true,
          message: "An announcement with this link already exists.",
        });
      }
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: parsed.title,
        summary: parsed.summary,
        href: parsed.href,
        imageUrl,
        isActive: body.publish ?? true,
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
    console.error(err);
    return jsonError("Could not import WhatsApp post", 500);
  }
}
