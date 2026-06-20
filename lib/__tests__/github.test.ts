import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchContributions } from "../github";

const ORIGINAL_TOKEN = process.env.GITHUB_TOKEN;

// Minimal Response-like stub matching the fields github.ts reads:
// .status, .ok, .headers.get(name), .json().
function mockResponse(opts: {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
}): Response {
  const status = opts.status ?? 200;
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) => opts.headers?.[name] ?? null,
    },
    json: async () => opts.body ?? {},
  } as unknown as Response;
}

// A well-formed GraphQL success envelope so transformContributions doesn't throw.
function successBody(total = 100) {
  return {
    data: {
      user: {
        contributionsCollection: {
          contributionCalendar: {
            totalContributions: total,
            weeks: [
              {
                contributionDays: [
                  { date: "2025-01-05", contributionCount: 3, contributionLevel: "FIRST_QUARTILE" },
                  { date: "2025-01-06", contributionCount: 0, contributionLevel: "NONE" },
                ],
              },
            ],
          },
        },
      },
    },
  };
}

function installFetch() {
  const fn = vi.fn();
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  process.env.GITHUB_TOKEN = "test-token";
});

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN = ORIGINAL_TOKEN;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchContributions", () => {
  it("short-circuits to 'misconfigured' when no token is set, without calling fetch", async () => {
    delete process.env.GITHUB_TOKEN;
    const fetchMock = installFetch();

    const result = await fetchContributions("octocat", 1);

    expect(result).toEqual({ ok: false, reason: "misconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a network throw to 'network'", async () => {
    const fetchMock = installFetch();
    fetchMock.mockRejectedValueOnce(new Error("boom"));

    const result = await fetchContributions("octocat", 1);
    expect(result).toEqual({ ok: false, reason: "network" });
  });

  it("maps 401 to 'unauthorized'", async () => {
    const fetchMock = installFetch();
    fetchMock.mockResolvedValueOnce(mockResponse({ status: 401 }));

    const result = await fetchContributions("octocat", 1);
    expect(result).toEqual({ ok: false, reason: "unauthorized" });
  });

  it("maps 403 with x-ratelimit-remaining '0' to 'rate_limited'", async () => {
    const fetchMock = installFetch();
    fetchMock.mockResolvedValueOnce(
      mockResponse({ status: 403, headers: { "x-ratelimit-remaining": "0" } })
    );

    const result = await fetchContributions("octocat", 1);
    expect(result).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("maps 403 with remaining quota to 'unauthorized'", async () => {
    const fetchMock = installFetch();
    fetchMock.mockResolvedValueOnce(
      mockResponse({ status: 403, headers: { "x-ratelimit-remaining": "57" } })
    );

    const result = await fetchContributions("octocat", 1);
    expect(result).toEqual({ ok: false, reason: "unauthorized" });
  });

  it("maps 500 to 'server'", async () => {
    const fetchMock = installFetch();
    fetchMock.mockResolvedValueOnce(mockResponse({ status: 500 }));

    const result = await fetchContributions("octocat", 1);
    expect(result).toEqual({ ok: false, reason: "server" });
  });

  it("maps a 200 with no contributionsCollection to 'not_found'", async () => {
    const fetchMock = installFetch();
    fetchMock.mockResolvedValueOnce(mockResponse({ status: 200, body: { data: { user: null } } }));

    const result = await fetchContributions("ghost", 1);
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns ok with the username and one year on success", async () => {
    const fetchMock = installFetch();
    fetchMock.mockResolvedValueOnce(mockResponse({ status: 200, body: successBody(42) }));

    const result = await fetchContributions("octocat", 1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.username).toBe("octocat");
      expect(result.data.years).toHaveLength(1);
      expect(result.data.years[0].total).toBe(42);
    }
  });

  it("aggregates multiple years sorted newest-first", async () => {
    const fetchMock = installFetch();
    // 3 successful years; the loop fetches oldest→newest, results sorted desc.
    fetchMock
      .mockResolvedValueOnce(mockResponse({ status: 200, body: successBody(1) }))
      .mockResolvedValueOnce(mockResponse({ status: 200, body: successBody(2) }))
      .mockResolvedValueOnce(mockResponse({ status: 200, body: successBody(3) }));

    const result = await fetchContributions("octocat", 3);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.years).toHaveLength(3);
      expect(result.data.years[0].year).toBeGreaterThan(result.data.years[1].year);
      expect(result.data.years[1].year).toBeGreaterThan(result.data.years[2].year);
    }
  });

  it("returns ok with partial success when one year fails", async () => {
    const fetchMock = installFetch();
    fetchMock
      .mockResolvedValueOnce(mockResponse({ status: 500 }))
      .mockResolvedValueOnce(mockResponse({ status: 200, body: successBody(10) }));

    const result = await fetchContributions("octocat", 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.years).toHaveLength(1);
    }
  });

  it("surfaces the highest-priority reason when all years fail", async () => {
    const fetchMock = installFetch();
    // rate_limited (priority 5) should win over server (priority 3).
    fetchMock
      .mockResolvedValueOnce(mockResponse({ status: 500 }))
      .mockResolvedValueOnce(
        mockResponse({ status: 403, headers: { "x-ratelimit-remaining": "0" } })
      );

    const result = await fetchContributions("octocat", 2);
    expect(result).toEqual({ ok: false, reason: "rate_limited" });
  });
});
