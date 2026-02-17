import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-hero dark:bg-gradient-hero-dark px-4 pb-safe relative theme-transition">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-brand-200/20 dark:bg-brand-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-0 w-72 h-72 bg-brand-100/30 dark:bg-brand-950/30 rounded-full blur-3xl" />
      </div>
      <Link
        href="/"
        className="absolute top-4 left-4 z-10 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
      >
        ← Home
      </Link>
      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">{children}</div>
    </div>
  );
}
