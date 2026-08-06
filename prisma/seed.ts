import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const ADMIN_EMAIL = "admin@drmahnoor.test";
const ADMIN_PASSWORD = "Admin@12345";
const DOCTOR_NAME = "Dr. Mahnoor Irshad";
const DOCTOR_SPECIALTY = "Consultant Psychiatrist";

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrismaClient();

  try {
    let doctor = await prisma.doctors.findFirst({
      where: {
        name: {
          contains: "Mahnoor",
        },
      },
      orderBy: { id: "asc" },
    });

    if (!doctor) {
      doctor = await prisma.doctors.create({
        data: {
          name: DOCTOR_NAME,
          specialty: DOCTOR_SPECIALTY,
        },
      });
      console.log("Created doctor row");
    }

    const passwordHash = await hash(ADMIN_PASSWORD, 12);
    const existingAdmin = await prisma.users.findFirst({
      where: {
        role: "admin",
        doctor_id: doctor.id,
      },
    });

    const adminUser = existingAdmin
      ? await prisma.users.update({
          where: { id: existingAdmin.id },
          data: {
            name: doctor.name,
            email: ADMIN_EMAIL,
            phone: null,
            password_hash: passwordHash,
            role: "admin",
            doctor_id: doctor.id,
            patient_id: null,
            password_reset_token: null,
            password_reset_expiry: null,
          },
        })
      : await prisma.users.create({
          data: {
            name: doctor.name,
            email: ADMIN_EMAIL,
            phone: null,
            password_hash: passwordHash,
            role: "admin",
            doctor_id: doctor.id,
          },
        });

    console.log("Seeded admin user");
    console.log(`Doctor row: ${doctor.id} (${doctor.name})`);
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log(`User ID: ${adminUser.id}`);
    console.log(`Password hashed: ${adminUser.password_hash.startsWith("$2")}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
