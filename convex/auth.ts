import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile: (params) => ({
        email: params.email as string,
        name: (params.name as string) || (params.email as string),
        role: (params.role as "student" | "professor" | "admin") || "student",
      }),
    }),
  ],
});
