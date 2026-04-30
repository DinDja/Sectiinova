export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const payload = await request.json();
    console.log("[SUPPORT TICKET]", JSON.stringify(payload, null, 2));

    return new Response(JSON.stringify({
      success: true,
      message: "Chamado registrado com sucesso.",
    }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("[SUPPORT TICKET ERROR]", error);
    return new Response(JSON.stringify({
      success: false,
      message: "Falha ao registrar o chamado.",
    }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
