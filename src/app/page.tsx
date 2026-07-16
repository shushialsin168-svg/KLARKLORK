"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Login failed.");
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("kk_user_id", String(data.user.id));
        localStorage.setItem("kk_username", String(data.user.username));
      }
      router.push("/game");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="kk-title kk-title-accent text-4xl sm:text-6xl md:text-7xl text-black">
          KLAR KLORK GAME
        </h1>
        <div className="kk-subtitle mt-5">Traditional Gourd · Crab · Fish</div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="kk-panel w-full max-w-[640px] p-8 flex flex-col gap-6"
      >
        <input
          className="kk-input text-center"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <input
          className="kk-input text-center"
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && (
          <div className="text-red-700 bg-red-100 border border-red-300 rounded-md px-3 py-2 text-center">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button className="kk-green-btn" type="submit" disabled={loading}>
            {loading ? "logging in..." : "login"}
          </button>
        </div>
      </form>

      <div className="mt-6 text-sm text-slate-700">
        No account? Open the{" "}
        <a
          href="/admin"
          className="font-bold text-[var(--kk-red-dark)] underline underline-offset-4"
        >
          Admin panel
        </a>{" "}
        to register one.
      </div>
    </main>
  );
}
