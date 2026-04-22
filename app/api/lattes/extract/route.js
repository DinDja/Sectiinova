import { handler } from "../../../../netlify/functions/lattes-extract.js";
import { runNetlifyHandler } from "../../_lib/netlifyAdapter.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  return runNetlifyHandler(request, handler);
}
