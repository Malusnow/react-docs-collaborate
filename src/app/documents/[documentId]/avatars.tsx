"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { useCollaboration } from "@/components/collaboration-provider";
import { Separator } from "@/components/ui/separator";

const AVATAR_SIZE = 36;

type AwarenessUser = {
  id: string;
  name: string;
  avatar: string;
  color: string;
};

type AwarenessEntry = {
  clientId: number;
  user: AwarenessUser;
};

export const Avatars = () => {
  const { provider, ydoc } = useCollaboration();
  const [users, setUsers] = useState<AwarenessEntry[]>([]);

  useEffect(() => {
    const awareness = provider?.awareness;
    if (!awareness) return;

    const updateUsers = () => {
      const nextUsers: AwarenessEntry[] = [];

      awareness.getStates().forEach((state, clientId) => {
        const user = state.user as AwarenessUser | undefined;
        if (user?.id && user.name) nextUsers.push({ clientId, user });
      });

      setUsers(nextUsers);
    };

    updateUsers();
    awareness.on("change", updateUsers);
    return () => awareness.off("change", updateUsers);
  }, [provider]);

  const currentUser = users.find(({ clientId }) => clientId === ydoc.clientID);
  const otherUsers = users.filter(({ clientId }) => clientId !== ydoc.clientID);

  if (otherUsers.length === 0) return null;

  return (
    <>
      <div className="flex items-center">
        {currentUser && (
          <div className="relative ml-2">
            <Avatar user={currentUser.user} label="You" />
          </div>
        )}
        <div className="flex">
          {otherUsers.map(({ clientId, user }) => (
            <Avatar key={clientId} user={user} label={user.name} />
          ))}
        </div>
      </div>
      <Separator orientation="vertical" className="h-6" />
    </>
  );
};

const Avatar = ({ user, label }: { user: AwarenessUser; label: string }) => (
  <div
    style={{
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      backgroundColor: user.color,
    }}
    className="group relative -ml-2 flex shrink-0 place-content-center rounded-full border-4 border-white"
  >
    <div className="absolute top-full z-10 mt-2.5 whitespace-nowrap rounded-lg bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
      {label}
    </div>
    {user.avatar && (
      <Image
        alt={label}
        src={user.avatar}
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        className="size-full rounded-full"
      />
    )}
  </div>
);
