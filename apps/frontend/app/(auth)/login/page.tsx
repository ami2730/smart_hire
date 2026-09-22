"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Briefcase,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { ThemeSwitcher } from "@/components/theme-switcher";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
  role: z.enum(["APPLICANT", "RECRUITER"]),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

function AuthCard() {
  const router = useRouter();

  const [mode, setMode] = React.useState<"login" | "register">("login");
  const { login, register: registerUser, isAuthenticated } = useAuth();
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema as any),
    defaultValues: {
      email: "recruiter@smarthire.local",
      password: "Password123!",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema as any),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "APPLICANT",
    },
  });

  // If already logged in, redirect away from login
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      await login(data);
      router.replace("/dashboard");
    } catch (err: any) {
      const message =
        err?.message || "Invalid email or password. Please verify your credentials.";
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      await registerUser(data);
      router.replace("/dashboard");
    } catch (err: any) {
      const message =
        err?.message || "Registration failed. Please verify your information.";
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border/80 shadow-xl bg-card">
      <CardHeader className="space-y-1.5 text-center pb-4">
        <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          {mode === "login" ? "Welcome to SmartHire" : "Create your SmartHire Account"}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {mode === "login"
            ? "Sign in to access AI-powered recruitment and candidate screening."
            : "Register as an Applicant or Recruiter to get started."}
        </CardDescription>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-muted/60 p-1 mt-3">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setAuthError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === "login"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setAuthError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === "register"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Message Alert */}
        {authError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Authentication Notice</p>
              <p className="opacity-90">{authError}</p>
            </div>
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-9"
                  autoComplete="email"
                  disabled={isSubmitting}
                  {...loginForm.register("email")}
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-[11px] font-medium text-destructive">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  {...loginForm.register("password")}
                />
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-[11px] font-medium text-destructive">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-10 font-semibold shadow-xs transition-all gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="register-name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-name"
                  type="text"
                  placeholder="Jane Doe"
                  className="pl-9"
                  disabled={isSubmitting}
                  {...registerForm.register("name")}
                />
              </div>
              {registerForm.formState.errors.name && (
                <p className="text-[11px] font-medium text-destructive">
                  {registerForm.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="register-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  placeholder="jane@example.com"
                  className="pl-9"
                  autoComplete="email"
                  disabled={isSubmitting}
                  {...registerForm.register("email")}
                />
              </div>
              {registerForm.formState.errors.email && (
                <p className="text-[11px] font-medium text-destructive">
                  {registerForm.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label htmlFor="register-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-password"
                  type="password"
                  placeholder="At least 8 characters"
                  className="pl-9"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  {...registerForm.register("password")}
                />
              </div>
              {registerForm.formState.errors.password && (
                <p className="text-[11px] font-medium text-destructive">
                  {registerForm.formState.errors.password.message}
                </p>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-1.5">
              <Label>I want to:</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => registerForm.setValue("role", "APPLICANT")}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                    registerForm.watch("role") === "APPLICANT"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border/80 bg-card hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  <span className="text-xs">Apply for Jobs</span>
                  <span className="text-[10px] text-muted-foreground">(Applicant)</span>
                </button>
                <button
                  type="button"
                  onClick={() => registerForm.setValue("role", "RECRUITER")}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                    registerForm.watch("role") === "RECRUITER"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border/80 bg-card hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <Briefcase className="h-4 w-4" />
                  <span className="text-xs">Hire Candidates</span>
                  <span className="text-[10px] text-muted-foreground">(Recruiter)</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-10 font-semibold shadow-xs transition-all gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col border-t border-border/60 pt-4 pb-4 text-center">
        <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>SmartHire Decision Support System · 3 Role Architecture</span>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground px-4 py-8 antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Bar with brand & theme switcher */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-bold tracking-tight text-lg">SmartHire</span>
        </div>
        <ThemeSwitcher />
      </header>

      {/* Main Auth Card with Suspense */}
      <main className="w-full max-w-md mx-auto my-auto py-6">
        <React.Suspense
          fallback={
            <Card className="border-border/80 shadow-xl bg-card p-12 text-center text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              <span>Loading authentication...</span>
            </Card>
          }
        >
          <AuthCard />
        </React.Suspense>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-muted-foreground">
        <p>© 2026 SmartHire Platform. Communicates strictly with Node.js/Express API.</p>
      </footer>
    </div>
  );
}
