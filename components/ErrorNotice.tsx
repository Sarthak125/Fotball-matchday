import { describeError } from "@/lib/api";

export default function ErrorNotice({ error }: { error: unknown }) {
  const { kind, message } = describeError(error);
  if (kind === "setup") {
    return (
      <div className="alert" role="alert">
        <h2>Connect your football data</h2>
        <p style={{ margin: 0 }}>
          Add your API-Football key as <code>API_FOOTBALL_KEY</code> in <code>.env.local</code> (or your hosting
          provider&apos;s environment settings), then restart the app. See the README for the steps.
        </p>
      </div>
    );
  }
  return (
    <div className="alert" role="alert">
      <h2>Couldn&apos;t load this data</h2>
      <p style={{ margin: 0 }}>{message}</p>
    </div>
  );
}
