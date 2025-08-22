import { LoginButton } from "@/components/auth/login-button";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md p-8">
        <h1 className="mb-6 text-2xl font-bold">Welcome to Fondation</h1>
        <p className="text-muted-foreground mb-8">
          Sign in with your GitHub account to get started with automated
          documentation generation.
        </p>
        <LoginButton />
      </Card>
    </div>
  );
}
