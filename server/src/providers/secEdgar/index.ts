import { env } from '../../config/env.js';
import type { WhaleAction } from '@stockdash/shared';
import type { WhaleProvider } from '../types.js';
import { TICKER_TO_CUSIP, TRACKED_INSTITUTIONS } from './cusipMap.js';

const USER_AGENT = () => `StockDashboard/1.0 (${env.SEC_EDGAR_CONTACT_EMAIL || 'contact@example.com'})`;

async function edgarFetch(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT(), Accept: 'application/json, text/xml, */*' },
  });
  if (!res.ok) throw new Error(`SEC EDGAR request failed (${res.status}): ${url}`);
  return res;
}

interface SubmissionsResponse {
  filings: {
    recent: {
      form: string[];
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      primaryDocument: string[];
    };
  };
}

interface Filing13F {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
}

async function getRecent13FFilings(cik: string, count: number): Promise<Filing13F[]> {
  const paddedCik = cik.padStart(10, '0');
  const res = await edgarFetch(`https://data.sec.gov/submissions/CIK${paddedCik}.json`);
  const data = (await res.json()) as SubmissionsResponse;
  const { form, accessionNumber, filingDate, reportDate } = data.filings.recent;

  const filings: Filing13F[] = [];
  for (let i = 0; i < form.length && filings.length < count; i++) {
    if (form[i] === '13F-HR') {
      filings.push({ accessionNumber: accessionNumber[i], filingDate: filingDate[i], reportDate: reportDate[i] });
    }
  }
  return filings;
}

interface IndexFile {
  name: string;
}

async function findInfoTableXmlUrl(cik: string, accessionNumber: string): Promise<string | null> {
  const cikNoLeadingZeros = String(Number(cik));
  const accessionNoDashes = accessionNumber.replace(/-/g, '');
  const indexUrl = `https://data.sec.gov/Archives/edgar/data/${cikNoLeadingZeros}/${accessionNoDashes}/index.json`;
  const res = await edgarFetch(indexUrl);
  const data = (await res.json()) as { directory: { item: IndexFile[] } };

  const xmlFiles = data.directory.item
    .map((f) => f.name)
    .filter((name) => name.toLowerCase().endsWith('.xml') && name.toLowerCase() !== 'primary_doc.xml');

  const infoTableCandidate =
    xmlFiles.find((name) => /info.?table/i.test(name)) ?? xmlFiles[0] ?? null;

  if (!infoTableCandidate) return null;
  return `https://www.sec.gov/Archives/edgar/data/${cikNoLeadingZeros}/${accessionNoDashes}/${infoTableCandidate}`;
}

interface InfoTableRow {
  cusip: string;
  shares: number;
  valueThousands: number;
}

function extractTagValue(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<(?:[a-zA-Z0-9]+:)?${tag}>([^<]*)</(?:[a-zA-Z0-9]+:)?${tag}>`, 'i'));
  return match ? match[1].trim() : null;
}

async function parseInfoTable(xmlUrl: string): Promise<InfoTableRow[]> {
  const res = await edgarFetch(xmlUrl);
  const xml = await res.text();

  const rows: InfoTableRow[] = [];
  const blocks = xml.match(/<(?:[a-zA-Z0-9]+:)?infoTable>[\s\S]*?<\/(?:[a-zA-Z0-9]+:)?infoTable>/gi) ?? [];

  for (const block of blocks) {
    const cusip = extractTagValue(block, 'cusip');
    const shares = extractTagValue(block, 'sshPrnamt');
    const value = extractTagValue(block, 'value');
    if (cusip && shares) {
      rows.push({ cusip, shares: Number(shares), valueThousands: Number(value ?? 0) });
    }
  }
  return rows;
}

function computeAction(current: number, previous: number | null): WhaleAction {
  if (previous === null) return 'new';
  if (current === 0) return 'closed';
  if (current > previous) return 'increased';
  if (current < previous) return 'decreased';
  return 'held';
}

export const secEdgarWhaleProvider: WhaleProvider = {
  name: 'sec_edgar',
  async getWhaleTradesForTicker(ticker: string) {
    const cusip = TICKER_TO_CUSIP[ticker.toUpperCase()];
    if (!cusip) return [];

    const results: Awaited<ReturnType<WhaleProvider['getWhaleTradesForTicker']>> = [];

    for (const institution of TRACKED_INSTITUTIONS) {
      try {
        const filings = await getRecent13FFilings(institution.cik, 2);
        if (filings.length === 0) continue;

        const [latest, prior] = filings;

        const latestXmlUrl = await findInfoTableXmlUrl(institution.cik, latest.accessionNumber);
        if (!latestXmlUrl) continue;
        const latestRows = await parseInfoTable(latestXmlUrl);
        const latestHolding = latestRows.find((r) => r.cusip === cusip);
        if (!latestHolding) continue;

        let previousShares: number | null = null;
        if (prior) {
          try {
            const priorXmlUrl = await findInfoTableXmlUrl(institution.cik, prior.accessionNumber);
            if (priorXmlUrl) {
              const priorRows = await parseInfoTable(priorXmlUrl);
              previousShares = priorRows.find((r) => r.cusip === cusip)?.shares ?? null;
            }
          } catch {
            previousShares = null;
          }
        }

        results.push({
          ticker: ticker.toUpperCase(),
          institutionName: institution.name,
          institutionCik: institution.cik,
          filingType: '13F-HR',
          quarter: latest.reportDate,
          shares: latestHolding.shares,
          sharesChange: previousShares !== null ? latestHolding.shares - previousShares : null,
          valueUsd: latestHolding.valueThousands * 1000,
          action: computeAction(latestHolding.shares, previousShares),
          filedDate: latest.filingDate,
          provider: 'sec_edgar',
          externalId: `${institution.cik}-${latest.accessionNumber}-${cusip}`,
        });
      } catch (err) {
        console.warn(`SEC EDGAR: failed to fetch 13F data for ${institution.name} (${institution.cik}):`, err);
      }
    }

    return results;
  },
};
