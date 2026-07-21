import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import AppShell from "@/components/AppShell";
import type { Board } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const boards = getDb()
    .prepare("SELECT * FROM boards ORDER BY created_at DESC")
    .all() as Board[];

  return <AppShell boards={boards} session={session}>{children}</AppShell>;
}
