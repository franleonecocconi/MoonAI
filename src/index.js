export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    // =========================
    // CORS
    // =========================

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods":
            "GET, POST, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type",
          "Access-Control-Allow-Credentials":
            "true"
        }
      });
    }

    // =========================
    // MOONAI
    // =========================

    if (
      url.pathname === "/api/chat" &&
      request.method === "POST"
    ) {

      const body = await request.json();

      const message = body.message || "";
      const mode = body.mode || "chat";

      if (!message) {
        return new Response(
          JSON.stringify({
            error: "Mensaje vacío 🌙"
          }),
          {
            status: 400,
            headers: {
              "Content-Type":
                "application/json"
            }
          }
        );
      }

      let model =
        "@cf/meta/llama-3.2-3b-instruct";

      if (mode === "code") {
        model =
          "@cf/meta/llama-3.2-3b-instruct";
      }

      if (mode === "complex") {
        model =
          "@cf/meta/llama-3.2-3b-instruct";
      }

      const result = await env.AI.run(
        model,
        {
          messages: [
            {
              role: "system",
              content:
                "Eres MoonAI 🌙. Responde en español. Sé claro, útil y directo. Si escribes código, utiliza bloques Markdown con triple backtick e indica el lenguaje."
            },
            {
              role: "user",
              content: message
            }
          ],

          max_tokens: 512,
          temperature: 0.6,
          stream: true
        }
      );

      return new Response(result, {
        headers: {
          "Content-Type":
            "text/event-stream",
          "Cache-Control":
            "no-cache",
          "Access-Control-Allow-Origin":
            "*"
        }
      });
    }

    // =========================
    // ARCHIVOS DE LA WEB
    // =========================

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // =========================
    // API
    // =========================

    return new Response(
      JSON.stringify({
        error:
          "Endpoint API todavía no conectado"
      }),
      {
        status: 404,
        headers: {
          "Content-Type":
            "application/json"
        }
      }
    );
  }
};