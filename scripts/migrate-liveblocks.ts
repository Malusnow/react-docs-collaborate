import { config as loadEnv } from "dotenv";
import * as Y from "yjs";

loadEnv({ path: ".env.local", quiet: true });

const liveblocksSecret = process.env.LIVEBLOCKS_SECRET_KEY;
const convexSiteUrl = process.env.CONVEX_SITE_URL;
const collaborationSecret = process.env.COLLABORATION_SECRET;
const shouldWrite = process.argv.includes("--write");
const shouldOverwrite = process.argv.includes("--overwrite");
const MAX_COLLABORATION_STATE_BYTES = 900_000;

if (!liveblocksSecret || !convexSiteUrl || !collaborationSecret) {
  throw new Error(
    "LIVEBLOCKS_SECRET_KEY, CONVEX_SITE_URL, and COLLABORATION_SECRET are required.",
  );
}

const config = {
  liveblocksSecret,
  convexSiteUrl,
  collaborationSecret,
};

type LiveblocksRoom = { id: string };
type RoomsResponse = {
  data: LiveblocksRoom[];
  nextCursor: string | null;
};

const liveblocksHeaders = {
  Authorization: `Bearer ${config.liveblocksSecret}`,
};

async function listRooms() {
  const rooms: LiveblocksRoom[] = [];
  let cursor: string | null = null;

  do {
    const url = new URL("https://api.liveblocks.io/v2/rooms");
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("startingAfter", cursor);

    const response = await fetch(url, { headers: liveblocksHeaders });
    if (!response.ok) {
      throw new Error(`Failed to list Liveblocks rooms (${response.status}).`);
    }

    const payload = (await response.json()) as RoomsResponse;
    rooms.push(...payload.data);
    cursor = payload.nextCursor;
  } while (cursor);

  return rooms;
}

async function loadCurrentState(documentId: string) {
  return await fetch(`${config.convexSiteUrl}/collaboration/load`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-collaboration-secret": config.collaborationSecret,
    },
    body: JSON.stringify({ documentId }),
  });
}

async function loadLegacyState(documentId: string) {
  const response = await fetch(
    `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(documentId)}/ydoc-binary`,
    { headers: liveblocksHeaders },
  );

  if (!response.ok) {
    throw new Error(`Failed to export Yjs state (${response.status}).`);
  }

  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, new Uint8Array(await response.arrayBuffer()));

  const storageResponse = await fetch(
    `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(documentId)}/storage?format=json`,
    { headers: liveblocksHeaders },
  );

  if (storageResponse.ok) {
    const storage = (await storageResponse.json()) as Record<string, unknown>;
    const layout = ydoc.getMap<number>("layout");
    if (typeof storage.leftMargin === "number") {
      layout.set("leftMargin", storage.leftMargin);
    }
    if (typeof storage.rightMargin === "number") {
      layout.set("rightMargin", storage.rightMargin);
    }
  }

  return Y.encodeStateAsUpdate(ydoc);
}

async function saveState(documentId: string, state: Uint8Array) {
  const response = await fetch(
    `${config.convexSiteUrl}/collaboration/save?documentId=${encodeURIComponent(documentId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-collaboration-secret": config.collaborationSecret,
      },
      body: state.buffer.slice(
        state.byteOffset,
        state.byteOffset + state.byteLength,
      ) as ArrayBuffer,
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to import state (${response.status}).`);
  }
}

const rooms = await listRooms();
let migrated = 0;
let skipped = 0;
let failed = 0;

for (const room of rooms) {
  try {
    const current = await loadCurrentState(room.id);
    if (current.status === 404) {
      skipped += 1;
      console.log(`[skip] ${room.id}: no matching Convex document`);
      continue;
    }
    if (!current.ok) {
      throw new Error(`Failed to inspect Convex state (${current.status}).`);
    }

    const hasCurrentState = (
      current.headers.get("content-type") ?? ""
    ).includes("application/octet-stream");
    if (hasCurrentState && !shouldOverwrite) {
      skipped += 1;
      console.log(`[skip] ${room.id}: collaboration state already exists`);
      continue;
    }

    const state = await loadLegacyState(room.id);
    if (state.byteLength > MAX_COLLABORATION_STATE_BYTES) {
      throw new Error(`State is too large (${state.byteLength} bytes).`);
    }

    if (shouldWrite) await saveState(room.id, state);
    migrated += 1;
    console.log(`[${shouldWrite ? "migrated" : "dry-run"}] ${room.id}`);
  } catch (error) {
    failed += 1;
    console.error(
      `[failed] ${room.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

console.log(
  `Finished: ${migrated} ${shouldWrite ? "migrated" : "ready"}, ${skipped} skipped, ${failed} failed.`,
);

if (!shouldWrite) {
  console.log("Dry run only. Re-run with --write to import states.");
}

if (failed > 0) process.exitCode = 1;
