import { auth } from "@/auth";
import { fail, ok, parseId, requireString, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = ["new", "read", "replied"] as const;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

/**
 * PATCH /api/contact/[id]
 * Admin-only. Body: { status: 'new' | 'read' | 'replied' }
 */
export async function PATCH(request: Request, context: Ctx) {
  try {
    if (!(await requireAdmin())) return fail("Unauthorized", 401);

    const { id: idRaw } = await context.params;
    const id = parseId(idRaw);
    if (!id) return fail("Invalid message id");

    const body = await request.json();
    const status = requireString(body.status, "status");
    if (!status || !STATUSES.includes(status as (typeof STATUSES)[number])) {
      return fail("status must be new, read, or replied");
    }

    const existing = await prisma.contact_messages.findUnique({ where: { id } });
    if (!existing) return fail("Message not found", 404);

    const updated = await prisma.contact_messages.update({
      where: { id },
      data: { status: status as (typeof STATUSES)[number] },
    });

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}
