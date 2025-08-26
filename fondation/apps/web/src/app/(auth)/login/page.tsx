import { type Metadata } from "next";
import { LoginCard } from "@/components/auth/login-card";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";

export const metadata: Metadata = {
  title: "Connexion | Fondation",
  description: "Connectez-vous à Fondation avec votre compte GitHub",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f10_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f10_1px,transparent_1px)] bg-[size:24px_24px]"
        aria-hidden="true"
      />

      {/* Theme Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeSwitcher />
      </div>

      {/* Login Card */}
      <LoginCard />
    </div>
  );
}
