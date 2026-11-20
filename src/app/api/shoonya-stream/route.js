import { randomUUID } from "node:crypto";
import { shoonyaStreamManager } from "@/lib/server/shoonyaStreamManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetKey = searchParams.get("k");

  if (!targetKey) {
    return new Response(JSON.stringify({ error: "Missing required 'k' query parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const uid = process.env.SHOONYA_UID?.trim();
  const accessToken = process.env.SHOONYA_ACCESS_TOKEN?.trim();

  if (!uid || !accessToken) {
    return new Response(
      JSON.stringify({ error: "Shoonya credentials not configured on server" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const subscriberId = randomUUID();
  const encoder = new TextEncoder();

  let unsubscribe = null;
  let keepAliveTimer = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event, data) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // Controller might already be closed
        }
      };

      const sendComment = (comment) => {
        try {
          controller.enqueue(encoder.encode(`: ${comment}\n\n`));
        } catch {
          // Controller might already be closed
        }
      };

      // Periodic SSE keepalive comment every 15 seconds
      keepAliveTimer = setInterval(() => {
        sendComment("keepalive");
      }, 15_000);

      // Subscribe this client to Shoonya via the server-side manager
      unsubscribe = shoonyaStreamManager.subscribe(
        subscriberId,
        targetKey,
        (tick) => sendEvent("tick", tick),
        (status) => sendEvent("status", status),
      );

      // Handle client disconnect / abort signal
      request.signal.addEventListener("abort", () => {
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },

    cancel() {
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
