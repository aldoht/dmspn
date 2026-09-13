import { getEmpresasActuales } from "@/features/enterprises/queries";
import { EnterpriseTable } from "@/features/enterprises/components/EnterpriseTable";

export default async function EnterprisePage() {
  const enterprises = await getEmpresasActuales();

  return (
    <div className="h-full w-full bg-background pr-5">
      <h1 className="m-3 font-display text-3xl text-text-primary">
        All registered enterprises
      </h1>
      <EnterpriseTable enterprises={enterprises} />
    </div>
  );
}
