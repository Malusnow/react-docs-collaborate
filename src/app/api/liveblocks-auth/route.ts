import { Liveblocks } from "@liveblocks/node";
import { auth, currentUser } from "@clerk/nextjs/server";

import { api } from "../../../../convex/_generated/api";
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

  const { room } = await req.json();
  const document = await fetchQuery(
    api.documents.getById,
    { id: room },
    { token },
  );

  if (!document) {
    return new Response("Unauthorized", { status: 401 });
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
