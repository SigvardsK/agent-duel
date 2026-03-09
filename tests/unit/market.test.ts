import { describe, it, expect } from "vitest";
import {
  createMarket,
  placeBet,
  getOdds,
  resolveMarket,
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
  it("pays out entire pool to winning side proportionally", () => {
    let market = createMarket();
    market = placeBet(market, "Bull", 0.2, "X");
    market = placeBet(market, "User", 0.3, "X");
    market = placeBet(market, "Bear", 0.5, "O");

    const { market: resolved, payouts } = resolveMarket(market, "X");

    expect(resolved.resolved).toBe(true);

    // Bull: (0.2/0.5) * 1.0 = 0.4
    const bull = payouts.find((p) => p.name === "Bull")!;
    expect(bull.amount).toBeCloseTo(0.4);
    expect(bull.profit).toBeCloseTo(0.2);

    // User: (0.3/0.5) * 1.0 = 0.6
    const user = payouts.find((p) => p.name === "User")!;
    expect(user.amount).toBeCloseTo(0.6);
    expect(user.profit).toBeCloseTo(0.3);

    // Bear: loses entire bet
    const bear = payouts.find((p) => p.name === "Bear")!;
    expect(bear.amount).toBe(0);
    expect(bear.profit).toBeCloseTo(-0.5);
  });

  it("payouts sum to pool (no money created or destroyed)", () => {
    let market = createMarket();
    market = placeBet(market, "A", 0.15, "X");
    market = placeBet(market, "B", 0.35, "X");
    market = placeBet(market, "C", 0.25, "O");
    market = placeBet(market, "D", 0.25, "O");

    const { payouts } = resolveMarket(market, "O");
    const totalPayouts = payouts.reduce((s, p) => s + p.amount, 0);
    expect(totalPayouts).toBeCloseTo(market.pool, 10);
  });

  it("handles single winner taking entire pool", () => {
    let market = createMarket();
    market = placeBet(market, "Solo", 0.3, "X");
    market = placeBet(market, "Bear", 0.7, "O");

    const { payouts } = resolveMarket(market, "X");
    const solo = payouts.find((p) => p.name === "Solo")!;
    expect(solo.amount).toBeCloseTo(1.0);
    expect(solo.profit).toBeCloseTo(0.7);
  });

  it("handles all bets on losing side (no winners)", () => {
    let market = createMarket();
    market = placeBet(market, "A", 0.5, "X");
    market = placeBet(market, "B", 0.5, "X");

    const { payouts } = resolveMarket(market, "O");
    expect(payouts.every((p) => p.amount === 0)).toBe(true);
    expect(payouts.every((p) => p.profit < 0)).toBe(true);
  });

  it("profits and losses sum to zero (zero-sum)", () => {
    let market = createMarket();
    market = placeBet(market, "A", 0.2, "X");
    market = placeBet(market, "B", 0.3, "O");
    market = placeBet(market, "C", 0.5, "X");

    const { payouts } = resolveMarket(market, "X");
    const totalProfit = payouts.reduce((s, p) => s + p.profit, 0);
    expect(totalProfit).toBeCloseTo(0, 10);
  });
});
