import {
  gggLiveImportPublicStatus,
  readGggLiveImportReadiness,
} from "@poe2-helper/data-sources";
import { ANALYSIS_FIXTURES } from "../../server/analyze-passive-build";
import { findStartDemo } from "../start/demos";
import { AnalysisScreen } from "../analysis-screen";
import { analysisInputForDemo } from "../../server/load-start-demo";

export default async function BuildPage({
  searchParams,
}: {
  searchParams: Promise<{
    demo?: string | string[];
    source?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const demoId = firstParam(params.demo);
  const demo = findStartDemo(demoId);
  const requestedSource = firstParam(params.source);
  const initialSource =
    demo?.kind === "fixture" || demo?.kind === "pob2"
      ? demo.kind
      : requestedSource === "fixture"
        ? "fixture"
        : "pob2";
  return (
    <AnalysisScreen
      key={`${initialSource}:${demo?.id ?? ""}:${demo?.objective ?? "offensive"}`}
      fixtures={ANALYSIS_FIXTURES}
      liveImport={gggLiveImportPublicStatus(
        readGggLiveImportReadiness(process.env),
      )}
      initialSource={initialSource}
      initialDemoId={demo && demo.kind !== "page" ? demo.id : ""}
      initialObjective={demo?.objective ?? "offensive"}
      initialPob2Code={
        demo?.kind === "pob2"
          ? (analysisInputForDemo(demo.id)?.pob2Code ?? "")
          : ""
      }
    />
  );
}

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
