import { Player } from "./game.js";

export interface Bet {
  name: string;
  amount: number;
  side: Player; // "X" or "O"
}

export interface Payout {
  name: string;
  amount: number;  // SOL received
  profit: number;  // net gain/loss
  side: Player;
}

export interface Market {
  bets: Bet[];
  pool: number;
  resolved: boolean;
}

export function createMarket(): Market {
  return { bets: [], pool: 0, resolved: false };
}

export function placeBet(market: Market, name: string, amount: number, side: Player): Market {
  if (market.resolved) throw new Error("Market is resolved");
  return {
    ...market,
    bets: [...market.bets, { name, amount, side }],
    pool: market.pool + amount,
  };
}

export function getOdds(market: Market): { x: number; o: number } {
  const xTotal = market.bets.filter(b => b.side === "X").reduce((s, b) => s + b.amount, 0);
  const oTotal = market.bets.filter(b => b.side === "O").reduce((s, b) => s + b.amount, 0);
  const total = xTotal + oTotal;
  if (total === 0) return { x: 50, o: 50 };
  return {
    x: Math.round((xTotal / total) * 100),
    o: Math.round((oTotal / total) * 100),
  };
}

export const DEFAULT_RAKE_RATE = 0.05; // 5% house cut

export interface Resolution {
  market: Market;
  payouts: Payout[];
  houseTake: number;
}

export function resolveMarket(market: Market, winner: Player, rakeRate: number = DEFAULT_RAKE_RATE): Resolution {
  const houseTake = market.pool * rakeRate;
  const effectivePool = market.pool - houseTake;

  const winningBets = market.bets.filter(b => b.side === winner);
  const winningTotal = winningBets.reduce((s, b) => s + b.amount, 0);

  const payouts: Payout[] = market.bets.map(bet => {
    if (bet.side === winner && winningTotal > 0) {
      const share = bet.amount / winningTotal;
      const payout = share * effectivePool;
      return { name: bet.name, amount: payout, profit: payout - bet.amount, side: bet.side };
    }
    return { name: bet.name, amount: 0, profit: -bet.amount, side: bet.side };
  });

  return {
    market: { ...market, resolved: true },
    payouts,
    houseTake,
  };
}
