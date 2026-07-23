import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";

import { FontSizeExtension } from "../src/extensions/font-size";
import { LineHeightExtension } from "../src/extensions/line-height";

export function createInitialContentExtensions(): Extensions {
  return [
    StarterKit.configure({ history: false }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Image,
    Underline,
    TextStyle,
    FontFamily,
    Color,
    Highlight.configure({ multicolor: true }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
    }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    FontSizeExtension,
    LineHeightExtension.configure({
      types: ["paragraph", "heading"],
      defaultLineHeight: "normal",
    }),
  ];
}
