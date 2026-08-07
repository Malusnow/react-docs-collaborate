import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();
const MAX_COLLABORATION_STATE_BYTES = 900_000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function isAuthorized(req: Request): boolean {
  const expected = process.env.COLLABORATION_SECRET;
  const received = req.headers.get("x-collaboration-secret");

  if (!expected || !received) return false;

  return received === expected;
}

http.route({
  path: "/collaboration/load",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!isAuthorized(req)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Bad Request" }, 400);
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("documentId" in body) ||
      typeof body.documentId !== "string" ||
      !body.documentId
    ) {
      return jsonResponse({ error: "Bad Request" }, 400);
    }

    let collaborationData;
    try {
      collaborationData = await ctx.runQuery(
        internal.collaboration.loadStateInternal,
        { documentId: body.documentId as Id<"documents"> },
      );
    } catch {
      return jsonResponse({ error: "Not Found" }, 404);
    }

    if (!collaborationData) {
      return jsonResponse({ error: "Not Found" }, 404);
    }

    if (collaborationData.state) {
      return new Response(collaborationData.state, {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/octet-stream",
        },
      });
    }

    return jsonResponse({ initialContent: collaborationData.initialContent });
  }),
});

http.route({
  path: "/collaboration/save",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!isAuthorized(req)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const documentId = url.searchParams.get("documentId");

    if (!documentId) {
      return jsonResponse({ error: "Bad Request" }, 400);
    }

    const declaredLength = Number(req.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_COLLABORATION_STATE_BYTES) {
      return jsonResponse({ error: "Payload Too Large" }, 413);
    }

    let state: ArrayBuffer;
    try {
      state = await req.arrayBuffer();
    } catch {
      return jsonResponse({ error: "Bad Request" }, 400);
    }

    if (state.byteLength === 0) {
      return jsonResponse({ error: "Bad Request" }, 400);
    }

    if (state.byteLength > MAX_COLLABORATION_STATE_BYTES) {
      return jsonResponse({ error: "Payload Too Large" }, 413);
    }

    try {
      await ctx.runMutation(internal.collaboration.storeStateInternal, {
        documentId: documentId as Id<"documents">,
        state,
      });
    } catch {
      return jsonResponse({ error: "Not Found" }, 404);
    }

    return jsonResponse({ ok: true });
  }),
});

export default http;
