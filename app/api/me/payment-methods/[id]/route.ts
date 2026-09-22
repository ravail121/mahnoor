import { fail, ok, parseId, requireString, serverError } from "@/lib/api";
import { getPatientScope } from "@/lib/patient-dashboard";
import { prisma } from "@/lib/prisma";
import type { payments_method } from "@/lib/generated/prisma/client";

const METHODS = ["card", "jazzcash", "easypaisa", "bank"] as const;

type Ctx = { params: Promise<{ id: string }> };

async function requireOwnedMethod(id: number) {
  const scope = await getPatientScope();
  if (!scope) return { method: null, error: fail("Unauthorized", 401) };
  if (scope.role !== "patient") {
    return { method: null, error: fail("Patient account required", 403) };
  }

  const method = await prisma.saved_payment_methods.findFirst({
    where: { id, user_id: scope.userId },
  });
  if (!method) return { method: null, error: fail("Payment method not found", 404) };
  return { method, error: null, userId: scope.userId };
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id: idRaw } = await context.params;
    const id = parseId(idRaw);
    if (!id) return fail("Invalid payment method id");

    const { method: existing, error, userId } = await requireOwnedMethod(id);
    if (!existing || userId == null) return error;

    const body = await request.json();
    const data: {
      method?: payments_method;
      label?: string;
      account_hint?: string | null;
      is_default?: boolean;
    } = {};

    if (body.method != null) {
      const method = requireString(body.method, "method");
      if (!method || !METHODS.includes(method as (typeof METHODS)[number])) {
        return fail("Choose Card, JazzCash, EasyPaisa, or Bank");
      }
      data.method = method as payments_method;
    }

    if (body.label != null) {
      const label = requireString(body.label, "label");
      if (!label) return fail("Label is required");
      data.label = label;
    }

    if (body.account_hint !== undefined) {
      data.account_hint =
        body.account_hint == null || body.account_hint === ""
          ? null
          : requireString(body.account_hint, "account_hint");
    }

    if (body.is_default != null) {
      data.is_default = Boolean(body.is_default);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.is_default) {
        await tx.saved_payment_methods.updateMany({
          where: { user_id: userId },
          data: { is_default: false },
        });
      }

      return tx.saved_payment_methods.update({
        where: { id },
        data,
      });
    });

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id: idRaw } = await context.params;
    const id = parseId(idRaw);
    if (!id) return fail("Invalid payment method id");

    const { method: existing, error } = await requireOwnedMethod(id);
    if (!existing) return error;

    await prisma.saved_payment_methods.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
