"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEditorStore } from "@/store/useEditorStore";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import StarterKit from "@tiptap/starter-kit";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Image from "@tiptap/extension-image";
import ImageResize from "tiptap-extension-resize-image";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { FontSizeExtension } from "@/extensions/font-size";
import { LineHeightExtension } from "@/extensions/line-height";
import { Ruler } from "./ruler";
import { Threads } from "./threads";
import { useStorage } from "@liveblocks/react";
import {
  LEFT_MARGIN_DEFAULT,
  RIGHT_MARGIN_DEFAULT,
} from "../../../constants/margins";

interface EditorProps {
  initialContent: string | undefined;
}

export const Editor = ({ initialContent }: EditorProps) => {
  const leftMargin =
    useStorage((root) => root.leftMargin) ?? LEFT_MARGIN_DEFAULT;
  const rightMargin =
    useStorage((root) => root.rightMargin) ?? RIGHT_MARGIN_DEFAULT;
  const liveblocks = useLiveblocksExtension({
    initialContent,
    offlineSupport_experimental: true,
  });
  const setEditor = useEditorStore((state) => state.setEditor);

  const editor = useEditor({
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
        // inside style for the editor content
        style: `padding-left: ${leftMargin ?? LEFT_MARGIN_DEFAULT}px; padding-right: ${rightMargin ?? RIGHT_MARGIN_DEFAULT}px;`,
        // outside style for the editor container
        class:
          "focus:outline-none print:border-0 bg-white border border-[#C7C7C7] flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10 cursor-text",
      },
    },
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      liveblocks,
      // Add TaskList and TaskItem extensions for task lists
      TaskList,
      TaskItem.configure({
        nested: true, // Allow nested task lists
      }),
      // Configure the Table extension to be resizable
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      ImageResize,
      Underline,
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({
        multicolor: true, // Allow multiple highlight colors
      }),
      Link.configure({
        openOnClick: false, // Disable opening links on click
        autolink: true, // Automatically convert URLs into links
        defaultProtocol: "https", // Use https as the default protocol for links
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      FontSizeExtension,
      LineHeightExtension.configure({
        types: ["paragraph", "heading"],
        defaultLineHeight: "normal",
      }),
    ],
    content: `<h1>Welcome to Docs Collaborate!</h1>`,
  });

  return (
    <div className="size-full overflow-x-auto bg-[#f9fbfd] px-4 print:p-0 print:bg-white print:overflow-visible">
      <Ruler />
      <div className="min-w-max flex justify-center w-[816px] py-4 print:py-0 mx-auto print:w-full print:min-w-0">
        <EditorContent editor={editor} />
        <Threads editor={editor} />
      </div>
    </div>
  );
};
