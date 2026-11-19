import Funnel from "@/components/Funnel";
import { SCREENS } from "@/lib/config";

// Every quiz screen has its own URL (/step-<id>); all of them render the same funnel page.
export function generateStaticParams() {
  return [{ step: [] }, ...SCREENS.slice(1).map((s) => ({ step: [`step-${s.id.replace(/_/g, "-")}`] }))];
}
export const dynamicParams = false;

export default function Page() {
  return <Funnel />;
}
