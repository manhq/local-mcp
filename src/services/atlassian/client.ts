import axios, { AxiosInstance } from "axios";
import { env } from "../../shared/env.js";

function makeClient(baseURL: string): AxiosInstance {
  const credentials = Buffer.from(`${env.atlassian!.EMAIL}:${env.atlassian!.API_TOKEN}`).toString("base64");
  return axios.create({
    baseURL,
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
}

let _jira: AxiosInstance | null = null;
let _confluence: AxiosInstance | null = null;

export function getJiraClient(): AxiosInstance {
  if (!_jira) _jira = makeClient(`${env.atlassian!.HOST}/rest/api/3`);
  return _jira;
}

export function getConfluenceClient(): AxiosInstance {
  if (!_confluence) _confluence = makeClient(`${env.atlassian!.HOST}/wiki`);
  return _confluence;
}
