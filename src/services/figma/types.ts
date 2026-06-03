export interface FigmaPage {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}

export interface FigmaFile {
  name: string;
  document: {
    children: FigmaPage[];
  };
}

export interface FigmaComment {
  id: string;
  message: string;
  created_at: string;
  user: {
    handle: string;
    img_url: string;
  };
  resolved_at: string | null;
  client_meta?: {
    node_id?: string;
  };
}

export interface FigmaCommentsResponse {
  comments: FigmaComment[];
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  node_id: string;
  thumbnail_url?: string;
}

export interface FigmaStyle {
  key: string;
  name: string;
  description: string;
  style_type: "FILL" | "TEXT" | "EFFECT" | "GRID";
  node_id: string;
}

export interface FigmaVariable {
  id: string;
  name: string;
  resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
  valuesByMode: Record<string, unknown>;
  description: string;
}

export interface FigmaVariableCollection {
  id: string;
  name: string;
  modes: { modeId: string; name: string }[];
  variableIds: string[];
}
