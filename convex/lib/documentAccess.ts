import { ConvexError } from "convex/values";

import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

export async function requireUser(ctx: QueryCtx) {
  const user = await ctx.auth.getUserIdentity();

  if (!user) {
    throw new ConvexError("Unauthenticated");
  }

  return user;
}

export function canAccessDocument(
  user: {
    subject: string;
    organization_id?: unknown;
  },
  document: Doc<"documents">,
) {
  const organizationId =
    typeof user.organization_id === "string" ? user.organization_id : undefined;

  return (
    document.ownerId === user.subject ||
    (document.organizationId !== undefined &&
      document.organizationId === organizationId)
  );
}

export async function requireDocumentAccess(
  ctx: QueryCtx,
  documentId: Id<"documents">,
) {
  const user = await requireUser(ctx);
  const document = await ctx.db.get(documentId);

  if (!document) {
    throw new ConvexError("Document not found");
  }

  if (!canAccessDocument(user, document)) {
    throw new ConvexError("Forbidden");
  }

  return { user, document };
}
