"use client";

import dynamic from "next/dynamic";
import type { SketchPickerProps } from "react-color";

const SketchPicker = dynamic<SketchPickerProps>(
  () => import("react-color").then((module) => module.SketchPicker),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        aria-label="Loading color picker"
        className="h-[300px] w-[220px] animate-pulse bg-neutral-100"
      />
    ),
  },
);

export const ColorPicker = (props: SketchPickerProps) => {
  return <SketchPicker {...props} />;
};
