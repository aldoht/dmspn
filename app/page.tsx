import { DashboardPage } from "@/features/dashboard/components/DashboardPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | DMSPN",
};

export default function Home() {
  return (
    <div className="bg-background w-full h-full">
      <h1 className="text-3xl font-display m-3">
        Dashboard
      </h1>
      <DashboardPage />
    </div>
  );
}
