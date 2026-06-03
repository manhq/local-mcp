import axios from "axios";
import { env } from "../../shared/env.js";

let _token: string | null = null;
let _expiry = 0;

export async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _expiry - 60_000) return _token;

  const { data } = await axios.post<{ access_token: string; expires_in: number }>(
    "https://oauth2.googleapis.com/token",
    {
      grant_type: "refresh_token",
      client_id: env.gchat!.CLIENT_ID,
      client_secret: env.gchat!.CLIENT_SECRET,
      refresh_token: env.gchat!.REFRESH_TOKEN,
    }
  );

  _token = data.access_token;
  _expiry = Date.now() + data.expires_in * 1000;
  return _token;
}
