export type AppState = {
  clientName: string;
  clientUrl: string;
  name: string;
  projectId: string;
  installed: boolean;
  upToDate?: boolean;
  currentBuild?: number | null;
  currentBuildDate?: Date;
  currentBuildError?: boolean;
  missingBuilds?: number[];
  latestBuild?: number | null;
  latestBuildDate?: Date;
  latestBuildError?: boolean;
  issues?: number[];
  dependencies?: string[];
  updating?: boolean;
  version?: string | undefined;
};

export type Apps = {
  [app: string]: AppState;
};

export type ClientState = {
  name: string;
  url: string;
};
