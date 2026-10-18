import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginView } from "@/components/auth/login-view";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const isWelcome = params.welcome === "1";
  const rawNext = params.next || params.redirect;
  const nextUrl =
    typeof rawNext === "string" && rawNext.startsWith("/")
      ? rawNext
      : "/app";
  const error = typeof params.error === "string" ? params.error : null;

  const session = await getSession();

  // If already authenticated and NOT returning from an active sign-in callback,
  // redirect straight to console without replaying the welcome sequence
  if (session && !isWelcome) {
    redirect(nextUrl);
  }

  const paramName = typeof params.name === "string" ? params.name : null;
  const initialUser =
    session?.user ||
    (isWelcome && paramName ? { name: paramName, email: null } : null);

  return (
    <LoginView
      initialUser={initialUser}
      isWelcome={isWelcome}
      nextUrl={nextUrl}
      initialError={error}
    />
  );
}
