import type { Transaccion } from "../types";

// Resultado del análisis de outlier por z-score.
// zMax es el mayor |monto - promedio| / desv del periodo.
// Si zMax es 0 con transaccionId null, el outlier no es medible
// (periodo vacío, sin dispersión o muestra insuficiente n<3).
export type OutlierResultado = {
  zMax: number;
  transaccionId: string | null;
  monto: number | null;
  n: number;
};

// Nivel de cada indicador y veredicto final del Módulo 1.
// "ok" = normal, "observar" = revisión manual, "alerta" = señal fuerte.
export type NivelAlerta = "ok" | "observar" | "alerta";

// Resultado automático del Módulo 1: lo que el agente calcula por ff
// empresa sin pasar fechas y el grafo muestra por nodo.
// crecimientoMensual es tanto por uno (2.5 = +250%; Infinity = sin base previa).
// Nota JSON: Infinity se serializa como null; el grafo debe pintar
// usando niveles/veredicto (Infinity ya queda como "observar").
export type ResultadoModulo1 = {
  desviacionEstandar: number;
  coeficienteVariacion: number;
  crecimientoMensual: number;
  zScore: OutlierResultado;
  niveles: { variacion: NivelAlerta; crecimiento: NivelAlerta; zScore: NivelAlerta };
  veredicto: NivelAlerta; // alerta si ALGUNA métrica es alerta (regla OR)
  ventanaDias: number;
  hasta: string; // "ahora" usado como corte (YYYY-MM-DD)
};

export class Capa1 {
  private readonly empresaId: string;
  private readonly transacciones: Transaccion[]; // ya filtradas
  private readonly volumen: VolumenFrecuenciaAnalizador;

  constructor(empresaId: string, todas: Transaccion[]) {
    this.empresaId = empresaId;
    this.transacciones = todas.filter(t => t.origenId == empresaId);

    this.volumen = new VolumenFrecuenciaAnalizador(this.transacciones);
  }

  // Análisis automático del Módulo 1: el agente lo llama por empresa
  // sin pasar fechas y el grafo muestra los 3 indicadores + veredicto.
  // Ventana móvil de `dias` (30 por defecto): actual vs previa.
  // Regla OR: basta UNA métrica en alerta para veredicto alerta.
  // Umbrales por defecto (calibrar por giro después):
  // CV >1 alerta, >=0.5 observar. Crecimiento >2 alerta, >1 observar,
  // Infinity (sin base previa) observar, caída <=-0.8 observar (vaciamiento).
  // zScore >3 alerta, >=2 observar.
  analizarModulo1(dias: number = 30): ResultadoModulo1 {
    const desviacionEstandar = this.volumen.desviacionEstandarTiempoReal(dias);
    const coeficienteVariacion = this.volumen.coeficienteVariacionTiempoReal(dias);
    const crecimientoMensual = this.volumen.crecimientoTiempoReal(dias);
    const zScore = this.volumen.zScoreMaximoTiempoReal(dias);

    const nivelVariacion: NivelAlerta =
      coeficienteVariacion > 1
        ? "alerta"
        : coeficienteVariacion >= 0.5
          ? "observar"
          : "ok";
    const nivelCrecimiento: NivelAlerta =
      crecimientoMensual === Infinity || crecimientoMensual <= -0.8
        ? "observar"
        : crecimientoMensual > 2
          ? "alerta"
          : crecimientoMensual > 1
            ? "observar"
            : "ok";
    const nivelZ: NivelAlerta =
      zScore.zMax > 3 ? "alerta" : zScore.zMax >= 2 ? "observar" : "ok";

    const veredicto: NivelAlerta =
      nivelVariacion === "alerta" || nivelCrecimiento === "alerta" || nivelZ === "alerta"
        ? "alerta"
        : nivelVariacion === "observar" || nivelCrecimiento === "observar" || nivelZ === "observar"
          ? "observar"
          : "ok";

    return {
      desviacionEstandar,
      coeficienteVariacion,
      crecimientoMensual,
      zScore,
      niveles: { variacion: nivelVariacion, crecimiento: nivelCrecimiento, zScore: nivelZ },
      veredicto,
      ventanaDias: dias,
      hasta: this.volumen.hastaISO(),
    };
  }
}

export class VolumenFrecuenciaAnalizador {
  private readonly transacciones: Transaccion[];


  constructor(transacciones: Transaccion[]) {
    this.transacciones = transacciones;
  }

  // Cuenta cuántas transacciones ocurrieron en un día calendario.
  getNumeroTransaccionDia(fechaISO: string): number {
    const dia = fechaISO.slice(0, 10);
    const diaTransacciones = this.transacciones.filter(t => t.fecha.slice(0, 10) === dia);
    const numTransacciones = diaTransacciones.length;
    return numTransacciones;
  }

  // Cuenta cuántas transacciones ocurrieron en un mes calendario.
  getNumeroTransaccionMes(fechaISO: string): number {
    const fecha = fechaISO.slice(0, 7);
    const mesTransacciones = this.transacciones.filter(t => t.fecha.slice(0, 7) === fecha);
    const numTransacciones = mesTransacciones.length;
    return numTransacciones;
  }

  // Cuenta cuántas transacciones ocurrieron en una semana ISO.
  getNumeroTransaccionSemana(fechaISO: string): number {
    const semana = getClaveSemanaISO(fechaISO);
    const semanaTransacciones = this.transacciones.filter(t => getClaveSemanaISO(t.fecha) === semana);
    const numTransacciones = semanaTransacciones.length;
    return numTransacciones;
  }

  // Suma el monto total movido en un año calendario.
  montoMovidoPeriodo(fechaISO: string): number {
    const añoTransacciones = this.transacciones.filter(t => t.fecha.slice(0, 4) === fechaISO.slice(0, 4));
    const monto = añoTransacciones.reduce((acc, t) => acc + t.monto, 0);
    return monto;
  }

  montoMovidoMes(fechaISO: string): number {
    const mes = fechaISO.slice(0, 7);
    const mesTransacciones = this.transacciones.filter(t => t.fecha.slice(0, 7) === mes);
    return mesTransacciones.reduce((acc, t) => acc + t.monto, 0);
  }

  // Calcula el ticket promedio del año: suma de montos / número de tx.
  ticketPromedio(fechaISO: string): number {
    const añoTransacciones = this.transacciones.filter(t => t.fecha.slice(0, 4) === fechaISO.slice(0, 4));
    if (añoTransacciones.length === 0) {
      return 0;
    }
    const suma = añoTransacciones.reduce((acc, t) => acc + t.monto, 0);
    const ticketProm = suma / añoTransacciones.length;
    return ticketProm;
  }

  ///////-------------------------------------------------------------------------

  // Calcula la desviación estándar poblacional de los montos del año.
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

  ///////-------------------------------------------------------------------------


  //Coeficiente de variacion
  coeficienteVariacion(fechaISO: string): number {
    const promedio = this.ticketPromedio(fechaISO);
    if (promedio === 0) return 0;
    const desviacion = this.desviacionEstandarPeriodo(fechaISO);
    return desviacion / promedio; // >0.5-1 empieza a ser señal de comportamiento errático
  }

  ///////-------------------------------------------------------------------------


  crecimientoMensual(mesActualISO: string, mesAnteriorISO: string): number {
    const actual = this.montoMovidoMes(mesActualISO);
    const anterior = this.montoMovidoMes(mesAnteriorISO);
    if (anterior === 0) return actual > 0 ? Infinity : 0;
    return (actual - anterior) / anterior; // ej. 2.5 = creció 250%
  }

  ///////-------------------------------------------------------------------------

  // Filtra las transacciones por periodo calendario.
  // "mes" compara prefijo YYYY-MM, "año" compara prefijo YYYY.
  // Centraliza los slice que antes estaban copiados en cada método.
  private porPeriodo(fechaISO: string, periodo: "mes" | "año"): Transaccion[] {
    if (periodo === "mes") {
      const mes = fechaISO.slice(0, 7);
      return this.transacciones.filter(t => t.fecha.slice(0, 7) === mes);
    }
    const año = fechaISO.slice(0, 4);
    return this.transacciones.filter(t => t.fecha.slice(0, 4) === año);
  }

  // Calcula promedio y desviación estándar poblacional de un subconjunto.
  // Fórmula: promedio = Σmonto/n; varianza = Σ(monto-promedio)²/n; desv = √varianza.
  // Si el subconjunto está vacío devuelve promedio 0 y desv 0.
  private statsDe(subset: Transaccion[]): { promedio: number; desv: number } {
    if (subset.length === 0) {
      return { promedio: 0, desv: 0 };
    }
    const suma = subset.reduce((acc, t) => acc + t.monto, 0);
    const promedio = suma / subset.length;
    let sumatoria = 0;
    for (let i = 0; i < subset.length; i++) {
      const diferencia = subset[i].monto - promedio;
      sumatoria += diferencia * diferencia;
    }
    const desv = Math.sqrt(sumatoria / subset.length);
    return { promedio, desv };
  }

  // Calcula el z-score máximo de un subconjunto ya filtrado.
  // z(tx) = |monto - promedio| / desv. Retiene la tx con el valor mayor.
  // No medible (zMax 0 + null) si está vacío, sin dispersión o n<3.
  private zMaxDe(subset: Transaccion[]): OutlierResultado {
    if (subset.length === 0) {
      return { zMax: 0, transaccionId: null, monto: null, n: 0 };
    }
    const { promedio, desv } = this.statsDe(subset);
    if (desv === 0 || subset.length < 3) {
      return { zMax: 0, transaccionId: null, monto: null, n: subset.length };
    }
    let zMax = 0;
    let transaccionId: string | null = null;
    let monto: number | null = null;
    for (let i = 0; i < subset.length; i++) {
      const z = Math.abs(subset[i].monto - promedio) / desv;
      if (z > zMax) {
        zMax = z;
        transaccionId = subset[i].id;
        monto = subset[i].monto;
      }
    }
    return { zMax, transaccionId, monto, n: subset.length };
  }

  // Detecta la transacción más atípica del mes por z-score.
  // Reúsa porPeriodo + statsDe + zMaxDe; no duplica la fórmula.
  // Referencia para el veredicto: zMax > 3 alerta, 2–3 observar, < 2 ok.
  // Con n<3 el z máximo teórico es bajo: devuelve no medible a propósito.
  zScoreMaximoMes(fechaISO: string): OutlierResultado {
    return this.zMaxDe(this.porPeriodo(fechaISO, "mes"));
  }

  // Detecta la transacción más atípica del año por z-score.
  // Sirve de contexto anual frente al mensual (¿el outlier del mes
  // también lo es en el año?). Misma fórmula compartida vía zMaxDe.
  zScoreMaximoAño(fechaISO: string): OutlierResultado {
    return this.zMaxDe(this.porPeriodo(fechaISO, "año"));
  }

  ///////-------------------------------------------------------------------------
  // Métodos en tiempo real: sin fechas manuales. El "ahora" se deriva
  // de la fecha máxima en los datos y las ventanas son móviles de N días.
  // El agente los llama por empresa y el grafo muestra los resultados.
  ///////-------------------------------------------------------------------------

  // los datos: fecha máxima entre las transacciones.
  // Así funciona con mocks, con Snowflake por batch y en vivo,
  // sin depender del reloj del servidor. Vacío: usa hoy UTC.
  private ahoraISO(): string {
    if (this.transacciones.length === 0) {
      return new Date().toISOString().slice(0, 10);
    }
    let max = this.transacciones[0].fecha.slice(0, 10);
    for (let i = 1; i < this.transacciones.length; i++) {
      const f = this.transacciones[i].fecha.slice(0, 10);
      if (f > max) {
        max = f;
      }
    }
    return max;
  }

  // Ventana móvil de N días terminando al cierre del "ahora" menos el desfase.
  // desfase 0 = ventana actual [ahora-dias+1, ahora] (incluye el día del corte).
  // desfase = dias = ventana previa de igual longitud justo antes.
  private ventana(dias: number, desfaseDias: number = 0): Transaccion[] {
    const msPorDia = 24 * 60 * 60 * 1000;
    // +1 día: el corte es un día calendario completo, no su medianoche inicial.
    const hastaMs = Date.parse(this.ahoraISO()) + msPorDia - desfaseDias * msPorDia;
    const desdeMs = hastaMs - dias * msPorDia;
    return this.transacciones.filter(t => {
      const ms = Date.parse(t.fecha.slice(0, 10));
      return ms >= desdeMs && ms < hastaMs;
    });
  }

  // Suma los montos de un subconjunto (0 si está vacío).
  private sumaDe(subset: Transaccion[]): number {
    return subset.reduce((acc, t) => acc + t.monto, 0);
  }

  // Fecha de corte usada como "ahora" (para mostrar en el grafo).
  hastaISO(): string {
    return this.ahoraISO();
  }

  // Desviación estándar poblacional de la ventana actual, sin fecha manual.
  // Reúsa statsDe: promedio y desv en un solo paso.
  desviacionEstandarTiempoReal(dias: number = 30): number {
    return this.statsDe(this.ventana(dias)).desv;
  }

  // Coeficiente de variación de la ventana actual: desv / promedio.
  // 0 si no hay promedio (evita NaN con ventana vacía).
  coeficienteVariacionTiempoReal(dias: number = 30): number {
    const { promedio, desv } = this.statsDe(this.ventana(dias));
    if (promedio === 0) {
      return 0;
    }
    return desv / promedio;
  }

  // Crecimiento ventana actual vs ventana previa de igual longitud.
  // Ej. 2.5 = +250%. Sin base previa: Infinity si hay movimiento, 0 si no.
  crecimientoTiempoReal(dias: number = 30): number {
    const actual = this.sumaDe(this.ventana(dias));
    const anterior = this.sumaDe(this.ventana(dias, dias));
    if (anterior === 0) {
      return actual > 0 ? Infinity : 0;
    }
    return (actual - anterior) / anterior;
  }

  // Outlier por z-score sobre la ventana actual, sin fecha manual.
  // Reúsa zMaxDe (no medible si n<3 o sin dispersión).
  zScoreMaximoTiempoReal(dias: number = 30): OutlierResultado {
    return this.zMaxDe(this.ventana(dias));
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


export class CambioPorcentualVolumen {

}
