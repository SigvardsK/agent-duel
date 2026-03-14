import { describe, it, expect } from "vitest";
import {
  createMarket,
  placeBet,
  getOdds,
  resolveMarket,
  DEFAULT_RAKE_RATE,
} from "../../src/market.js";

describe("createMarket", () => {
  it("creates empty market", () => {
    const market = createMarket();
    expect(market.bets).toEqual([]);
    expect(market.pool).toBe(0);
    expect(market.resolved).toBe(false);
  });
});

describe("placeBet", () => {
  it("adds bet to market", () => {
    let market = createMarket();
    market = placeBet(market, "Bull", 0.3, "X");
    expect(market.bets).toHaveLength(1);
    expect(market.bets[0]).toEqual({ name: "Bull", amount: 0.3, side: "X" });
    expect(market.pool).toBe(0.3);
  });

  it("accumulates multiple bets", () => {
    let market = createMarket();
    market = placeBet(market, "Bull", 0.3, "X");
    market = placeBet(market, "Bear", 0.5, "O");
    market = placeBet(market, "User", 0.2, "X");
    expect(market.bets).toHaveLength(3);
    expect(market.pool).toBeCloseTo(1.0);
  });

  it("does not mutate original market (immutable)", () => {
    const original = createMarket();
    const updated = placeBet(original, "Bull", 0.3, "X");
    expect(original.bets).toHaveLength(0);
    expect(updated.bets).toHaveLength(1);
  });

  it("throws on resolved market", () => {
    let market = createMarket();
    market = placeBet(market, "Bull", 0.3, "X");
    const { market: resolved } = resolveMarket(market, "X");
    expect(() => placeBet(resolved, "Bear", 0.5, "O")).toThrow(
      "Market is resolved"
    );
  });
});

describe("getOdds", () => {
  it("returns 50/50 for empty market", () => {
    const market = createMarket();
    const odds = getOdds(market);
    expect(odds.x).toBe(50);
    expect(odds.o).toBe(50);
  });

  it("returns correct odds for balanced bets", () => {
    let market = createMarket();
    market = placeBet(market, "Bull", 0.5, "X");
    market = placeBet(market, "Bear", 0.5, "O");
    const odds = getOdds(market);
    expect(odds.x).toBe(50);
    expect(odds.o).toBe(50);
  });

  it("returns correct odds for unbalanced bets", () => {
    let market = createMarket();
    market = placeBet(market, "Bull", 0.3, "X");
    market = placeBet(market, "Bear", 0.7, "O");
    const odds = getOdds(market);
    expect(odds.x).toBe(30);
    expect(odds.o).toBe(70);
  });

  it("handles single-sided bets", () => {
    let market = createMarket();
    market = placeBet(market, "Bull", 1.0, "X");
    const odds = getOdds(market);
    expect(odds.x).toBe(100);
    expect(odds.o).toBe(0);
  });
});

describe("resolveMarket", () => {
  it("applies 5% rake and distributes effective pool", () => {
    let market = createMarket();
    market = placeBet(market, "Bull", 0.2, "X");
    market = placeBet(market, "User", 0.3, "X");
    market = placeBet(market, "Bear", 0.5, "O");

    const { market: resolved, payouts, houseTake } = resolveMarket(market, "X");

    expect(resolved.resolved).toBe(true);
    expect(houseTake).toBeCloseTo(0.05); // 5% of 1.0

    const effectivePool = market.pool - houseTake;

    // Bull: (0.2/0.5) * 0.95 = 0.38
    const bull = payouts.find((p) => p.name === "Bull")!;
    expect(bull.amount).toBeCloseTo(0.38);
    expect(bull.profit).toBeCloseTo(0.18);

    // User: (0.3/0.5) * 0.95 = 0.57
    const user = payouts.find((p) => p.name === "User")!;
    expect(user.amount).toBeCloseTo(0.57);
    expect(user.profit).toBeCloseTo(0.27);

    // Bear: loses entire bet
    const bear = payouts.find((p) => p.name === "Bear")!;
    expect(bear.amount).toBe(0);
    expect(bear.profit).toBeCloseTo(-0.5);
  });

  it("payouts sum to effective pool (pool minus rake)", () => {
    let market = createMarket();
    market = placeBet(market, "A", 0.15, "X");
    market = placeBet(market, "B", 0.35, "X");
    market = placeBet(market, "C", 0.25, "O");
    market = placeBet(market, "D", 0.25, "O");

    const { payouts, houseTake } = resolveMarket(market, "O");
    const totalPayouts = payouts.reduce((s, p) => s + p.amount, 0);
    expect(totalPayouts).toBeCloseTo(market.pool - houseTake, 10);
  });

  it("house takes correct percentage", () => {
    let market = createMarket();
    market = placeBet(market, "A", 0.5, "X");
    market = placeBet(market, "B", 0.5, "O");

    const { houseTake } = resolveMarket(market, "X");
    expect(houseTake).toBeCloseTo(market.pool * DEFAULT_RAKE_RATE);
  });

  it("supports zero rake", () => {
    let market = createMarket();
    market = placeBet(market, "Solo", 0.3, "X");
    market = placeBet(market, "Bear", 0.7, "O");

    const { payouts, houseTake } = resolveMarket(market, "X", 0);
    expect(houseTake).toBe(0);
    const solo = payouts.find((p) => p.name === "Solo")!;
    expect(solo.amount).toBeCloseTo(1.0);
    expect(solo.profit).toBeCloseTo(0.7);
  });

  it("handles single winner taking effective pool", () => {
    let market = createMarket();
    market = placeBet(market, "Solo", 0.3, "X");
    market = placeBet(market, "Bear", 0.7, "O");

    const { payouts, houseTake } = resolveMarket(market, "X");
    const solo = payouts.find((p) => p.name === "Solo")!;
    expect(solo.amount).toBeCloseTo(1.0 - houseTake);
    expect(solo.profit).toBeCloseTo(1.0 - houseTake - 0.3);
  });

  it("handles all bets on losing side (no winners, house takes all)", () => {
    let market = createMarket();
    market = placeBet(market, "A", 0.5, "X");
    market = placeBet(market, "B", 0.5, "X");

    const { payouts, houseTake } = resolveMarket(market, "O");
    expect(payouts.every((p) => p.amount === 0)).toBe(true);
    expect(payouts.every((p) => p.profit < 0)).toBe(true);
    expect(houseTake).toBeCloseTo(0.05); // house still takes rake
  });

  it("profits plus house take equal zero (conservation)", () => {
    let market = createMarket();
    market = placeBet(market, "A", 0.2, "X");
    market = placeBet(market, "B", 0.3, "O");
    market = placeBet(market, "C", 0.5, "X");

    const { payouts, houseTake } = resolveMarket(market, "X");
    const totalProfit = payouts.reduce((s, p) => s + p.profit, 0);
    // Total profit + house take should equal zero (money conservation)
    expect(totalProfit + houseTake).toBeCloseTo(0, 10);
  });

  it("handles many bettors proportionally", () => {
    let market = createMarket();
    market = placeBet(market, "A", 0.1, "X");
    market = placeBet(market, "B", 0.2, "X");
    market = placeBet(market, "C", 0.3, "X");
    market = placeBet(market, "D", 0.15, "O");
    market = placeBet(market, "E", 0.25, "O");

    const { payouts, houseTake } = resolveMarket(market, "X");
    const effectivePool = market.pool - houseTake;

    // Winners get proportional shares of effective pool
    const a = payouts.find(p => p.name === "A")!;
    const b = payouts.find(p => p.name === "B")!;
    const c = payouts.find(p => p.name === "C")!;

    // A bet 0.1, B bet 0.2, C bet 0.3 — total X bets = 0.6
    expect(a.amount).toBeCloseTo((0.1 / 0.6) * effectivePool);
    expect(b.amount).toBeCloseTo((0.2 / 0.6) * effectivePool);
    expect(c.amount).toBeCloseTo((0.3 / 0.6) * effectivePool);

    // B should get exactly 2x what A gets
    expect(b.amount / a.amount).toBeCloseTo(2.0);
    // C should get exactly 3x what A gets
    expect(c.amount / a.amount).toBeCloseTo(3.0);
  });
});
