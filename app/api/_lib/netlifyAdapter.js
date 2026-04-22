import { NextResponse } from "next/server";

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
  const body = await getRequestBody(request);
  const event = toNetlifyEvent(request, body);

  try {
    const result = await handler(event, {});
    return toNextResponse(result);
  } catch (error) {
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
