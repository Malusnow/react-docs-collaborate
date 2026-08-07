import {
  Extension,
  onLoadDocumentPayload,
  onStoreDocumentPayload,
} from "@hocuspocus/server";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { generateJSON } from "@tiptap/html";
import * as Y from "yjs";

import {
  LEFT_MARGIN_DEFAULT,
  RIGHT_MARGIN_DEFAULT,
} from "../../src/constants/margins";
import { createInitialContentExtensions } from "../editorSchema";

type InitialDocumentResponse = {
  initialContent: string | null;
};

function getDocumentId(documentName: string) {
  const prefix = "document.";
  if (!documentName.startsWith(prefix)) {
    throw new Error("Invalid document name.");
  }

  const documentId = documentName.slice(prefix.length);
  if (!documentId || documentId.includes(".")) {
    throw new Error("Invalid document name.");
  }

  return documentId;
}

function initializeLayout(ydoc: Y.Doc) {
  const layout = ydoc.getMap<number>("layout");
  let changed = false;

  ydoc.transact(() => {
    if (typeof layout.get("leftMargin") !== "number") {
      layout.set("leftMargin", LEFT_MARGIN_DEFAULT);
      changed = true;
    }
    if (typeof layout.get("rightMargin") !== "number") {
      layout.set("rightMargin", RIGHT_MARGIN_DEFAULT);
      changed = true;
    }
  });

  return changed;
}

function createInitialYDoc(initialContent: string | null) {
  const html = initialContent?.trim() ? initialContent : "<p></p>";
  const extensions = createInitialContentExtensions();
  const json = generateJSON(html, extensions);
  const ydoc = TiptapTransformer.toYdoc(json, "default", extensions);

  initializeLayout(ydoc);
  return ydoc;
}

export default class PersistenceExtension implements Extension {
  private convexSiteUrl: string;
  private collaborationSecret: string;

  constructor() {
    this.convexSiteUrl = process.env.CONVEX_SITE_URL || "";
    this.collaborationSecret = process.env.COLLABORATION_SECRET || "";

    if (!this.convexSiteUrl) {
      throw new Error("CONVEX_SITE_URL is required.");
    }
    if (!this.collaborationSecret) {
      throw new Error("COLLABORATION_SECRET is required.");
    }
  }

  private async storeState(documentId: string, ydoc: Y.Doc) {
    const state = Y.encodeStateAsUpdate(ydoc);
    const response = await fetch(
      `${this.convexSiteUrl}/collaboration/save?documentId=${encodeURIComponent(documentId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-collaboration-secret": this.collaborationSecret,
        },
        body: state.buffer.slice(
          state.byteOffset,
          state.byteOffset + state.byteLength,
        ) as ArrayBuffer,
      },
    );

    if (!response.ok) {
      throw new Error(`Collaboration state save failed (${response.status}).`);
    }
  }

  async onLoadDocument({ documentName }: onLoadDocumentPayload) {
    const documentId = getDocumentId(documentName);
    const response = await fetch(`${this.convexSiteUrl}/collaboration/load`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-collaboration-secret": this.collaborationSecret,
      },
      body: JSON.stringify({ documentId }),
    });

    if (!response.ok) {
      throw new Error(`Collaboration state load failed (${response.status}).`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/octet-stream")) {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, new Uint8Array(await response.arrayBuffer()));

      if (initializeLayout(ydoc)) {
        await this.storeState(documentId, ydoc);
      }

      return ydoc;
    }

    const payload = (await response.json()) as InitialDocumentResponse;
    const ydoc = createInitialYDoc(payload.initialContent ?? null);
    await this.storeState(documentId, ydoc);

    return ydoc;
  }

  async onStoreDocument({ documentName, document }: onStoreDocumentPayload) {
    await this.storeState(getDocumentId(documentName), document);
  }
}
