export interface DripProjectionInput {
  startingValue: number;
  startingAnnualDividend: number;
  monthlyContribution: number;
  priceGrowthRatePct: number;
  dividendGrowthRatePct: number;
  years: number;
  reinvestDividends: boolean;
}

export interface DripProjectionYear {
  year: number;
  portfolioValue: number;
  annualDividendIncome: number;
  cumulativeContributions: number;
  cumulativeDividendsReceived: number;
}

/**
 * Simplified year-by-year compounding projection: price appreciation is applied to the
 * running balance, monthly contributions are added through the year, and dividend income
 * grows at its own rate and either compounds back into the balance (DRIP) or is tracked
 * separately as cash income.
 */
export function projectDripGrowth(input: DripProjectionInput): DripProjectionYear[] {
  const priceGrowth = input.priceGrowthRatePct / 100;
  const dividendGrowth = input.dividendGrowthRatePct / 100;

  let portfolioValue = input.startingValue;
  let annualDividend = input.startingAnnualDividend;
  let cumulativeContributions = 0;
  let cumulativeDividendsReceived = 0;

  const results: DripProjectionYear[] = [];

  for (let year = 1; year <= input.years; year++) {
    portfolioValue *= 1 + priceGrowth;
    annualDividend *= 1 + dividendGrowth;

    const yearlyContribution = input.monthlyContribution * 12;
    portfolioValue += yearlyContribution;
    cumulativeContributions += yearlyContribution;

    cumulativeDividendsReceived += annualDividend;
    if (input.reinvestDividends) {
      // Reinvested dividends buy more shares, compounding into next year's balance
      // (and, via dividendGrowthRatePct, into next year's income too).
      portfolioValue += annualDividend;
    }

    results.push({
      year,
      portfolioValue: Math.round(portfolioValue * 100) / 100,
      annualDividendIncome: Math.round(annualDividend * 100) / 100,
      cumulativeContributions: Math.round(cumulativeContributions * 100) / 100,
      cumulativeDividendsReceived: Math.round(cumulativeDividendsReceived * 100) / 100,
    });
  }

  return results;
}
