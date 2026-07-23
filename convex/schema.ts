import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    title: v.string(),
    initialContent: v.optional(v.string()),
    ownerId: v.string(),
    organizationId: v.optional(v.string()),
    collaborationState: v.optional(v.string()),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_organization_id", ["organizationId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["ownerId", "organizationId"],
    }),

  documentImages: defineTable({
    documentId: v.id("documents"),
    storageId: v.id("_storage"),
    uploadedBy: v.string(),
    contentType: v.string(),
    size: v.number(),
  })
    .index("by_document_id", ["documentId"])
    .index("by_storage_id", ["storageId"]),

  documentCollaborationStates: defineTable({
    documentId: v.id("documents"),
    state: v.bytes(),
    updatedAt: v.number(),
  }).index("by_document_id", ["documentId"]),
});
