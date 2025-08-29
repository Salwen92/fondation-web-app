export interface GlobalOptions {
  verbose?: boolean;
  quiet?: boolean;
  json?: boolean;
  profile?: string;
  config?: string;
  logFile?: string;
  [key: string]: unknown;
}
