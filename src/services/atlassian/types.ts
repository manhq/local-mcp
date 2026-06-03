export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: unknown;
    status: { name: string };
    priority?: { name: string };
    assignee?: { accountId: string; displayName: string; emailAddress: string } | null;
    reporter?: { displayName: string; emailAddress: string };
    issuetype: { name: string };
    created: string;
    updated: string;
  };
}

export interface JiraTransition {
  id: string;
  name: string;
  to: { name: string };
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
}

export interface ConfluencePage {
  id: string;
  title: string;
  status: string;
  spaceId: string;
  version: { number: number };
  body?: { storage?: { value: string } };
}

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  type: string;
  status: string;
}

export interface ConfluenceComment {
  id: string;
  status: string;
  body?: { storage?: { value: string } };
  version?: { number: number };
}
