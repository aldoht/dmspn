import type { Transaccion } from "../types";

export class Capa1 {
  private readonly empresaId: string;
  private readonly transacciones: Transaccion[]; // ya filtradas
  private readonly volumen: VolumenFrecuenciaAnalizador;

  constructor(empresaId: string, todas: Transaccion[]) {
    this.empresaId = empresaId;
    this.transacciones = todas.filter(t => t.origenId == empresaId);
    // 3. copia defensiva + validación
    // 4. this.volumen = new (...this.transacciones)
    this.volumen = new VolumenFrecuenciaAnalizador(this.transacciones);
  }

  //analizadorModulo 1

}

export class VolumenFrecuenciaAnalizador {

  // Lista de transacciones ya filtradas por empresa (solo origen).
  // Se guarda como copia defensiva para no mutar el array original.
  private readonly transacciones: Transaccion[];

  // Crea el analizador con las transacciones de una empresa.
  // Hace copia defensiva para aislar el estado interno.
  constructor(transacciones: Transaccion[]) {
    this.transacciones = [...transacciones];
  }

  // Cuenta cuántas transacciones ocurrieron en un día calendario.
  // Compara por prefijo YYYY-MM-DD para tolerar fecha con hora.
  getNumeroTransaccionDia(fechaISO: string): number {
    const dia = fechaISO.slice(0, 10);
    const diaTransacciones = this.transacciones.filter(t => t.fecha.slice(0, 10) === dia);
    const numTransacciones = diaTransacciones.length;
    return numTransacciones;
  }

  // Cuenta cuántas transacciones ocurrieron en un mes calendario.
  // Agrupa por prefijo YYYY-MM.
  getNumeroTransaccionMes(fechaISO: string): number {
    const fecha = fechaISO.slice(0, 7);
    const mesTransacciones = this.transacciones.filter(t => t.fecha.slice(0, 7) === fecha);
    const numTransacciones = mesTransacciones.length;
    return numTransacciones;
  }

  // Cuenta cuántas transacciones ocurrieron en una semana ISO.
  // Agrupa por clave YYYY-Www calculada con getClaveSemanaISO.
  getNumeroTransaccionSemana(fechaISO: string): number {
    const semana = getClaveSemanaISO(fechaISO);
    const semanaTransacciones = this.transacciones.filter(t => getClaveSemanaISO(t.fecha) === semana);
    const numTransacciones = semanaTransacciones.length;
    return numTransacciones;
  }

  // Suma el monto total movido en un año calendario.
  // Filtra por prefijo YYYY. Con reduce con inicial 0, vacío devuelve 0.
  montoMovidoPeriodo(fechaISO: string): number {
    const añoTransacciones = this.transacciones.filter(t => t.fecha.slice(0, 4) === fechaISO.slice(0, 4));
    const monto = añoTransacciones.reduce((acc, t) => acc + t.monto, 0);
    return monto;
  }

  // Calcula el ticket promedio del año: suma de montos / número de tx.
  // Si no hay transacciones en el año devuelve 0 para evitar NaN.
  ticketPromedio(fechaISO: string): number {
    const añoTransacciones = this.transacciones.filter(t => t.fecha.slice(0, 4) === fechaISO.slice(0, 4));
    if (añoTransacciones.length === 0) {
      return 0;
    }
    const suma = añoTransacciones.reduce((acc, t) => acc + t.monto, 0);
    const ticketProm = suma / añoTransacciones.length;
    return ticketProm;
  }

  // Calcula la desviación estándar poblacional de los montos del año.
  // Fórmula: promedio = Σmonto/n; varianza = Σ(monto-promedio)²/n; desv = √varianza.
  // Poblacional (entre n) porque describe el periodo completo, no una muestra.
  // Si no hay transacciones devuelve 0 (sin dispersión medible).
  desviacionEstandarPeriodo(fechaISO: string): number {
    const añoTransacciones = this.transacciones.filter(t => t.fecha.slice(0, 4) === fechaISO.slice(0, 4));
    if (añoTransacciones.length === 0) {
      return 0;
    }
    const promedio = this.ticketPromedio(fechaISO);
    let sumatoria = 0;
    for (let i = 0; i < añoTransacciones.length; i++) {
      const diferencia = añoTransacciones[i].monto - promedio;
      sumatoria += diferencia * diferencia;
    }
    const varianza = sumatoria / añoTransacciones.length;
    const desvia = Math.sqrt(varianza);
    return desvia;
  }

}

function getClaveSemanaISO(fechaISO: string): string {
  const año = Number(fechaISO.slice(0, 4));
  const mes = Number(fechaISO.slice(5, 7)) - 1;
  const dia = Number(fechaISO.slice(8, 10));
  const fecha = new Date(Date.UTC(año, mes, dia));
  const diaSemana = (fecha.getUTCDay() + 6) % 7;
  fecha.setUTCDate(fecha.getUTCDate() - diaSemana + 3);
  const primerJueves = new Date(Date.UTC(fecha.getUTCFullYear(), 0, 4));
  const diaSemanaPrimerJueves = (primerJueves.getUTCDay() + 6) % 7;
  primerJueves.setUTCDate(primerJueves.getUTCDate() - diaSemanaPrimerJueves + 3);
  const semana = 1 + Math.round((fecha.getTime() - primerJueves.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${fecha.getUTCFullYear()}-W${String(semana).padStart(2, "0")}`;
}
