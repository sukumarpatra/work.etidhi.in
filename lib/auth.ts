import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb } from "./db";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "etidhi-dev-secret-change-in-production-9f8a7b6c"
);

export const SESSION_COOKIE = "etidhi_session";

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: string;
};

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: payload.id as number,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  // Make sure the user still exists (may have been removed by an admin)
  const row = getDb().prepare("SELECT id FROM users WHERE id = ?").get(session.id);
  return row ? session : null;
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
