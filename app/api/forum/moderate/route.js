import { handler } from "../../../../netlify/functions/forum-moderate.js";
import { runNetlifyHandler } from "../../_lib/netlifyAdapter.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORUM_MODERATION_ROUTE_LOG_TAG = "[forum-moderation-route]";

export async function POST(request) {
  const startedAt = Date.now();
  const url = String(request?.url || "");

  console.log(FORUM_MODERATION_ROUTE_LOG_TAG, "POST:start", {
    method: String(request?.method || ""),
    url,
  });

  const response = await runNetlifyHandler(request, handler);

  console.log(FORUM_MODERATION_ROUTE_LOG_TAG, "POST:done", {
    status: Number(response?.status || 0),
    elapsedMs: Date.now() - startedAt,
    url,
  });

  return response;
}
