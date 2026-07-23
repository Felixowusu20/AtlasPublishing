import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/api";

export async function GET() {
  try {
    const journals = await prisma.journal.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
    return jsonOk({ journals });
  } catch (err) {
    console.error(err);
    return jsonOk({ journals: [] });
  }
}
