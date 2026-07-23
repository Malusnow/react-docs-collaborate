"use client";

import { ReactNode } from "react";
import { useParams } from "next/navigation";
import {
  CollaborationProvider,
  useCollaboration,
} from "@/components/collaboration-provider";
import { FullscreenLoader } from "@/components/fullscreen-loader";

interface RoomProps {
  children: ReactNode;
}

function CollaborationGate({ children }: RoomProps) {
  const { isReady, connectionError } = useCollaboration();

  if (connectionError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-muted-foreground">
        {connectionError}
      </div>
    );
  }

  if (!isReady) {
    return <FullscreenLoader label="Loading document..." />;
  }

  return children;
}

export function Room({ children }: RoomProps) {
  const params = useParams<{ documentId: string }>();

  return (
    <CollaborationProvider
      key={params.documentId}
      documentId={params.documentId}
    >
      <CollaborationGate>{children}</CollaborationGate>
    </CollaborationProvider>
  );
}
