import GraphPreviewPage from "@/features/graph/components/GraphPreviewPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home | DMSPN",
};

export default function Home() {
  return (
    <div className="bg-background w-full h-full">
      <h1 className="text-3xl font-display m-3">
        Activity in the last 10 days
      </h1>
      <GraphPreviewPage />
    </div>
  );
}
