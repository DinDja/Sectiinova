import { handler } from "../../../../netlify/functions/inpi-process.js";
import { runNetlifyHandler } from "../../_lib/netlifyAdapter.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  return runNetlifyHandler(request, handler);
}
