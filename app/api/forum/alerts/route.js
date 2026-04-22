import { handler } from "../../../../netlify/functions/forum-alerts.js";
import { runNetlifyHandler } from "../../_lib/netlifyAdapter.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  return runNetlifyHandler(request, handler);
}

export async function DELETE(request) {
  return runNetlifyHandler(request, handler);
}

export async function OPTIONS(request) {
  return runNetlifyHandler(request, handler);
}
