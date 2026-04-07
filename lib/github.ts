import { transformContributions } from "./transform";
import type { ContributionData, ContributionYear } from "./types";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export type FetchErrorReason =
  | "not_found"
  | "rate_limited"
  | "unauthorized"
  | "network"
  | "server"
  | "misconfigured";

export type FetchResult =
  | { ok: true; data: ContributionData }
  | { ok: false; reason: FetchErrorReason };

type YearResult =
  | { ok: true; year: ContributionYear }
  | { ok: false; reason: FetchErrorReason };

const CONTRIBUTION_QUERY = `
  query($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

// Higher number = more informative / actionable. When multiple years fail with
// different reasons, we surface the highest-priority one to the user.
const REASON_PRIORITY: Record<FetchErrorReason, number> = {
  misconfigured: 6,
  rate_limited: 5,
  unauthorized: 4,
  server: 3,
  network: 2,
  not_found: 1,
};

async function fetchYearContributions(
  username: string,
  year: number,
  token: string
): Promise<YearResult> {
  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;

  let res: Response;
  try {
    res = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: CONTRIBUTION_QUERY,
        variables: { username, from, to },
      }),
      next: { revalidate: 3600 },
    });
  } catch {
    return { ok: false, reason: "network" };
  }

  if (res.status === 401) return { ok: false, reason: "unauthorized" };
  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining === "0") return { ok: false, reason: "rate_limited" };
    return { ok: false, reason: "unauthorized" };
  }
  if (res.status >= 500) return { ok: false, reason: "server" };
  if (!res.ok) return { ok: false, reason: "server" };

  const json = await res.json();
  const collection = json.data?.user?.contributionsCollection;
  if (!collection) return { ok: false, reason: "not_found" };

  return { ok: true, year: transformContributions(collection, year) };
}

export async function fetchContributions(
  username: string,
  yearsBack: number = 1
): Promise<FetchResult> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, reason: "misconfigured" };

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - yearsBack + 1;

  const yearPromises: Promise<YearResult>[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    yearPromises.push(fetchYearContributions(username, y, token));
  }

  const results = await Promise.all(yearPromises);
  const years = results
    .filter((r): r is Extract<YearResult, { ok: true }> => r.ok)
    .map((r) => r.year);

  if (years.length > 0) {
    return {
      ok: true,
      data: {
        username,
        years: years.sort((a, b) => b.year - a.year),
      },
    };
  }

  // All years failed — surface the most informative reason
  const failures = results.filter(
    (r): r is Extract<YearResult, { ok: false }> => !r.ok
  );
  const worstReason = failures
    .map((f) => f.reason)
    .sort((a, b) => REASON_PRIORITY[b] - REASON_PRIORITY[a])[0];

  return { ok: false, reason: worstReason };
}
