import { executeQuery } from "@/lib/db";

export default async function AlertasPage() {
  const alertas = await executeQuery<void>("SELECT 1;");
  console.log(alertas);

  return <p>Soy la pagina de alertas</p>;
}
