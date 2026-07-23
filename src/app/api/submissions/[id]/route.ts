import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireUser } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();
  const { id } = await params;

  const submission = await prisma.submission.findFirst({
    where: { id, authorId: session.sub },
    include: {
      journal: true,
      feedback: {
        orderBy: { createdAt: "desc" },
        include: {
          reviewer: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!submission) return jsonError("Not found", 404);
  return jsonOk({ submission });
}
