import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import BillsView from "@/components/BillsView";
import type { Bill, User } from "@/lib/types";

export const dynamic = "force-dynamic";

const BILL_SELECT = `
  SELECT b.*, su.name AS submitter_name, ap.name AS approver_name
  FROM bills b
  JOIN users su ON su.id = b.user_id
  LEFT JOIN users ap ON ap.id = b.approver_id
`;

export default async function BillsPage() {
  const session = (await getSession())!;
  const db = getDb();

  const bills = (
    session.role === "admin"
      ? db.prepare(`${BILL_SELECT} ORDER BY b.created_at DESC, b.id DESC`).all()
      : db
          .prepare(
            `${BILL_SELECT} WHERE b.user_id = ?
             ORDER BY b.created_at DESC, b.id DESC`
          )
          .all(session.id)
  ) as Bill[];

  const users = db
    .prepare("SELECT id, email, name, role, title FROM users ORDER BY name")
    .all() as User[];

  return (
    <BillsView
      initialBills={bills}
      users={users}
      currentUserId={session.id}
      isAdmin={session.role === "admin"}
    />
  );
}
