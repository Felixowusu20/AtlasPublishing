import { jsonOk } from "@/lib/api";
import { listFaqs } from "@/lib/cms";

export async function GET() {
  try {
    const faqs = await listFaqs(true);
    return jsonOk({ faqs });
  } catch (err) {
    console.error(err);
    return jsonOk({ faqs: [] });
  }
}
