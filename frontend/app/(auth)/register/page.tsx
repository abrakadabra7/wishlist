"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { authApi } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.register(email, password, displayName || undefined);
      login(res.access_token, res.refresh_token);
      router.push("/lists");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.registerFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-card-hover border-surface-200/60">
      <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-6 tracking-tight theme-transition">{t("auth.signUp")}</h1>
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
          label={t("auth.displayNameOptional")}
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Input
          label={t("auth.passwordHint")}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          maxLength={72}
        />
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <Button type="submit" fullWidth loading={loading}>
          {t("auth.createAccount")}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-surface-500 dark:text-surface-400 theme-transition">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="text-brand-600 hover:underline">
          {t("auth.logIn")}
        </Link>
      </p>
    </Card>
  );
}
