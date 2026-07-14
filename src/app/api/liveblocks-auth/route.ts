import { Liveblocks } from "@liveblocks/node";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexError } from "convex/values";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { fetchQuery } from "convex/nextjs";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(req: Request) {
  const { getToken } = await auth();

  const token = await getToken({ template: "convex" });
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await currentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let room: Id<"documents">;

  try {
    const body: unknown = await req.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("room" in body) ||
      typeof body.room !== "string" ||
      !body.room
    ) {
      return new Response("Bad Request", { status: 400 });
    }

    room = body.room as Id<"documents">;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  try {
    await fetchQuery(api.documents.getById, { id: room }, { token });
  } catch (error) {
    if (error instanceof ConvexError) {
      if (error.data === "Unauthenticated") {
        return new Response("Unauthorized", { status: 401 });
      }

      if (error.data === "Forbidden" || error.data === "Document not found") {
        return new Response("Forbidden", { status: 403 });
      }
    }

    return new Response("Internal Server Error", { status: 500 });
  }

  const name =
    user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Anonymous";
  const nameToNumbers = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = Math.floor(nameToNumbers % 360);
  const color = `hsl(${hue}, 80%, 60%)`;

  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name,
      avatar: user.imageUrl,
      color,
    },
  });
  session.allow(room, session.FULL_ACCESS);
  const { body, status } = await session.authorize();

  return new Response(body, { status });
}
