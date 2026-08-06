import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/auth.config";
import { authenticateCredentials } from "@/lib/auth-utils";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email or phone",
      credentials: {
        identifier: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier =
          typeof credentials?.identifier === "string"
            ? credentials.identifier
            : "";
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";

        if (!identifier || !password) return null;

        return authenticateCredentials(identifier, password);
      },
    }),
  ],
});
