import { transformContributions } from "./transform";
import type { ContributionData, ContributionYear } from "./types";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

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

async function fetchYearContributions(
  username: string,
  year: number,
  token: string
): Promise<ContributionYear | null> {
  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;

  const res = await fetch(GITHUB_GRAPHQL_URL, {
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

  if (!res.ok) return null;

  const json = await res.json();
  const collection = json.data?.user?.contributionsCollection;
  if (!collection) return null;

  return transformContributions(collection, year);
}

export async function fetchContributions(
  username: string,
  yearsBack: number = 1
): Promise<ContributionData | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN environment variable is required");

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - yearsBack + 1;

  const yearPromises: Promise<ContributionYear | null>[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    yearPromises.push(fetchYearContributions(username, y, token));
  }

  const results = await Promise.all(yearPromises);
  const years = results.filter((y): y is ContributionYear => y !== null);

  if (years.length === 0) return null;

  return {
    username,
    years: years.sort((a, b) => b.year - a.year),
  };
}
