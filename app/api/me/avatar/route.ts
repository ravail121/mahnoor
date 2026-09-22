import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fail, ok, serverError } from "@/lib/api";
import { getPatientScope } from "@/lib/patient-dashboard";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const scope = await getPatientScope();
    if (!scope) return fail("Unauthorized", 401);
    if (scope.role !== "patient") return fail("Patient account required", 403);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return fail("Choose a photo to upload");
    }
    if (file.size > MAX_BYTES) {
      return fail("Photo must be 2 MB or smaller");
    }

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      return fail("Use a JPG, PNG, or WebP photo");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(dir, { recursive: true });
    const filename = `${scope.userId}-${Date.now()}.${extension}`;
    await writeFile(path.join(dir, filename), buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;
    const user = await prisma.users.update({
      where: { id: scope.userId },
      data: { avatar_url: avatarUrl },
      select: { avatar_url: true, name: true },
    });

    return ok(user);
  } catch (err) {
    return serverError(err);
  }
}
