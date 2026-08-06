import { createHash, randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import type { users, users_role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const PASSWORD_MIN_LENGTH = 8;
const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;

export type AuthRole = users_role;

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: AuthRole;
  patientId: number | null;
  doctorId: number | null;
};

export function normalizeEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "" ? null : normalized;
}

export function normalizePhone(value: string) {
  const normalized = value.replace(/[^\d+]/g, "").trim();
  return normalized === "" ? null : normalized;
}

export function splitLoginIdentifier(value: string) {
  const raw = value.trim();
  if (raw === "") return { email: null, phone: null };

  if (raw.includes("@")) {
    return { email: normalizeEmail(raw), phone: null };
  }

  return { email: null, phone: normalizePhone(raw) };
}

export function validatePassword(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  return null;
}

export function getPostLoginRedirect(role: AuthRole) {
  return role === "admin" ? "/admin" : "/dashboard";
}

export function getAppBaseUrl() {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3003"
  );
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function findUserForLogin(identifier: string) {
  const { email, phone } = splitLoginIdentifier(identifier);
  if (!email && !phone) return null;

  return prisma.users.findFirst({
    where: {
      OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(
        Boolean,
      ) as Array<{ email?: string; phone?: string }>,
    },
  });
}

export function toAuthenticatedUser(user: users): AuthenticatedUser {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    patientId: user.patient_id,
    doctorId: user.doctor_id,
  };
}

export async function authenticateCredentials(
  identifier: string,
  password: string,
) {
  const user = await findUserForLogin(identifier);
  if (!user) return null;

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return null;

  return toAuthenticatedUser(user);
}

export function buildPasswordResetToken() {
  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  return { rawToken, hashedToken, expiresAt };
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
