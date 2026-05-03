import { handler } from "../../../../netlify/functions/library-books.js";
import { runNetlifyHandler } from "../../_lib/netlifyAdapter.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIBRARY_BOOKS_ROUTE_LOG_TAG = "[library-books-route]";

export async function GET(request) {
  const startedAt = Date.now();

  console.log(LIBRARY_BOOKS_ROUTE_LOG_TAG, "GET:start", {
    url: String(request?.url || ""),
  });

  const response = await runNetlifyHandler(request, handler);

  console.log(LIBRARY_BOOKS_ROUTE_LOG_TAG, "GET:done", {
    status: Number(response?.status || 0),
    elapsedMs: Date.now() - startedAt,
  });

  return response;
}

export async function POST(request) {
  const startedAt = Date.now();

  console.log(LIBRARY_BOOKS_ROUTE_LOG_TAG, "POST:start", {
    url: String(request?.url || ""),
  });

  const response = await runNetlifyHandler(request, handler);

  console.log(LIBRARY_BOOKS_ROUTE_LOG_TAG, "POST:done", {
    status: Number(response?.status || 0),
    elapsedMs: Date.now() - startedAt,
  });

  return response;
}
