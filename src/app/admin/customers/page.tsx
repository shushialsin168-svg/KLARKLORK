"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

type User = {
  id: number;
  name: string | null;
  username: string;
  password: string;
  balance: string | number;
  role: string;
};

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="kk-panel w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--kk-red-dark)]">{title}</h2>
          <button
            className="text-slate-500 hover:text-slate-800 text-2xl leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminCustomersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load customers.");
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    const t = setInterval(loadUsers, 3000);
    return () => clearInterval(t);
  }, []);

  function openEdit(u: User) {
    setEditTarget(u);
    setEditValue(String(Number(u.balance)));
    setEditError("");
  }

  async function saveEdit() {
    if (!editTarget) return;
    const next = Math.trunc(Number(editValue));
    if (!Number.isFinite(next) || next < 0) {
      setEditError("Balance must be a non-negative whole number.");
      return;
    }
    setBusyId(editTarget.id);
    try {
      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data?.error ?? "Could not update balance.");
        return;
      }
      setUsers((prev) =>
        prev.map((x) =>
          x.id === editTarget.id ? { ...x, balance: data.user.balance } : x
        )
      );
      setEditTarget(null);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not delete user.");
        setDeleteTarget(null);
        return;
      }
      setUsers((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen w-full px-4 md:px-8 py-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="kk-title kk-title-accent text-2xl sm:text-3xl md:text-4xl text-black">
            KLAR KLORK GAME ADMIN
          </h1>
          <div className="kk-subtitle mt-4">Customer accounts (live)</div>
        </div>
        <nav className="flex gap-3">
          <Link href="/admin" className="kk-nav-pill inactive">
            Register Page
          </Link>
          <button className="kk-nav-pill active" type="button">
            Customer List Page
          </button>
        </nav>
      </header>

      {error && (
        <div className="mt-4 text-red-700 bg-red-100 border border-red-300 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="kk-panel mt-6 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="text-sm text-slate-700">
            Stored in Neon PostgreSQL · auto-refresh every 3s · edit or delete rows
            directly
          </div>
          <button className="kk-gold-btn text-sm" onClick={loadUsers}>
            Refresh now
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl">
          <table className="kk-table text-base">
            <thead>
              <tr>
                <th>N.o</th>
                <th>Name</th>
                <th>Username</th>
                <th>Password</th>
                <th>Balance</th>
                <th>Account Type</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-700">
                    Loading customers from database...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="h-12"></td>
                    ))}
                  </tr>
                ))
              ) : (
                users.map((u, i) => (
                  <tr key={u.id}>
                    <td className="font-bold">{i + 1}</td>
                    <td>{u.name ?? ""}</td>
                    <td>{u.username}</td>
                    <td>{u.password}</td>
                    <td className="font-bold">${Number(u.balance)}</td>
                    <td>
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--kk-red)] text-white">
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2 justify-center">
                        <button
                          className="kk-gold-btn text-xs !py-1.5 !px-3"
                          onClick={() => openEdit(u)}
                          disabled={busyId === u.id}
                        >
                          Edit $
                        </button>
                        <button
                          className="text-xs font-bold text-white bg-[var(--kk-red)] hover:brightness-110 border border-[var(--kk-red-dark)] rounded-lg py-1.5 px-3 disabled:opacity-50"
                          onClick={() => setDeleteTarget(u)}
                          disabled={busyId === u.id}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editTarget && (
        <Modal title={`Edit balance — ${editTarget.username}`} onClose={() => setEditTarget(null)}>
          <label className="block text-sm text-slate-700 mb-1">
            Current balance: <span className="font-bold">${Number(editTarget.balance)}</span>
          </label>
          <input
            className="kk-input"
            type="number"
            inputMode="numeric"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
          />
          {editError && (
            <div className="mt-2 text-sm text-red-700">{editError}</div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button className="kk-white-btn text-sm" onClick={() => setEditTarget(null)}>
              Cancel
            </button>
            <button className="kk-gold-btn text-sm" onClick={saveEdit} disabled={busyId === editTarget.id}>
              {busyId === editTarget.id ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete account" onClose={() => setDeleteTarget(null)}>
          <p className="text-slate-800">
            Delete account{" "}
            <span className="font-bold">{deleteTarget.username}</span> (id{" "}
            {deleteTarget.id})? This also removes all of their bets from the
            database. This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="kk-white-btn text-sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button
              className="text-sm font-bold text-white bg-[var(--kk-red)] hover:brightness-110 border border-[var(--kk-red-dark)] rounded-lg py-2 px-4 disabled:opacity-50"
              onClick={confirmDelete}
              disabled={busyId === deleteTarget.id}
            >
              {busyId === deleteTarget.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
