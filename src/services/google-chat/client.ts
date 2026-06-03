import axios, { AxiosInstance } from "axios";
import { getAccessToken } from "./auth.js";

export async function getChatClient(): Promise<AxiosInstance> {
  const token = await getAccessToken();
  return axios.create({
    baseURL: "https://chat.googleapis.com/v1",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
}
