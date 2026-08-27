import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, unauthorized } from "@/lib/api";
import { requireAdmin, requireUser } from "@/lib/session";
import { cloudinary } from "@/lib/cloudinary";
import { fetchCloudinaryAsset, parseCloudinaryDeliveryUrl } from "@/lib/cloudinary-fetch";
import {
  safeDownloadName,
} from "@/lib/review-file";
import { verifyReviewFileToken } from "@/lib/review-file-token";

type Params = { params: Promise<{ id: string; feedbackId: string }> };

function attachmentHeaders(fileName: string, contentType?: string | null) {
  const safe = safeDownloadName(fileName);
  const encoded = encodeURIComponent(safe);
  return {
    "Content-Type": contentType || "application/octet-stream",
    "Content-Disposition": `attachment; filename="${safe.replace(/"/g, "")}"; filename*=UTF-8''${encoded}`,
    "Cache-Control": "private, max-age=60",
  };
}

export async function GET(request: Request, { params }: Params) {
  const { id, feedbackId } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  const feedback = await prisma.reviewFeedback.findFirst({
    where: { id: feedbackId, submissionId: id },
    include: {
      submission: { select: { id: true, authorId: true, deletedAt: true } },
    },
  });

  if (!feedback || feedback.submission.deletedAt) {
    return jsonError("Not found", 404);
  }
  if (!feedback.fileUrl) {
    return jsonError("No review file on this feedback", 404);
  }

  const tokenOk = token ? verifyReviewFileToken(token, feedback.id) : false;
  if (!tokenOk) {
    const admin = await requireAdmin();
    const author = admin ? null : await requireUser(["AUTHOR"]);
    if (!admin && !author) return unauthorized();
    if (!admin && author?.sub !== feedback.submission.authorId) {
      return jsonError("Forbidden", 403);
    }
  }

  const fileName = safeDownloadName(feedback.fileName);
  const parsed = parseCloudinaryDeliveryUrl(feedback.fileUrl);
  const publicId = feedback.filePublicId || parsed?.publicId;
  const resourceType =
    (feedback.fileResourceType as "image" | "raw" | "video" | "auto" | undefined) ||
    parsed?.resourceType ||
    "raw";

  if (publicId) {
    try {
      const downloadUrl = cloudinary.utils.private_download_url(
        publicId,
        parsed?.format || "",
        {
          resource_type: resourceType === "auto" ? "raw" : resourceType,
          type: "upload",
          attachment: true,
        },
      );
      return NextResponse.redirect(downloadUrl, 302);
    } catch (err) {
      console.error("[review-file] signed download", err);
    }
  }

  const asset = await fetchCloudinaryAsset(feedback.fileUrl);
  if (!asset) {
    return jsonError("Could not fetch the review file", 502);
  }

  return new NextResponse(asset.bytes, {
    status: 200,
    headers: attachmentHeaders(fileName, asset.upstreamType),
  });
}
