import { fail, ok, requireString, serverError } from "@/lib/api";
import {
  hashPassword,
  hashResetToken,
  validatePassword,
} from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = requireString(body.token, "token");
    const password = requireString(body.password, "password");
    const confirmPassword = requireString(
      body.confirmPassword,
      "confirmPassword",
    );

    if (!token) {
      return fail("This password reset link is missing a token.");
    }

    if (!password || !confirmPassword) {
      return fail("Enter and confirm your new password.");
    }

    if (password !== confirmPassword) {
      return fail("Passwords do not match.");
    }

    const passwordError = validatePassword(password);
    if (passwordError) return fail(passwordError);

    const user = await prisma.users.findFirst({
      where: {
        password_reset_token: hashResetToken(token),
        password_reset_expiry: { gt: new Date() },
      },
    });

    if (!user) {
      return fail("This password reset link is invalid or has expired.", 400);
    }

    await prisma.users.update({
      where: { id: user.id },
      data: {
        password_hash: await hashPassword(password),
        password_reset_token: null,
        password_reset_expiry: null,
      },
    });

    return ok({ reset: true });
  } catch (err) {
    return serverError(err);
  }
}
