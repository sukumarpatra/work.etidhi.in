import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import type { Board } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const boards = getDb()
    .prepare("SELECT * FROM boards ORDER BY created_at DESC")
    .all() as Board[];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar boards={boards} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={session} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
