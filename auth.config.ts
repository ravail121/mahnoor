import type { NextAuthConfig } from "next-auth";

const isProduction = process.env.NODE_ENV === "production";

const authConfig = {
  providers: [],
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  useSecureCookies: isProduction,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.phone = user.phone ?? null;
        token.role = user.role;
        token.patientId = user.patientId ?? null;
        token.doctorId = user.doctorId ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.phone =
          typeof token.phone === "string" ? token.phone : null;
        session.user.role = token.role === "admin" ? "admin" : "patient";
        session.user.patientId =
          typeof token.patientId === "number" ? token.patientId : null;
        session.user.doctorId =
          typeof token.doctorId === "number" ? token.doctorId : null;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
