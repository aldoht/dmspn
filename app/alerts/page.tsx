import { executeQuery } from "@/lib/db";

export default async function AlertasPage() {
  const alertas = await executeQuery<void>("SELECT 1;");
  console.log(alertas);

  return <p>Alerts page</p>;
}
