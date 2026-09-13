import { getEmpresasActuales } from "@/features/enterprises/queries";

export async function GET() {
  try {
    const data = await getEmpresasActuales();
    return Response.json(data);
  } catch (error) {
    console.error("Error while fetching enterprises:", error);
    return Response.json(
      { error: "Could not fetch enterprises." },
      { status: 500 },
    );
  }
}
