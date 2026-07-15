import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import TeamView, { type ResetRequest } from "@/components/TeamView";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = (await getSession())!;
  const db = getDb();
  const users = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.title,
        (SELECT COUNT(*) FROM items i WHERE i.assignee_id = u.id AND i.status != 'Done') AS open_tasks
       FROM users u ORDER BY u.role = 'admin' DESC, u.name`
    )
    .all() as (User & { open_tasks: number })[];

  const resetRequests =
    session.role === "admin"
      ? (db
          .prepare(
            `SELECT r.id, r.created_at, u.name AS user_name, u.email AS user_email
             FROM password_resets r JOIN users u ON u.id = r.user_id
             WHERE r.status = 'Pending' ORDER BY r.created_at DESC, r.id DESC`
          )
          .all() as ResetRequest[])
      : [];

  return (
    <TeamView
      users={users}
      isAdmin={session.role === "admin"}
      currentUserId={session.id}
      resetRequests={resetRequests}
    />
  );
}
