import { config as loadEnv } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import { Server } from "@hocuspocus/server";

import AuthenticationExtension from "./extensions/AuthenticationExtension";
import PersistenceExtension from "./extensions/PersistenceExtension";

const envPath = resolve(process.cwd(), ".env.local");

if (existsSync(envPath)) {
  loadEnv({ path: envPath, quiet: true });
}

const allowedOrigins = new Set(
  (process.env.COLLABORATION_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

if (process.env.NODE_ENV === "production" && allowedOrigins.size === 0) {
  throw new Error("COLLABORATION_ALLOWED_ORIGINS is required in production.");
}

const server = new Server({
  name: "docs-collaborate",
  port: parseInt(process.env.COLLABORATION_PORT || "4000", 10),
  extensions: [new AuthenticationExtension(), new PersistenceExtension()],
  // Debounce persists for better performance
  debounce: 5000,
  maxDebounce: 15000,
  timeout: 30000,
  async onUpgrade({ request, socket }) {
    const origin = request.headers.origin;
    if (
      allowedOrigins.size > 0 &&
      (typeof origin !== "string" || !allowedOrigins.has(origin))
    ) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return Promise.reject();
    }
  },
});

server.listen();
