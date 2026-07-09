"use server";

import { clerkClient } from "@clerk/nextjs/server";


export async function getUsers(orgId: string) {
  const clerk = await clerkClient();

  const response = await clerk.users.getUserList({
    organizationId: [orgId],
  });

  const users = response.data.map((user) => ({
    id: user.id,
    name: user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Anonymous",
    avatar: user.imageUrl,
  }))

  return users;
}
