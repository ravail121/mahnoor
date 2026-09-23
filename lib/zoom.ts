/**
 * Zoom Server-to-Server OAuth — creates a meeting when an admin verifies
 * payment for an online booking. No per-user login flow: the account
 * credentials below exchange directly for a bearer token.
 */

function getZoomCredentials() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) return null;
  return { accountId, clientId, clientSecret };
}

/** True once ZOOM_ACCOUNT_ID/CLIENT_ID/CLIENT_SECRET are all set. */
export function isZoomConfigured() {
  return getZoomCredentials() !== null;
}

async function getZoomAccessToken(): Promise<string> {
  const credentials = getZoomCredentials();
  if (!credentials) throw new Error("Zoom credentials are not set");

  const basicAuth = Buffer.from(
    `${credentials.clientId}:${credentials.clientSecret}`,
  ).toString("base64");

  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${credentials.accountId}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${basicAuth}` },
    },
  );

  if (!response.ok) {
    throw new Error(`Zoom token request failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export type CreateZoomMeetingInput = {
  topic: string;
  /** Appointment start, used only as the scheduled time shown in Zoom's UI. */
  startTime: Date;
  durationMinutes: number;
};

export type ZoomMeeting = {
  id: string;
  joinUrl: string;
  startUrl: string;
};

/** Creates a scheduled meeting under the connected Zoom account and returns its links. */
export async function createZoomMeeting(
  input: CreateZoomMeetingInput,
): Promise<ZoomMeeting> {
  const accessToken = await getZoomAccessToken();

  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: input.topic,
      type: 2, // scheduled meeting
      start_time: input.startTime.toISOString(),
      duration: input.durationMinutes,
      timezone: "UTC",
      settings: {
        join_before_host: false,
        waiting_room: true,
        approval_type: 2, // no registration required
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Zoom meeting creation failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    id: number;
    join_url: string;
    start_url: string;
  };

  return {
    id: String(data.id),
    joinUrl: data.join_url,
    startUrl: data.start_url,
  };
}
