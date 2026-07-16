"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function AdminRegisterPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [balance, setBalance] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const balNum = Math.trunc(Number(balance));
    if (!name.trim() || !username.trim() || !password) {
      setError("All fields except balance are required.");
      return;
    }
    if (!Number.isFinite(balNum) || balNum < 0) {
      setError("Account Balance Amount must be a non-negative integer.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          password,
          balance: balNum,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not create user.");
        return;
      }
      setSuccess(`Created user "${data.user.username}" successfully.`);
      setName("");
      setUsername("");
      setPassword("");
      setBalance("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full px-4 md:px-8 py-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="kk-title kk-title-accent text-2xl sm:text-3xl md:text-4xl text-black">
            KLAR KLORK GAME ADMIN
          </h1>
          <div className="kk-subtitle mt-4">Player management</div>
        </div>
        <nav className="flex gap-3">
          <button className="kk-nav-pill active" type="button">
            Register Page
          </button>
          <Link href="/admin/customers" className="kk-nav-pill inactive">
            Customer List Page
          </Link>
        </nav>
      </header>

      <form
        onSubmit={handleSubmit}
        className="kk-panel mt-10 w-full max-w-[720px] p-8 flex flex-col gap-5"
      >
        <input
          className="kk-input"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="kk-input"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="kk-input"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="kk-input"
          placeholder="Account Balance Amount"
          inputMode="numeric"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />

        {error && (
          <div className="text-red-700 bg-red-100 border border-red-300 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="text-emerald-700 bg-emerald-100 border border-emerald-300 rounded-md px-3 py-2">
            {success}
          </div>
        )}

        <div className="flex justify-center mt-2">
          <button className="kk-green-btn" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </main>
  );
}
