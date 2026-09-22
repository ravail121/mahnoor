import { auth } from "@/auth";
import { normalizePhone } from "@/lib/auth-utils";
import { created, fail, ok, requireString, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const STATUSES = ["new", "read", "replied"] as const;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

/**
 * POST /api/contact
 * Public — submits a contact form message.
 * Body: { name, phone, message }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = requireString(body.name, "name");
    const phoneRaw = requireString(body.phone, "phone");
    const message = requireString(body.message, "message");

    if (!name || !phoneRaw || !message) {
      return fail("Required: name, phone, message");
    }

    const phone = normalizePhone(phoneRaw);
    if (!phone) return fail("Enter a valid phone number.");

    const contactMessage = await prisma.contact_messages.create({
      data: { name, phone, message },
    });

    return created(contactMessage);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * GET /api/contact?status=
 * Admin-only — list contact messages, newest first.
 */
export async function GET(request: Request) {
  try {
    if (!(await requireAdmin())) return fail("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const statusRaw = searchParams.get("status");

    const where: { status?: (typeof STATUSES)[number] } = {};
    if (statusRaw && statusRaw !== "all") {
      if (!STATUSES.includes(statusRaw as (typeof STATUSES)[number])) {
        return fail("status must be new, read, or replied");
      }
      where.status = statusRaw as (typeof STATUSES)[number];
    }

    const messages = await prisma.contact_messages.findMany({
      where,
      orderBy: { created_at: "desc" },
    });

    return ok(messages);
  } catch (err) {
    return serverError(err);
  }
}
