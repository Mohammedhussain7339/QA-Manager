export type Priority = "P1" | "P2" | "P3";
export type LoginState = "Login" | "Logout" | "Both";
export type Group = "Selected" | "Related";
export type RowGroup = Group | "Exclude";
export type Status = "Not Run" | "Passed" | "Failed" | "Blocked" | "Skipped";
export type Mode = "complete" | "selected" | "related";

export const STATUSES: Status[] = ["Not Run", "Passed", "Failed", "Blocked", "Skipped"];
export const MODE_LABEL: Record<Mode, string> = {
  complete: "Complete Website", selected: "Selected Component", related: "Selected + Related",
};

export interface TestCase {
  id: string; component: string; subComponent: string; testCase: string; expected: string;
  priority: Priority; loginState: LoginState; tags: string[]; active: boolean; version: number; lastUpdated: string;
}
export interface PreviewRow {
  id: string; component: string; subComponent: string; testCase: string; expected: string;
  priority: Priority; group: RowGroup; masterVersion: number; custom?: boolean;
}
export interface Evidence {
  id: string; kind: "file" | "link"; name: string; type: string; size: number; sha256: string; addedAt: string; link?: string;
}
export interface RunCase extends Omit<PreviewRow, "group"> {
  group: Group; status: Status; actual: string; bugId: string; evidence: Evidence[]; executedAt?: string;
  rootCause?: string;
}
export interface AuditEntry { at: string; by: string; action: string; caseId?: string; field?: string; oldValue?: string; newValue?: string }
export interface RunMeta {
  purpose: string; build: string; environment: string; url: string; browser: string; bsLink: string; testedBy: string;
}
export interface Run extends RunMeta {
  id: string; mode: Mode; components: string[]; createdAt: string; signedOffAt?: string; locked: boolean;
  previousRunId?: string; cases: RunCase[]; audit: AuditEntry[];
}

export const ROOT_CAUSES = ["Code change", "Config", "Data", "Environment", "Test gap"] as const;
export interface Analysis {
  key: string;            // `${component}|${badRunId}`
  component: string; badRunId: string; lastGoodRunId: string; firstBadBuild: string;
  changes: string; rootCause: string; notes: string; updatedAt: string;
}
export interface RunFile { app: "qa-run-manager-run"; version: 1; exportedAt: string; run: Run; evidenceData?: Record<string, string> }
export interface Backup {
  app: "qa-run-manager-backup"; version: 1; exportedAt: string; cases: TestCase[]; deps: Record<string, string[]>;
  runs: Run[]; history?: TestCase[]; analyses?: Analysis[]; evidenceData?: Record<string, string>;
}
