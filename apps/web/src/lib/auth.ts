import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema, workspacesRepo } from "@firebreak/core";

function initAuth() {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    database: drizzleAdapter(db(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_OAUTH_CLIENT_ID || "",
        clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET || "",
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              await workspacesRepo.bootstrapPersonalWorkspace(user.id, user.name);
            } catch (err) {
              console.error("Workspace bootstrap failed in auth hook:", err);
            }
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

type AuthInstance = ReturnType<typeof initAuth>;

let _auth: AuthInstance | undefined;

export function getAuth(): AuthInstance {
  if (!_auth) {
    _auth = initAuth();
  }
  return _auth;
}

export const auth = new Proxy({} as AuthInstance, {
  get(_target, prop, receiver) {
    return Reflect.get(getAuth(), prop, receiver);
  },
  has(_target, prop) {
    return Reflect.has(getAuth(), prop);
  },
});

