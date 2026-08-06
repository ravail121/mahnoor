import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      phone?: string | null;
      role: "patient" | "admin";
      patientId: number | null;
      doctorId: number | null;
    };
  }

  interface User {
    phone?: string | null;
    role: "patient" | "admin";
    patientId: number | null;
    doctorId: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    phone?: string | null;
    role?: "patient" | "admin";
    patientId?: number | null;
    doctorId?: number | null;
  }
}
