"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-9" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-full flex gap-3 items-center justify-center rounded-md border border-border bg-surface text-text-primary hover:bg-surface-raised hover:cursor-pointer"
      aria-label="Change theme"
    >
      {`${theme === "dark" ? "☀️" : "🌙"}`}
    </button>
  );
}
