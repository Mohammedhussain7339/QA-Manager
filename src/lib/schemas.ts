import { z } from "zod";

const priority = z.enum(["P1", "P2", "P3"]);
const loginState = z.enum(["Login", "Logout", "Both"]);
const status = z.enum(["Not Run", "Passed", "Failed", "Blocked", "Skipped"]);

export const caseFormSchema = z.object({
  component: z.string().trim().min(1, "Component is required"),
  subComponent: z.string().trim(),
  testCase: z.string().trim().min(1, "Test case is required"),
  expected: z.string().trim().min(1, "Expected result is required"),
  priority, loginState,
  tags: z.string(),
});
export type CaseFormValues = z.infer<typeof caseFormSchema>;

export const analysisSchema = z.object({
  lastGoodRunId: z.string().min(1, "Choose the last good run"),
  firstBadBuild: z.string().trim().min(1, "First bad build is required"),
  changes: z.string().trim(),
  rootCause: z.enum(["Code change", "Config", "Data", "Environment", "Test gap"], { errorMap: () => ({ message: "Choose a root cause" }) }),
  notes: z.string().trim(),
});
export type AnalysisValues = z.infer<typeof analysisSchema>;

const evidence = z.object({ id: z.string(), kind: z.enum(["file", "link"]), name: z.string(), type: z.string(), size: z.number(),
  sha256: z.string(), addedAt: z.string(), link: z.string().optional() });
const runCase = z.object({ id: z.string(), component: z.string(), subComponent: z.string(), testCase: z.string(), expected: z.string(),
  priority, group: z.enum(["Selected", "Related"]), masterVersion: z.number(), custom: z.boolean().optional(), status, actual: z.string(),
  bugId: z.string(), evidence: z.array(evidence), executedAt: z.string().optional(), rootCause: z.string().optional() });
const audit = z.object({ at: z.string(), by: z.string(), action: z.string(), caseId: z.string().optional(), field: z.string().optional(),
  oldValue: z.string().optional(), newValue: z.string().optional() });
export const runSchema = z.object({ id: z.string().regex(/^Run-\d+$/, "Invalid run id"), mode: z.enum(["complete", "selected", "related"]),
  components: z.array(z.string()), purpose: z.string(), build: z.string(), environment: z.string(), url: z.string(), browser: z.string(),
  bsLink: z.string(), testedBy: z.string(), createdAt: z.string(), signedOffAt: z.string().optional(), locked: z.boolean(),
  previousRunId: z.string().optional(), cases: z.array(runCase), audit: z.array(audit) });
const testCase = z.object({ id: z.string(), component: z.string(), subComponent: z.string(), testCase: z.string(), expected: z.string(),
  priority, loginState, tags: z.array(z.string()), active: z.boolean(), version: z.number(), lastUpdated: z.string() });
const analysisRecord = z.object({ key: z.string(), component: z.string(), badRunId: z.string(), lastGoodRunId: z.string(),
  firstBadBuild: z.string(), changes: z.string(), rootCause: z.string(), notes: z.string(), updatedAt: z.string() });

export const runFileSchema = z.object({ app: z.literal("qa-run-manager-run"), version: z.literal(1), exportedAt: z.string(),
  run: runSchema, evidenceData: z.record(z.string()).optional() });
export const backupSchema = z.object({ app: z.literal("qa-run-manager-backup"), version: z.literal(1), exportedAt: z.string(),
  cases: z.array(testCase), deps: z.record(z.array(z.string())), runs: z.array(runSchema), history: z.array(testCase).optional(),
  analyses: z.array(analysisRecord).optional(), evidenceData: z.record(z.string()).optional() });
