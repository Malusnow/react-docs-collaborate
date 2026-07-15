"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useParams } from "next/navigation";
import { type Editor } from "@tiptap/react";
import { toast } from "sonner";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "../../../constants/image";

const allowedImageTypes = new Set<string>(ALLOWED_IMAGE_TYPES);

export const useImageUpload = (editor: Editor | null) => {
  const params = useParams<{ documentId: string }>();
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const saveUploadedImage = useMutation(api.images.saveUploadedImage);
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (file: File) => {
    if (!editor || isUploading) return;

    if (!allowedImageTypes.has(file.type)) {
      toast.error("Please select a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    if (file.size === 0) {
      toast.error("Image file is empty.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }

    const toastId = toast.loading("Uploading image...");
    setIsUploading(true);

    try {
      const documentId = params.documentId as Id<"documents">;
      const uploadUrl = await generateUploadUrl({ documentId });
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };
      const { url } = await saveUploadedImage({ documentId, storageId });
      const inserted = editor.chain().focus().setImage({ src: url }).run();

      if (!inserted) {
        throw new Error("Unable to insert image");
      }

      toast.success("Image uploaded.", { id: toastId });
    } catch {
      toast.error("Failed to upload image.", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return { isUploading, uploadImage };
};
