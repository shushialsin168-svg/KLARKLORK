"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  name: string | null;
  username: string;
  password: string;
  balance: string | number;
  role: string;
};

// Symbol art loaded from the internet (Twemoji SVGs via jsDelivr CDN).
const TW = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/";
const SYMBOLS = [
  { key: "image1", name: "Tiger", img: `${TW}1f405.svg`, bg: "gold" },
  { key: "image2", name: "Gourd", img: `${TW}1f3fa.svg`, bg: "gold" },
  { key: "image3", name: "Rooster", img: `${TW}1f413.svg`, bg: "sky" },
  { key: "image4", name: "Shrimp", img: `${TW}1f990.svg`, bg: "sky" },
  { key: "image5", name: "Crab", img: `${TW}1f980.svg`, bg: "gold" },
  { key: "image6", name: "Fish", img: `${TW}1f41f.svg`, bg: "sky" },
];
const CHIPS = [1, 2, 5, 10, 15, 20, 50, 100];

type Bet = { symbolIndex: number; amount: number };
type RollResult = {
  dice: number[];
  bets: (Bet & { matches: number; win: number; payout: number })[];
  totalBet: number;
  totalReturn: number;
  netGain: number;
  balance: number;
};

function CornerFlowers() {
  const pos = ["top-1 left-1", "top-1 right-1", "bottom-1 left-1", "bottom-1 right-1"];
  return (
    <>
      {pos.map((p, i) => (
        <span key={i} className={`kk-corner-flower ${p}`}>
          ✿
        </span>
      ))}
    </>
  );
}

export default function GamePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [bets, setBets] = useState<Bet[]>([]);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<RollResult | null>(null);
  const [error, setError] = useState("");

  const totalBet = useMemo(() => bets.reduce((s, b) => s + b.amount, 0), [bets]);

  useEffect(() => {
    const id =
      typeof window !== "undefined" ? localStorage.getItem("kk_user_id") : null;
    if (!id) {
      router.replace("/");
      return;
    }
    fetchUser(Number(id));
  }, [router]);

  async function fetchUser(id: number) {
    try {
      const res = await fetch(`/api/users/${id}`, { cache: "no-store" });
      if (!res.ok) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("kk_user_id");
          localStorage.removeItem("kk_username");
        }
        router.replace("/");
        return;
      }
      const data = await res.json();
      setUser(data.user);
    } catch {
      // ignore
    }
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("kk_user_id");
      localStorage.removeItem("kk_username");
    }
    router.replace("/");
  }

  function placeBet(symbolIndex: number) {
    setError("");
    const amt = Math.trunc(Number(amount));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid whole-number bet amount first.");
      return;
    }
    const bal = Number(user?.balance ?? 0);
    if (totalBet + amt > bal) {
      setError("Bet exceeds your current balance.");
      return;
    }
    setBets((prev) => [...prev, { symbolIndex, amount: amt }]);
  }

  async function rollDice() {
    if (!user) return;
    setError("");
    setRolling(true);
    try {
      const res = await fetch("/api/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, bets }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Roll failed.");
        return;
      }
      setResult(data as RollResult);
      setBets([]);
      setUser((u) => (u ? { ...u, balance: data.balance } : u));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRolling(false);
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-slate-800 text-xl">
        Loading...
      </main>
    );
  }

  const balanceNum = Number(user.balance);

  return (
    <main className="min-h-screen w-full px-4 md:px-8 py-6 flex flex-col">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="kk-title kk-title-accent text-3xl sm:text-4xl md:text-5xl text-black">
            KLAR KLORK GAME
          </h1>
          <div className="kk-subtitle mt-4">Gourd · Crab · Fish</div>
        </div>
        <button className="kk-gold-btn text-sm" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div>
          <div className="grid grid-cols-3 gap-3 sm:gap-5 max-w-[760px]">
            {SYMBOLS.map((sym, idx) => {
              const betHere = bets
                .filter((b) => b.symbolIndex === idx)
                .reduce((s, b) => s + b.amount, 0);
              const isWinning = result?.dice.includes(idx) ?? false;
              return (
                <div key={idx} className="flex flex-col items-center">
                  <div
                    className={`kk-symbol-card w-full ${isWinning ? "is-winning" : ""}`}
                  >
                    <CornerFlowers />
                    <div className={`kk-medallion ${sym.bg === "sky" ? "sky" : ""}`}>
                      <img src={sym.img} alt={sym.name} className="kk-symbol-img" />
                    </div>
                    <div className="kk-symbol-label">
                      {sym.key} · {sym.name}
                    </div>
                  </div>
                  <button className="kk-bet-btn" onClick={() => placeBet(idx)}>
                    Bet
                  </button>
                  {betHere > 0 && (
                    <div className="mt-2 px-3 py-1 rounded-full bg-[var(--kk-red)] text-white text-xs font-bold tracking-wider shadow">
                      BET ${betHere}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {result && (
            <div className="kk-panel mt-10 p-6 max-w-[760px]">
              <div className="text-lg font-bold mb-3 text-[var(--kk-red-dark)]">
                🎲 Dice rolled
              </div>
              <div className="flex gap-3 mb-4 flex-wrap">
                {result.dice.map((d, i) => (
                  <div key={i} className="kk-dice p-2">
                    <div className={`kk-medallion ${SYMBOLS[d].bg === "sky" ? "sky" : ""}`}>
                      <img src={SYMBOLS[d].img} alt={SYMBOLS[d].name} className="kk-symbol-img" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-white/70 p-3">
                  <div className="text-xs uppercase tracking-widest text-slate-600">Total Bet</div>
                  <div className="text-xl font-black">${result.totalBet}</div>
                </div>
                <div className="rounded-xl bg-white/70 p-3">
                  <div className="text-xs uppercase tracking-widest text-slate-600">Payout</div>
                  <div className="text-xl font-black text-emerald-700">${result.totalReturn}</div>
                </div>
                <div className="rounded-xl bg-white/70 p-3">
                  <div className="text-xs uppercase tracking-widest text-slate-600">Net</div>
                  <div className={`text-xl font-black ${result.netGain >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {result.netGain >= 0 ? "+" : ""}${result.netGain}
                  </div>
                </div>
              </div>
              {result.bets.length > 0 && (
                <ul className="mt-4 space-y-1 text-sm text-slate-700">
                  {result.bets.map((b, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="inline-block w-9 h-9 rounded-full overflow-hidden border-2 border-[var(--kk-red)] bg-white">
                        <img src={SYMBOLS[b.symbolIndex].img} alt="" className="w-full h-full object-contain p-1" />
                      </span>
                      <span className="font-semibold">{SYMBOLS[b.symbolIndex].name}</span>
                      <span>bet ${b.amount}</span>
                      <span>→ {b.matches} match{b.matches === 1 ? "" : "es"}</span>
                      <span className="ml-auto font-bold text-emerald-700">
                        {b.matches > 0 ? `+$${b.win} (5%)` : "$0"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-slate-500">
                Win rule: ~5% of rolls win · a winning bet returns the stake + 5% profit (e.g. bet 100 → +5). Losing bets are forfeited.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 text-red-700 bg-red-100 border border-red-300 rounded-md px-3 py-2 max-w-[760px]">
              {error}
            </div>
          )}
        </div>

        <aside className="kk-panel p-6 flex flex-col gap-4 lg:mt-2 self-start">
          <div className="text-center kk-subtitle">Place Your Bet</div>
          <input
            className="kk-input text-center text-xl"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
          />
          <div className="grid grid-cols-4 gap-2">
            {CHIPS.map((c) => (
              <button key={c} type="button" className="kk-chip" onClick={() => setAmount(String(c))}>
                {c}
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-white/70 border border-[var(--kk-red)]/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Pending bets</span>
              <span className="font-black text-[var(--kk-red-dark)]">${totalBet}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Queued</span>
              <span>{bets.length} bet{bets.length === 1 ? "" : "s"}</span>
            </div>
          </div>

          <button className={`kk-roll-btn ${rolling ? "rolling" : ""}`} onClick={rollDice} disabled={rolling}>
            {rolling ? "Rolling…" : "🎲 Roll Dice"}
          </button>

          {bets.length > 0 && (
            <button className="kk-white-btn text-sm" onClick={() => setBets([])} type="button">
              Clear bets
            </button>
          )}
        </aside>
      </div>

      <div className="mt-auto pt-10">
        <div className="kk-panel inline-flex items-center gap-4 px-5 py-3">
          <div className="kk-avatar">
            <svg viewBox="0 0 24 24" className="w-9 h-9" fill="currentColor" aria-hidden="true">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6Z" />
            </svg>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-light text-slate-900 leading-tight">{user.username}</div>
            <div className="text-xl md:text-2xl font-light text-slate-800 leading-tight">
              Balance money: <span className="kk-balance">{balanceNum}$</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
