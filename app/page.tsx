import type { Metadata } from "next";
import { RecoveryConsole } from "./recovery-console";

export const metadata: Metadata = {
  title: "RecoverFlow | Recovery control plane",
  description: "Turn payment failures into safe, explainable recovery journeys.",
};

export default function Home() {
  return <RecoveryConsole />;
}
