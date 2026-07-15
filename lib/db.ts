import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

declare global {
  // eslint-disable-next-line no-var
  var __etidhiDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "etidhi.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      title TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT NOT NULL DEFAULT '#6161ff',
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#579bfc',
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Not Started',
      priority TEXT NOT NULL DEFAULT 'None',
      assignee_id INTEGER REFERENCES users(id),
      due_date TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
      item_id INTEGER,
      user_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      detail TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  migrate(db);
  seed(db);
  return db;
}

// Runs on every getDb() call so new tables reach databases created before the
// feature existed (the dev-server singleton skips createDb on hot reload).
function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT DEFAULT '',
      photo_path TEXT NOT NULL,
      photo_mime TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      approver_id INTEGER REFERENCES users(id),
      reject_reason TEXT DEFAULT '',
      ref_no TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      decided_at TEXT
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      new_password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      decided_at TEXT,
      decided_by INTEGER
    );
  `);

  // Company domain moved from @etidhi.com to @etidhi.in — migrate existing accounts.
  db.prepare(
    "UPDATE users SET email = replace(email, '@etidhi.com', '@etidhi.in') WHERE email LIKE '%@etidhi.com'"
  ).run();
}

function seed(db: Database.Database) {
  const userCount = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (userCount.n > 0) return;

  const hash = bcrypt.hashSync("etidhi123", 10);
  const insertUser = db.prepare(
    "INSERT INTO users (email, name, password_hash, role, title) VALUES (?, ?, ?, ?, ?)"
  );
  const admin = insertUser.run("admin@etidhi.in", "Subash Choudhary", hash, "admin", "Founder & CEO");
  const u2 = insertUser.run("priya@etidhi.in", "Priya Sharma", hash, "member", "Product Manager");
  const u3 = insertUser.run("rahul@etidhi.in", "Rahul Verma", hash, "member", "Full-Stack Developer");
  const u4 = insertUser.run("ananya@etidhi.in", "Ananya Iyer", hash, "member", "UI/UX Designer");

  const adminId = Number(admin.lastInsertRowid);
  const priyaId = Number(u2.lastInsertRowid);
  const rahulId = Number(u3.lastInsertRowid);
  const ananyaId = Number(u4.lastInsertRowid);

  const insertBoard = db.prepare(
    "INSERT INTO boards (name, description, color, created_by) VALUES (?, ?, ?, ?)"
  );
  const board1 = Number(
    insertBoard.run("Product Roadmap", "Q3 2026 product development plan", "#6161ff", adminId).lastInsertRowid
  );
  const board2 = Number(
    insertBoard.run("Marketing Campaigns", "Launch and growth campaigns", "#00c875", adminId).lastInsertRowid
  );

  const insertGroup = db.prepare(
    "INSERT INTO groups (board_id, name, color, position) VALUES (?, ?, ?, ?)"
  );
  const g1 = Number(insertGroup.run(board1, "This Sprint", "#579bfc", 0).lastInsertRowid);
  const g2 = Number(insertGroup.run(board1, "Next Sprint", "#a25ddc", 1).lastInsertRowid);
  const g3 = Number(insertGroup.run(board1, "Backlog", "#797e93", 2).lastInsertRowid);
  const g4 = Number(insertGroup.run(board2, "Active Campaigns", "#00c875", 0).lastInsertRowid);
  const g5 = Number(insertGroup.run(board2, "Planned", "#fdab3d", 1).lastInsertRowid);

  const insertItem = db.prepare(
    `INSERT INTO items (board_id, group_id, name, status, priority, assignee_id, due_date, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const items: [number, number, string, string, string, number | null, string | null, number][] = [
    [board1, g1, "User authentication module", "Done", "High", rahulId, "2026-07-10", 0],
    [board1, g1, "Dashboard analytics widgets", "Working on it", "High", rahulId, "2026-07-18", 1],
    [board1, g1, "Mobile responsive layout", "Working on it", "Medium", ananyaId, "2026-07-20", 2],
    [board1, g1, "Payment gateway integration", "Stuck", "Critical", rahulId, "2026-07-16", 3],
    [board1, g2, "Notification system", "Not Started", "Medium", priyaId, "2026-07-28", 0],
    [board1, g2, "Design system v2", "In Review", "High", ananyaId, "2026-07-25", 1],
    [board1, g2, "API rate limiting", "Not Started", "Low", rahulId, "2026-08-02", 2],
    [board1, g3, "Dark mode support", "Not Started", "Low", null, null, 0],
    [board1, g3, "Multi-language support", "Not Started", "None", null, null, 1],
    [board2, g4, "Product launch announcement", "Working on it", "Critical", priyaId, "2026-07-22", 0],
    [board2, g4, "Social media content calendar", "Done", "Medium", ananyaId, "2026-07-12", 1],
    [board2, g5, "Email newsletter series", "Not Started", "Medium", priyaId, "2026-08-05", 0],
    [board2, g5, "Partner co-marketing", "Not Started", "Low", adminId, "2026-08-15", 1],
  ];
  for (const it of items) insertItem.run(...it);

  const insertActivity = db.prepare(
    "INSERT INTO activity (board_id, item_id, user_id, action, detail) VALUES (?, ?, ?, ?, ?)"
  );
  insertActivity.run(board1, null, adminId, "created board", "Product Roadmap");
  insertActivity.run(board2, null, adminId, "created board", "Marketing Campaigns");
  insertActivity.run(board1, null, rahulId, "updated status", 'moved "User authentication module" to Done');
}

export function getDb(): Database.Database {
  if (!global.__etidhiDb) {
    global.__etidhiDb = createDb();
  } else {
    migrate(global.__etidhiDb);
  }
  return global.__etidhiDb;
}

export function logActivity(opts: {
  boardId: number | null;
  itemId?: number | null;
  userId: number;
  action: string;
  detail?: string;
}) {
  getDb()
    .prepare("INSERT INTO activity (board_id, item_id, user_id, action, detail) VALUES (?, ?, ?, ?, ?)")
    .run(opts.boardId, opts.itemId ?? null, opts.userId, opts.action, opts.detail ?? "");
}
