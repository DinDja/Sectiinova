import { NextResponse } from "next/server";

const NETLIFY_ADAPTER_LOG_TAG = "[netlify-adapter]";

function getQueryStringParameters(url) {
  const params = {};

  for (const [key, value] of url.searchParams.entries()) {
    if (!Object.prototype.hasOwnProperty.call(params, key)) {
      params[key] = value;
    }
  }

  return params;
}

async function getRequestBody(request) {
  if (request.method === "GET" || request.method === "HEAD") {
    return "";
  }

  return await request.text();
}

function toNetlifyEvent(request, body) {
  const url = new URL(request.url);

  return {
    httpMethod: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    queryStringParameters: getQueryStringParameters(url),
    body,
    isBase64Encoded: false,
    path: url.pathname,
    rawUrl: request.url,
  };
}

function toNextResponse(result) {
  const statusCode = Number(result?.statusCode) || 200;
  const headers = new Headers(result?.headers || {});

  const body =
    typeof result?.body === "string"
      ? result.body
      : JSON.stringify(result?.body ?? {});

  return new NextResponse(body, {
    status: statusCode,
    headers,
  });
}

export async function runNetlifyHandler(request, handler) {
  const startedAt = Date.now();
  const body = await getRequestBody(request);
  const event = toNetlifyEvent(request, body);

  console.log(NETLIFY_ADAPTER_LOG_TAG, "runNetlifyHandler:start", {
    method: String(event?.httpMethod || ""),
    path: String(event?.path || ""),
    bodyLength: String(body || "").length,
    hasQueryParams: Boolean(event?.queryStringParameters && Object.keys(event.queryStringParameters).length),
  });

  try {
    const result = await handler(event, {});
    console.log(NETLIFY_ADAPTER_LOG_TAG, "runNetlifyHandler:handler_result", {
      statusCode: Number(result?.statusCode || 0),
      elapsedMs: Date.now() - startedAt,
      path: String(event?.path || ""),
    });
    return toNextResponse(result);
  } catch (error) {
    console.error(NETLIFY_ADAPTER_LOG_TAG, "runNetlifyHandler:error", {
      path: String(event?.path || ""),
      elapsedMs: Date.now() - startedAt,
      error,
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao executar o endpoint.",
      },
      { status: 500 },
    );
  }
}
