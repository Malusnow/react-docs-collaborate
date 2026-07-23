"use client";

import { useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { useEditorStore } from "@/store/useEditorStore";
import { useMutation } from "convex/react";
import { useParams } from "next/navigation";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Placeholder from "@tiptap/extension-placeholder";
import { useCollaboration } from "@/components/collaboration-provider";
import { createEditorSchemaExtensions } from "@/extensions/editor-schema";
import { useUser } from "@clerk/nextjs";
import { Ruler } from "./ruler";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export const Editor = () => {
  const { user } = useUser();
  const userName =
    user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Anonymous";
  const colorSeed = user?.id ?? userName;
  const hue =
    colorSeed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    360;
  const userColor = `hsl(${hue}, 80%, 60%)`;
  const collaborationUser = useMemo(
    () => ({
      id: user?.id ?? "anonymous",
      name: userName,
      avatar: user?.imageUrl ?? "",
      color: userColor,
    }),
    [user?.id, user?.imageUrl, userColor, userName],
  );

  const { ydoc, provider, leftMargin, rightMargin } = useCollaboration();
  const setEditor = useEditorStore((state) => state.setEditor);
  const params = useParams<{ documentId: string }>();
  const removeOrphanImages = useMutation(api.images.removeOrphanImages);

  const editor = useEditor(
    {
      autofocus: true,
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      onCreate({ editor }) {
        setEditor(editor);
      },
      onDestroy() {
        setEditor(null);
      },
      editorProps: {
        attributes: {
          style: `padding-left: ${leftMargin}px; padding-right: ${rightMargin}px;`,
          class:
            "focus:outline-none print:border-0 bg-white border border-[#C7C7C7] flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10 cursor-text",
        },
      },
      extensions: [
        ...createEditorSchemaExtensions(),
        Placeholder.configure({
          placeholder: "Start writing...",
        }),
        Collaboration.configure({
          document: ydoc,
          field: "default",
        }),
        CollaborationCursor.configure({
          provider: provider!,
          user: collaborationUser,
        }),
      ],
    },
    [provider, ydoc],
  );

  useEffect(() => {
    provider?.awareness?.setLocalStateField("user", collaborationUser);
  }, [provider, collaborationUser]);

  // Sync margin changes to editor element
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    dom.style.paddingLeft = `${leftMargin}px`;
    dom.style.paddingRight = `${rightMargin}px`;
  }, [leftMargin, rightMargin, editor]);

  // Clean up orphan images on unmount
  useEffect(() => {
    return () => {
      if (!editor) return;

      const activeImageUrls: string[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "image" && typeof node.attrs.src === "string") {
          activeImageUrls.push(node.attrs.src);
        }
      });
      if (activeImageUrls.length === 0) return;

      const documentId = params.documentId as Id<"documents">;
      removeOrphanImages({ documentId, activeImageUrls }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="size-full overflow-x-auto bg-[#f9fbfd] px-4 print:p-0 print:bg-white print:overflow-visible">
      <Ruler />
      <div className="min-w-max flex justify-center w-[816px] py-4 print:py-0 mx-auto print:w-full print:min-w-0">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
