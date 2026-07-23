import {
  Extension,
  onAuthenticatePayload,
  onTokenSyncPayload,
} from "@hocuspocus/server";
import { ConvexHttpClient } from "convex/browser";

import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type CollaborationContext = {
  userId: string;
  documentId: string;
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(
      Buffer.from(normalized, "base64").toString("utf-8"),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getDocumentId(documentName: string) {
  const prefix = "document.";
  if (!documentName.startsWith(prefix)) {
    throw new Error("Not authorized.");
  }

  const documentId = documentName.slice(prefix.length);
  if (!documentId || documentId.includes(".")) {
    throw new Error("Not authorized.");
  }

  return documentId;
}

export default class AuthenticationExtension implements Extension<CollaborationContext> {
  private convexUrl: string;

  constructor() {
    this.convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
    if (!this.convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is required.");
    }
  }

  private async authorize(documentName: string, token: string) {
    if (!token.trim()) {
      console.warn(
        `[collaboration] Authentication rejected for ${documentName}: token is empty.`,
      );
      throw new Error("Not authorized.");
    }

    const documentId = getDocumentId(documentName);
    const convex = new ConvexHttpClient(this.convexUrl);
    convex.setAuth(token);

    try {
      await convex.query(api.documents.getById, {
        id: documentId as Id<"documents">,
      });
    } catch (error) {
      console.warn(
        `[collaboration] Authorization query failed for ${documentName}: ${
          error instanceof Error ? error.message : "Unknown Convex error"
        }`,
      );
      throw new Error("Not authorized.");
    }

    const payload = decodeJwtPayload(token);
    const userId = typeof payload?.sub === "string" ? payload.sub : null;
    if (!userId) {
      console.warn(
        `[collaboration] Authentication rejected for ${documentName}: token subject is missing.`,
      );
      throw new Error("Not authorized.");
    }

    return { userId, documentId };
  }

  async onAuthenticate({ documentName, token }: onAuthenticatePayload) {
    return await this.authorize(documentName, token);
  }

  async onTokenSync({ documentName, token }: onTokenSyncPayload) {
    return await this.authorize(documentName, token);
  }
}
