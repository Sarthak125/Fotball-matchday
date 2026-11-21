export default function NoData({ what = "football data" }: { what?: string }) {
  return (
    <div className="alert" role="status">
      <h2>No {what} yet</h2>
      <p style={{ margin: 0 }}>
        The site fills in after the first successful data update. If this stays empty, check that the
        <code>API_FOOTBALL_KEY</code> secret is set in the repository settings and look at the latest run under the Actions tab.
      </p>
    </div>
  );
}
