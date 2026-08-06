import { fail, ok, requireString, serverError } from "@/lib/api";
import {
  buildPasswordResetToken,
  findUserForLogin,
  getAppBaseUrl,
} from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = requireString(body.identifier, "identifier");

    if (!identifier) {
      return fail("Enter your email or phone number.");
    }

    const user = await findUserForLogin(identifier);

    if (user) {
      const { rawToken, hashedToken, expiresAt } = buildPasswordResetToken();

      await prisma.users.update({
        where: { id: user.id },
        data: {
          password_reset_token: hashedToken,
          password_reset_expiry: expiresAt,
        },
      });

      const resetUrl = `${getAppBaseUrl()}/reset-password?token=${rawToken}`;
      console.log(`[auth] Password reset link for ${identifier}: ${resetUrl}`);
    }

    return ok({
      sentTo: identifier,
    });
  } catch (err) {
    return serverError(err);
  }
}
