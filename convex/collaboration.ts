import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  MutationCtx,
} from "./_generated/server";

export const loadStateInternal = internalQuery({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const document = await ctx.db.get(documentId);
    if (!document) return null;

    const collaborationState = await ctx.db
      .query("documentCollaborationStates")
      .withIndex("by_document_id", (q) => q.eq("documentId", documentId))
      .unique();

    return {
      initialContent: document.initialContent ?? null,
      legacyState: document.collaborationState ?? null,
      state: collaborationState?.state ?? null,
    };
  },
});

export const storeStateInternal = internalMutation({
  args: {
    documentId: v.id("documents"),
    state: v.bytes(),
  },
  handler: async (ctx, { documentId, state }) => {
    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    const existing = await ctx.db
      .query("documentCollaborationStates")
      .withIndex("by_document_id", (q) => q.eq("documentId", documentId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { state, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("documentCollaborationStates", {
        documentId,
        state,
        updatedAt: Date.now(),
      });
    }

    if (document.collaborationState !== undefined) {
      await ctx.db.patch(documentId, { collaborationState: undefined });
    }
  },
});

export async function deleteCollaborationState(
  ctx: MutationCtx,
  documentId: Id<"documents">,
) {
  const existing = await ctx.db
    .query("documentCollaborationStates")
    .withIndex("by_document_id", (q) => q.eq("documentId", documentId))
    .unique();

  if (existing) {
    await ctx.db.delete(existing._id);
  }
}
