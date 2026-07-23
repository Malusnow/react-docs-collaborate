import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { deleteCollaborationState } from "./collaboration";
import { deleteImages } from "./images";
import { requireDocumentAccess, requireUser } from "./lib/documentAccess";

function omitLegacyCollaborationState(document: Doc<"documents">) {
  const metadata = { ...document };
  delete metadata.collaborationState;
  return metadata;
}

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    initialContent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const organizationId = (user.organization_id ?? undefined) as
      string | undefined;

    return await ctx.db.insert("documents", {
      title: args.title ?? "Untitled Document",
      ownerId: user.subject,
      organizationId,
      initialContent: args.initialContent,
    });
  },
});

export const get = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
  },
  handler: async (ctx, { search, paginationOpts }) => {
    const user = await requireUser(ctx);

    const organizationId = (user.organization_id ?? undefined) as
      string | undefined;

    // Search within organization
    if (search && organizationId) {
      const result = await ctx.db
        .query("documents")
        .withSearchIndex("search_title", (q) =>
          q.search("title", search).eq("organizationId", organizationId),
        )
        .paginate(paginationOpts);
      return { ...result, page: result.page.map(omitLegacyCollaborationState) };
    }

    // Personal search
    if (search) {
      const result = await ctx.db
        .query("documents")
        .withSearchIndex("search_title", (q) =>
          q.search("title", search).eq("ownerId", user.subject),
        )
        .paginate(paginationOpts);
      return { ...result, page: result.page.map(omitLegacyCollaborationState) };
    }

    // All docs inside organization
    if (organizationId) {
      const result = await ctx.db
        .query("documents")
        .withIndex("by_organization_id", (q) =>
          q.eq("organizationId", organizationId),
        )
        .order("desc")
        .paginate(paginationOpts);
      return { ...result, page: result.page.map(omitLegacyCollaborationState) };
    }

    // All personal docs
    const result = await ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", user.subject))
      .order("desc")
      .paginate(paginationOpts);
    return { ...result, page: result.page.map(omitLegacyCollaborationState) };
  },
});

export const removeById = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    await requireDocumentAccess(ctx, args.id);
    await deleteImages(ctx, args.id);
    await deleteCollaborationState(ctx, args.id);

    return await ctx.db.delete(args.id);
  },
});

export const updateById = mutation({
  args: { id: v.id("documents"), title: v.string() },
  handler: async (ctx, args) => {
    await requireDocumentAccess(ctx, args.id);

    return await ctx.db.patch(args.id, { title: args.title });
  },
});

export const getById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    const { document } = await requireDocumentAccess(ctx, id);

    return omitLegacyCollaborationState(document);
  },
});
