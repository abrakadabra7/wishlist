"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { authApi } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/lists";
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const MIN_LOADER_MS = 600;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const start = Date.now();
    try {
      const res = await authApi.login(email, password);
      login(res.access_token, res.refresh_token);
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_LOADER_MS - elapsed);
      await new Promise((r) => setTimeout(r, wait));
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_LOADER_MS - elapsed);
      await new Promise((r) => setTimeout(r, wait));
      setError(err instanceof Error ? err.message : t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-hero">
        <Loader />
      </div>
    );
  }

  return (
    <Card className="shadow-card-hover border-surface-200/60">
      <h1 className="text-2xl font-bold text-surface-900 mb-6 tracking-tight">{t("auth.logIn")}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label={t("auth.password")}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <Button type="submit" fullWidth loading={loading}>
          {t("auth.logIn")}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-surface-500">
        Don’t have an account?{" "}
        <Link href="/register" className="text-brand-600 hover:underline">
          {t("auth.signUp")}
        </Link>
      </p>
    </Card>
  );
}
