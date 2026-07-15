import { ConvexError, v } from "convex/values";

import { Id } from "./_generated/dataModel";
import { mutation, MutationCtx } from "./_generated/server";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "../src/constants/image";
import { requireDocumentAccess } from "./lib/documentAccess";

const allowedImageTypes = new Set<string>(ALLOWED_IMAGE_TYPES);

export async function deleteImages(
  ctx: MutationCtx,
  documentId: Id<"documents">,
) {
  const images = await ctx.db
    .query("documentImages")
    .withIndex("by_document_id", (q) => q.eq("documentId", documentId))
    .collect();

  for (const image of images) {
    await ctx.storage.delete(image.storageId);
    await ctx.db.delete(image._id);
  }
}

export const generateUploadUrl = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    await requireDocumentAccess(ctx, documentId);

    return await ctx.storage.generateUploadUrl();
  },
});

export const saveUploadedImage = mutation({
  args: {
    documentId: v.id("documents"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { documentId, storageId }) => {
    const { user } = await requireDocumentAccess(ctx, documentId);
    const metadata = await ctx.db.system.get(storageId);

    if (
      !metadata?.contentType ||
      !allowedImageTypes.has(metadata.contentType) ||
      metadata.size <= 0 ||
      metadata.size > MAX_IMAGE_SIZE
    ) {
      throw new ConvexError("Invalid image");
    }

    const existingImage = await ctx.db
      .query("documentImages")
      .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
      .unique();

    if (existingImage && existingImage.documentId !== documentId) {
      throw new ConvexError("Forbidden");
    }

    const url = await ctx.storage.getUrl(storageId);

    if (!url) {
      throw new ConvexError("Image not found");
    }

    const imageId =
      existingImage?._id ??
      (await ctx.db.insert("documentImages", {
        documentId,
        storageId,
        uploadedBy: user.subject,
        contentType: metadata.contentType,
        size: metadata.size,
      }));

    return { imageId, storageId, url };
  },
});
