export interface ChatSpace {
  name: string;
  displayName: string;
  spaceType: string;
  spaceUri: string;
}

export interface ChatMessage {
  name: string;
  text: string;
  sender: { name: string; displayName: string; type: string };
  createTime: string;
  thread?: { name: string };
  space?: { name: string };
}

export interface ListMessagesResponse {
  messages: ChatMessage[];
  nextPageToken?: string;
}

export interface ListSpacesResponse {
  spaces: ChatSpace[];
  nextPageToken?: string;
}
