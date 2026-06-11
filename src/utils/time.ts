let serverTimeOffset: number | null = null;
let fetchPromise: Promise<void> | null = null;

export async function initServerTime(): Promise<void> {
  if (serverTimeOffset !== null) return;
  if (!fetchPromise) {
    fetchPromise = fetch('/api/time')
      .then(r => r.json())
      .then(data => {
        const clientTime = Date.now();
        const serverTime = new Date(data.serverTime).getTime();
        serverTimeOffset = serverTime - clientTime;
      })
      .catch((err) => {
        console.error("Failed to fetch server time:", err);
        serverTimeOffset = 0; // fallback to local time if API fails
      });
  }
  return fetchPromise;
}

export function getCurrentTime(): Date {
  if (serverTimeOffset === null) return new Date();
  return new Date(Date.now() + serverTimeOffset);
}
