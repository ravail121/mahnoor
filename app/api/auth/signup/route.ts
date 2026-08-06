import { Prisma } from "@/lib/generated/prisma/client";
import { created, fail, requireString, serverError } from "@/lib/api";
import {
  hashPassword,
  normalizeEmail,
  normalizePhone,
  validatePassword,
} from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = requireString(body.name, "name");
    const phoneInput = requireString(body.phone, "phone");
    const password = requireString(body.password, "password");
    const emailInput =
      typeof body.email === "string" ? body.email.trim() : undefined;

    if (!name || !phoneInput || !password) {
      return fail("Full name, phone number, and password are required.");
    }

    const passwordError = validatePassword(password);
    if (passwordError) return fail(passwordError);

    const phone = normalizePhone(phoneInput);
    if (!phone) return fail("Enter a valid phone number.");

    const email = emailInput ? normalizeEmail(emailInput) : null;
    if (emailInput && (!email || !isValidEmail(email))) {
      return fail("Enter a valid email address.");
    }

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      if (email) {
        const existingEmail = await tx.users.findUnique({ where: { email } });
        if (existingEmail) {
          throw new Error("EMAIL_TAKEN");
        }
      }

      const existingPhone = await tx.users.findUnique({ where: { phone } });
      if (existingPhone) {
        throw new Error("PHONE_TAKEN");
      }

      let patient = await tx.patients.findFirst({
        where: { phone },
      });

      if (patient) {
        patient = await tx.patients.update({
          where: { id: patient.id },
          data: { name },
        });
      } else {
        patient = await tx.patients.create({
          data: { name, phone },
        });
      }

      const user = await tx.users.create({
        data: {
          name,
          email,
          phone,
          password_hash: passwordHash,
          role: "patient",
          patient_id: patient.id,
        },
      });

      return {
        userId: user.id,
        patientId: patient.id,
        identifier: email ?? phone,
      };
    });

    return created({
      userId: result.userId,
      patientId: result.patientId,
      identifier: result.identifier,
      role: "patient",
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "EMAIL_TAKEN") {
        return fail("That email is already registered.");
      }

      if (err.message === "PHONE_TAKEN") {
        return fail("That phone number is already registered.");
      }
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return fail("That email or phone number is already registered.");
    }

    return serverError(err);
  }
}
