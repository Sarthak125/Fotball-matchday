import { getMeta } from "@/lib/data";

export default function NoData({ what = "football data" }: { what?: string }) {
  const { lastError } = getMeta();
  const plan = lastError && /do not have access|plan/i.test(lastError);
  return (
    <div className="alert" role="status">
      <h2>No {what} yet</h2>
      {plan ? (
        <p style={{ margin: 0 }}>
          The data provider refused the request: &ldquo;{lastError}&rdquo; The current season needs a paid API-Football plan,
          or the site can be set to show an older season with the <code>SEASON</code> repository variable.
        </p>
      ) : (
        <p style={{ margin: 0 }}>
          The site fills in after the first successful data update. If this stays empty, check that the
          <code>API_FOOTBALL_KEY</code> secret is set in the repository settings and look at the latest run under the Actions tab.
          {lastError ? <> Last error: &ldquo;{lastError}&rdquo;</> : null}
        </p>
      )}
    </div>
  );
}
