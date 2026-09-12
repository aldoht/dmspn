import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home | DMSPN",
};

export default function Home() {
  return (
    <div className="bg-background w-full h-full">
      <h1 className="text-3xl font-display">Relation Graph</h1>
    </div>
  );
}
