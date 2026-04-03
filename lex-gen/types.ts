export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GeneratedAPI {
  files: GeneratedFile[];
}

export interface FileDiff {
  act: "add" | "mod" | "del";
  path: string;
  content?: string;
}

export interface GitSourceConfig {
  type: "git";
  remote: string;
  ref?: string;
  pattern: string[];
}

export type SourceConfig = GitSourceConfig;

export interface PullConfig {
  outdir: string;
  clean?: boolean;
  sources: SourceConfig[];
}

export interface ImportMapping {
  nsid: string[];
  imports:
    | string
    | ((nsid: string) => { type: "named" | "namespace"; from: string });
}

export interface ModulesConfig {
  importSuffix?: string;
}

export interface LexiconConfig {
  outdir: string;
  files: string[];
  mappings?: ImportMapping[];
  modules?: ModulesConfig;
  pull?: PullConfig;
}
