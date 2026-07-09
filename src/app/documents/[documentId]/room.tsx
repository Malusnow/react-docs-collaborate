"use client";

import { ReactNode, useState, useMemo, useEffect } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { FullscreenLoader } from "@/components/fullscreen-loader";
import { getUsers } from "./action";
import { toast } from "sonner";

type User = {
  id: string;
  name: string;
  avatar: string;
};

export function Room({ children }: { children: ReactNode }) {
  const params = useParams();
  const { orgId } = useAuth();

  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!orgId) return;
    
    getUsers(orgId)
      .then(setUsers)
      .catch(() => toast.error("Failed to fetch users."));
  }, [orgId]);

  return (
    <LiveblocksProvider
      throttle={16}
      authEndpoint="/api/liveblocks-auth"
      resolveUsers={({ userIds }) => {
        return userIds.map(
          (userId) => users.find((user) => user.id === userId) ?? undefined
        );
      }}
      resolveMentionSuggestions={({ text }) => {
        let filteredUsers = users;

        if (text) {
          filteredUsers = users.filter((user) =>
            user.name.toLowerCase().includes(text.toLowerCase())
          );
        }

        return filteredUsers.map((user) => user.id);
      }}
      resolveRoomsInfo={() => []}
    >
      <RoomProvider id={params.documentId as string}>
        <ClientSideSuspense fallback={<FullscreenLoader label="Room loading..." />}>
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
