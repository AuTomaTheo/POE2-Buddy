import Link from "next/link";
import { START_DEMOS } from "./start/demos";
import { Alert } from "./shared/alert";
import { Badge } from "./shared/badge";
import { Card } from "./shared/card";

export function Dashboard({
  gggEnabled,
  gggMessage,
}: {
  gggEnabled: boolean;
  gggMessage: string;
}) {
  return (
    <div className="dashboard">
      <p>
        PoE2 Buddy helps you read a Path of Exile 2 build and see what this app
        can verify. It does not invent a best build.
      </p>
      <ol className="steps">
        <li>
          <strong>Import your build.</strong> Paste a Path of Building export,
          or open a demo.
        </li>
        <li>
          <strong>Choose what you want to improve.</strong> Passives, gear, or a
          craft target.
        </li>
        <li>
          <strong>Review recommendations.</strong> Each result says whether it
          is a heuristic, a measurement, or community-derived crafting data.
        </li>
      </ol>
      <div className="evidence-list">
        <div>
          <Badge tone="heuristic">Heuristic</Badge>
          <p>
            A score from the passive rules in this app. It is not DPS or EHP.
          </p>
        </div>
        <div>
          <Badge tone="measured">Measured by PoB2</Badge>
          <p>
            A whole-build change from the local calculator, only when that
            calculator is enabled.
          </p>
        </div>
        <div>
          <Badge tone="community">Community-derived</Badge>
          <p>
            A crafting weight from a community source. It is not an official
            chance.
          </p>
        </div>
      </div>
      <p className="start-actions">
        <Link className="button" href="/build?source=pob2">
          Analyze a build
        </Link>
        <a className="button button-secondary" href="#demos">
          Try a demo build
        </a>
      </p>
      <div className="start-grid">
        <Card title="Import from Path of Building">
          <p>Paste an export code. Buddy does not fetch share links.</p>
          <p>
            <Link href="/build?source=pob2">Paste an export</Link>
          </p>
        </Card>
        <Card title="Try a demo build">
          <p>Open a named example. No account is required.</p>
          <p>
            <a href="#demos">See demos</a>
          </p>
        </Card>
        <Card title="GGG account">
          {gggEnabled ? (
            <p>
              <a href="/api/auth/ggg/start">Connect GGG account</a>
            </p>
          ) : (
            <>
              <p>Unavailable until access is configured.</p>
              <Alert tone="info">{gggMessage}</Alert>
            </>
          )}
        </Card>
      </div>
      <section id="demos">
        <h2>Demos</h2>
        <div className="start-grid">
          {START_DEMOS.map((demo) => (
            <Card key={demo.id} title={demo.title}>
              <p>{demo.lead}</p>
              <ul>
                {demo.shows.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>
                <Link className="button" href={demo.href}>
                  Open demo
                </Link>
              </p>
              <details>
                <summary>Technical details</summary>
                <p className="technical">{demo.technicalId}</p>
              </details>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
