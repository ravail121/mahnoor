import { fail, ok, requireNumber, requireString, serverError } from "@/lib/api";
import { normalizeEmail, normalizePhone } from "@/lib/auth-utils";
import { getPatientScope } from "@/lib/patient-dashboard";
import { prisma } from "@/lib/prisma";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

    const user = await prisma.users.findUnique({
      where: { id: scope.userId },
      include: { patients: true },
    });
    if (!user) return fail("Account not found", 404);

    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url,
      patient_id: user.patient_id,
      age: user.patients?.age ?? null,
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const { scope, error } = await requirePatient();
    if (!scope) return error;

    const user = await prisma.users.findUnique({
      where: { id: scope.userId },
    });
    if (!user) return fail("Account not found", 404);

    const body = await request.json();
    const name =
      body.name == null ? user.name : requireString(body.name, "name");
    if (!name) return fail("Name is required");

    const emailInput =
      body.email === undefined
        ? user.email
        : typeof body.email === "string" && body.email.trim() === ""
          ? null
          : normalizeEmail(String(body.email));
    if (emailInput && !isValidEmail(emailInput)) {
      return fail("Enter a valid email address.");
    }

    const phoneInput =
      body.phone == null ? user.phone : requireString(body.phone, "phone");
    const phone = phoneInput ? normalizePhone(phoneInput) : null;
    if (!phone) return fail("Phone number is required");

    let age: number | null | undefined = undefined;
    if (body.age !== undefined) {
      if (body.age === null || body.age === "") {
        age = null;
      } else {
        const parsed = requireNumber(body.age, "age");
        if (parsed === null || parsed < 0 || parsed > 120 || !Number.isInteger(parsed)) {
          return fail("Age must be an integer between 0 and 120");
        }
        age = parsed;
      }
    }

    if (emailInput && emailInput !== user.email) {
      const taken = await prisma.users.findFirst({
        where: { email: emailInput, NOT: { id: user.id } },
      });
      if (taken) return fail("That email is already registered.", 409);
    }

    if (phone !== user.phone) {
      const taken = await prisma.users.findFirst({
        where: { phone, NOT: { id: user.id } },
      });
      if (taken) return fail("That phone number is already registered.", 409);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextUser = await tx.users.update({
        where: { id: user.id },
        data: {
          name,
          email: emailInput,
          phone,
        },
        include: { patients: true },
      });

      if (nextUser.patient_id) {
        const patientData: { name: string; phone: string; age?: number | null } = {
          name,
          phone,
        };
        if (age !== undefined) patientData.age = age;
        await tx.patients.update({
          where: { id: nextUser.patient_id },
          data: patientData,
        });
      }

      return tx.users.findUnique({
        where: { id: user.id },
        include: { patients: true },
      });
    });

    return ok({
      id: updated!.id,
      name: updated!.name,
      email: updated!.email,
      phone: updated!.phone,
      avatar_url: updated!.avatar_url,
      patient_id: updated!.patient_id,
      age: updated!.patients?.age ?? null,
    });
  } catch (err) {
    return serverError(err);
  }
}
