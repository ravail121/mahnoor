import { created, fail, ok, requireString, serverError } from "@/lib/api";
import { getPatientScope } from "@/lib/patient-dashboard";
import { prisma } from "@/lib/prisma";
import type { payments_method } from "@/lib/generated/prisma/client";

const METHODS = ["card", "jazzcash", "easypaisa", "bank"] as const;

async function requirePatient() {
  const scope = await getPatientScope();
  if (!scope) return { scope: null, error: fail("Unauthorized", 401) };
  if (scope.role !== "patient") {
    return { scope: null, error: fail("Patient account required", 403) };
  }
  return { scope, error: null };
}

export async function GET() {
  try {
    const { scope, error } = await requirePatient();
    if (!scope) return error;

    const methods = await prisma.saved_payment_methods.findMany({
      where: { user_id: scope.userId },
      orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
    });

    return ok(methods);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { scope, error } = await requirePatient();
    if (!scope) return error;

    const body = await request.json();
    const method = requireString(body.method, "method");
    const label = requireString(body.label, "label");
    const accountHint =
      body.account_hint == null || body.account_hint === ""
        ? null
        : requireString(body.account_hint, "account_hint");

    if (!method || !label) {
      return fail("Method and label are required");
    }
    if (!METHODS.includes(method as (typeof METHODS)[number])) {
      return fail("Choose Card, JazzCash, EasyPaisa, or Bank");
    }

    const isDefault = Boolean(body.is_default);
    const createdMethod = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.saved_payment_methods.updateMany({
          where: { user_id: scope.userId },
          data: { is_default: false },
        });
      }

      const existingCount = await tx.saved_payment_methods.count({
        where: { user_id: scope.userId },
      });

      return tx.saved_payment_methods.create({
        data: {
          user_id: scope.userId,
          method: method as payments_method,
          label,
          account_hint: accountHint,
          is_default: isDefault || existingCount === 0,
        },
      });
    });

    return created(createdMethod);
  } catch (err) {
    return serverError(err);
  }
}
