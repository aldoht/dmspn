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

// Resultado automático del Módulo 1: lo que el agente calcula por
// empresa sin pasar fechas y el grafo muestra por nodo.
// crecimientoMensual y cambioMesContraMes son tanto por uno
// (2.5 = +250%; Infinity = sin base previa).
// Nota JSON: Infinity se serializa como null; el grafo debe pintar
// usando niveles/veredicto (Infinity ya queda como "observar").
export type ResultadoModulo1 = {
  desviacionEstandar: number;
  coeficienteVariacion: number;
  crecimientoMensual: number;
  cambioMesContraMes: number; // Módulo 2 (Velocidad) como 4ª métrica del veredicto
  estructuracion: number; // Módulo 3: nº txs pequeñas que suman una grande (0 = sin patrón)
  discrepanciaPais: number; // Módulo 4: nº txs fuera del país registrado (0 = sin patrón)
  riesgoGeografico: number; // Módulo 4: nº txs a país alto riesgo/sin regulación (0 = sin patrón)
  concentracionCuenta: number; // Módulo 5: ratio 0-1 a la cuenta top (0 = sin patrón)
  cuentaTopDestino: string | null; // Módulo 5: cuenta con más monto (contexto, no vota)
  ciclosDetectados: number; // Módulo 5: nº ciclos que vuelven a la empresa (0 = sin patrón)
  zScore: OutlierResultado;
  niveles: {
    variacion: NivelAlerta;
    crecimiento: NivelAlerta;
    velocidad: NivelAlerta;
    estructuracion: NivelAlerta;
    discrepancia: NivelAlerta;
    riesgoGeo: NivelAlerta;
    concentracion: NivelAlerta;
    ciclos: NivelAlerta;
    zScore: NivelAlerta;
  };
  veredicto: NivelAlerta; // alerta si ALGUNA métrica es alerta (regla OR)
  ventanaDias: number;
  hasta: string; // "ahora" usado como corte (YYYY-MM-DD)
};

export class Capa1 {
  private readonly empresaId: string;
  private readonly transacciones: Transaccion[]; // ya filtradas
  private readonly volumen: VolumenFrecuenciaAnalizador;
  // Calculadora del Módulo 2 (Velocidad). Vive aquí para reutilizar el
  // filtrado por empresa del constructor; su veredicto propio
  // (analizarModulo2) llegará cuando el módulo esté completo.
  private readonly velocidad: CambioPorcentualVolumen;
  // Calculadora del Módulo 3 (Estructuración). Mismo patrón: reutiliza el
  // filtrado por empresa; su veredicto propio llegará con el módulo.
  private readonly estructuracionCalc: EstructuracionAnalizador;
  // Calculadora del Módulo 4 (Geografía). Recibe además el país registrado
  // para la discrepancia; su veredicto propio llegará con el módulo.
  private readonly geografia: GeografiaAnalizador;
  // Calculadora del Módulo 5 (Contrapartes). Recibe además el contexto
  // (todas las txs) para reconstruir ciclos más allá de la empresa;
  // su veredicto propio llegará con el módulo.
  private readonly contrapartes: ContrapartesAnalizador;

  // País registrado de la empresa (CODIGO_PAIS vía su GEOGRAFIA_SK,
  // ej. "MEX"). Opcional para no romper llamadas actuales: sin él,
  // la discrepancia devuelve 0 documentado.
  private readonly paisRegistrado: string | null;

  constructor(
    empresaId: string,
    todas: Transaccion[],
    paisRegistrado?: string | null,
  ) {
    this.empresaId = empresaId;
    this.transacciones = todas.filter(t => t.origenId == empresaId);
    this.paisRegistrado = paisRegistrado ?? null;

    this.volumen = new VolumenFrecuenciaAnalizador(this.transacciones);
    this.velocidad = new CambioPorcentualVolumen(this.transacciones);
    this.estructuracionCalc = new EstructuracionAnalizador(this.transacciones);
    this.geografia = new GeografiaAnalizador(
      this.transacciones,
      this.paisRegistrado,
    );
    this.contrapartes = new ContrapartesAnalizador(
      this.transacciones,
      todas,
    );
  }

  // Análisis automático del Módulo 1: el agente lo llama por empresa
  // sin pasar fechas y el grafo muestra los indicadores + veredicto.
  // Ventana móvil de `dias` (30 por defecto): actual vs previa.
  // Regla OR: basta UNA métrica en alerta para veredicto alerta.
  // Umbrales por defecto (calibrar por giro después):
  // CV >1 alerta, >=0.5 observar. Crecimiento >2 alerta, >1 observar,
  // Infinity (sin base previa) observar, caída <=-0.8 observar (vaciamiento).
  // MoM (Velocidad, prorrateado): mismos cortes que crecimiento.
  // Estructuración: conteo >= 5 alerta, >= 3 observar (calibrable).
  // Geografía (ambas): conteo >= 3 alerta, >= 1 observar (un solo contacto
  // con alto riesgo ya amerita ojo; calibrable por giro).
  // Contrapartes: concentración >= 0.9 alerta, >= 0.7 observar (AGENTS.md);
  // ciclos >= 2 alerta, == 1 observar (un ida-y-vuelta suele ser legítimo).
  // zScore >3 alerta, >=2 observar.
  analizarModulo1(dias: number = 30): ResultadoModulo1 {
    const desviacionEstandar = this.volumen.desviacionEstandarTiempoReal(dias);
    const coeficienteVariacion = this.volumen.coeficienteVariacionTiempoReal(dias);
    const crecimientoMensual = this.volumen.crecimientoTiempoReal(dias);
    // 4ª métrica (Módulo 2): cambio % mes calendario contra mes, prorrateado.
    // Correlacionada con crecimientoMensual (distinta lente: calendario vs
    // ventanas móviles); se documenta para no calibrar "doble" sin saberlo.
    const cambioMesContraMes = this.velocidad.cambioPorcentualMesContraMes();
    // 5ª métrica (Módulo 3): nº txs pequeñas que suman una grande.
    // Ventana trailing `dias` (misma que el resto tiempo-real).
    const estructuracion = this.estructuracionCalc.contarEstructuracion(
      150_000,
      150_000 * 10,
      dias,
    );
    // 6ª y 7ª métricas (Módulo 4): discrepancia de país + riesgo geográfico.
    // Ventana trailing `dias`; sin país registrado la discrepancia es 0.
    const discrepanciaPais =
      this.geografia.contarDiscrepanciaPais(dias);
    const riesgoGeografico =
      this.geografia.contarRiesgoGeografico(dias);
    // 8ª y 9ª métricas (Módulo 5): concentración a cuenta top + ciclos.
    // Ventana trailing `dias`; cuentaTop es contexto (no vota).
    const concentracionCuenta =
      this.contrapartes.concentracionMaximaCuenta(dias);
    const cuentaTopDestino = this.contrapartes.cuentaTop(dias);
    const ciclosDetectados = this.contrapartes.contarCiclos(dias);
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
    // Conteo discreto sin Infinity: 0 = sin patrón (también sin datos).
    const nivelEstructuracion: NivelAlerta =
      estructuracion >= 5 ? "alerta" : estructuracion >= 3 ? "observar" : "ok";
    // Geografía: un solo contacto riesgoso ya amerita ojo (>= 1 observar).
    const nivelDiscrepancia: NivelAlerta =
      discrepanciaPais >= 3 ? "alerta" : discrepanciaPais >= 1 ? "observar" : "ok";
    const nivelRiesgoGeo: NivelAlerta =
      riesgoGeografico >= 3 ? "alerta" : riesgoGeografico >= 1 ? "observar" : "ok";
    // Ratio 0-1 sin Infinity: 0 = sin patrón (también sin datos).
    const nivelConcentracion: NivelAlerta =
      concentracionCuenta >= 0.9
        ? "alerta"
        : concentracionCuenta >= 0.7
          ? "observar"
          : "ok";
    // Conteo discreto: 0 = sin ciclos. Un solo ida-y-vuelta observar.
    const nivelCiclos: NivelAlerta =
      ciclosDetectados >= 2 ? "alerta" : ciclosDetectados >= 1 ? "observar" : "ok";
    // Misma escala que crecimientoMensual (tanto por uno).
    const nivelVelocidad: NivelAlerta =
      cambioMesContraMes === Infinity || cambioMesContraMes <= -0.8
        ? "observar"
        : cambioMesContraMes > 2
          ? "alerta"
          : cambioMesContraMes > 1
            ? "observar"
            : "ok";

    const veredicto: NivelAlerta =
      nivelVariacion === "alerta" ||
      nivelCrecimiento === "alerta" ||
      nivelVelocidad === "alerta" ||
      nivelEstructuracion === "alerta" ||
      nivelDiscrepancia === "alerta" ||
      nivelRiesgoGeo === "alerta" ||
      nivelConcentracion === "alerta" ||
      nivelCiclos === "alerta" ||
      nivelZ === "alerta"
        ? "alerta"
        : nivelVariacion === "observar" ||
            nivelCrecimiento === "observar" ||
            nivelVelocidad === "observar" ||
            nivelEstructuracion === "observar" ||
            nivelDiscrepancia === "observar" ||
            nivelRiesgoGeo === "observar" ||
            nivelConcentracion === "observar" ||
            nivelCiclos === "observar" ||
            nivelZ === "observar"
          ? "observar"
          : "ok";

    return {
      desviacionEstandar,
      coeficienteVariacion,
      crecimientoMensual,
      cambioMesContraMes,
      estructuracion,
      discrepanciaPais,
      riesgoGeografico,
      concentracionCuenta,
      cuentaTopDestino,
      ciclosDetectados,
      zScore,
      niveles: {
        variacion: nivelVariacion,
        crecimiento: nivelCrecimiento,
        velocidad: nivelVelocidad,
        estructuracion: nivelEstructuracion,
        discrepancia: nivelDiscrepancia,
        riesgoGeo: nivelRiesgoGeo,
        concentracion: nivelConcentracion,
        ciclos: nivelCiclos,
        zScore: nivelZ,
      },
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


// Calculadora del Módulo 2 (Velocidad): cambio porcentual del volumen
// mes calendario contra mes calendario, para detectar crecimiento repentino.
// Patrón gemelo a VolumenFrecuenciaAnalizador: recibe las transacciones
// (ya filtradas por empresa), copia defensiva, sin fechas manuales.
// Diferencia con crecimientoTiempoReal: ese compara ventanas móviles de N
// días; este compara MESES CALENDARIO (YYYY-MM actual vs anterior).
// Ambos miden crecimiento y están correlacionados: un mismo spike puede
// disparar los dos; se documenta para no calibrar "doble" sin saberlo.
// De momento standalone (Fase 1): su consumo en analizarModulo1 como 4ª
// métrica llega en Fase 2. No alimenta ningún panel: nutre el veredicto.
export class CambioPorcentualVolumen {
  // Transacciones de una empresa (solo origen). Copia defensiva.
  private readonly transacciones: Transaccion[];

  constructor(transacciones: Transaccion[]) {
    this.transacciones = [...transacciones];
  }

  // "Ahora" de los datos: fecha máxima entre las transacciones.
  // Duplicado a propósito desde VolumenFrecuenciaAnalizador para no acoplar
  // módulos (cada calculadora es autónoma). Vacío: usa hoy UTC.
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

  // Mes calendario anterior a YYYY-MM (maneja enero -> diciembre previo).
  private mesAnteriorDe(ahoraISO: string): string {
    const año = Number(ahoraISO.slice(0, 4));
    const mes = Number(ahoraISO.slice(5, 7)); // 1-12
    const base = new Date(Date.UTC(año, mes - 1, 1)); // día 1 del mes actual
    base.setUTCMonth(base.getUTCMonth() - 1); // retrocede un mes
    const y = base.getUTCFullYear();
    const m = String(base.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  // Suma los montos de un mes calendario YYYY-MM (0 si no hay tx).
  private montoMes(mes: string): number {
    return this.transacciones
      .filter((t) => t.fecha.slice(0, 7) === mes)
      .reduce((acc, t) => acc + t.monto, 0);
  }

  // Cambio porcentual mes contra mes en TANTO POR UNO (2.5 = +250%),
  // misma convención que crecimientoTiempoReal para no romper umbrales.
  // Compara TASAS DIARIAS (prorrateo): el mes en curso va parcial
  // (ej. sept al día 12) y el anterior completo; sin prorrateo todo
  // crecimiento saldría negativo por sistema.
  // Fórmula: tasaActual = sumaActual / díasTranscurridos;
  //          tasaAnterior = sumaAnterior / díasDelMesAnterior;
  //          cambio = (tasaActual - tasaAnterior) / tasaAnterior.
  // Sin base previa: Infinity si hay movimiento, 0 si no (evita NaN).
  cambioPorcentualMesContraMes(): number {
    const hasta = this.ahoraISO();
    const mesActual = hasta.slice(0, 7);
    const mesAnterior = this.mesAnteriorDe(hasta);
    const sumaActual = this.montoMes(mesActual);
    const sumaAnterior = this.montoMes(mesAnterior);
    if (sumaAnterior === 0) {
      return sumaActual > 0 ? Infinity : 0;
    }
    const diasTranscurridos = Number(hasta.slice(8, 10)); // día del mes de "ahora", >= 1
    const [yAnt, mAnt] = mesAnterior.split("-").map(Number);
    // Día 0 del mes mAnt (1-12) = último día del mes anterior = sus días.
    const diasMesAnterior = new Date(Date.UTC(yAnt, mAnt, 0)).getUTCDate();
    const tasaActual = sumaActual / diasTranscurridos;
    const tasaAnterior = sumaAnterior / diasMesAnterior;
    return (tasaActual - tasaAnterior) / tasaAnterior;
  }
}

// Calculadora del Módulo 3 (Patrones de estructuración): detecta
// fraccionamiento ("pitufeo") — muchas transacciones pequeñas por debajo
// del umbral que, sumadas, equivalen a una grande.
// Patrón gemelo a las demás calculadoras: recibe las transacciones
// (ya filtradas por empresa), copia defensiva, sin fechas manuales.
// De momento standalone (Fase 1): su consumo en analizarModulo1 como 5ª
// métrica llega en Fase 2. No alimenta ningún panel: nutre el veredicto.
export class EstructuracionAnalizador {
  // Transacciones de una empresa (solo origen). Copia defensiva.
  private readonly transacciones: Transaccion[];

  constructor(transacciones: Transaccion[]) {
    this.transacciones = [...transacciones];
  }

  // "Ahora" de los datos: fecha máxima entre las transacciones.
  // Duplicado a propósito desde las otras calculadoras para no acoplar
  // módulos (cada una es autónoma). Vacío: usa hoy UTC.
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

  // Ventana móvil de N días terminando al cierre del "ahora".
  // Misma semántica que VolumenFrecuenciaAnalizador.ventana.
  private ventana(dias: number): Transaccion[] {
    const msPorDia = 24 * 60 * 60 * 1000;
    // +1 día: el corte es un día calendario completo, no su medianoche inicial.
    const hastaMs = Date.parse(this.ahoraISO()) + msPorDia;
    const desdeMs = hastaMs - dias * msPorDia;
    return this.transacciones.filter((t) => {
      const ms = Date.parse(t.fecha.slice(0, 10));
      return ms >= desdeMs && ms < hastaMs;
    });
  }

  // Número de transacciones pequeñas que, sumadas, equivalen a una grande.
  // Filtra la ventana a txs con monto < umbral; si su suma >= montoGrande
  // devuelve el conteo; si no, 0 (igual que sin datos: nunca NaN).
  // Ejemplo: 12 txs de $140k en 30d suman $1.68M >= $1.5M -> devuelve 12.
  // Defaults: umbral $150k MXN (bajo la línea clásica de reporte de
  // ~USD 10,000) y montoGrande 10x el umbral (ratio auto-ajustable).
  contarEstructuracion(
    umbral: number = 150_000,
    montoGrande: number = umbral * 10,
    dias: number = 30,
  ): number {
    const pequenas = this.ventana(dias).filter((t) => t.monto < umbral);
    if (pequenas.length === 0) {
      return 0;
    }
    const suma = pequenas.reduce((acc, t) => acc + t.monto, 0);
    return suma >= montoGrande ? pequenas.length : 0;
  }
}

// Calculadora del Módulo 4 (Geografía): discrepancia de ubicación y
// exposición a países de alto riesgo / sin regulación formal.
// Patrón gemelo a las demás calculadoras: recibe las transacciones
// (ya filtradas por empresa) + el país registrado, copia defensiva,
// sin fechas manuales. La comparación es por país (CODIGO_PAIS), no por
// domicilio en texto: evita string-matching frágil.
// De momento standalone (Fase 1): su consumo en analizarModulo1 como 6ª
// y 7ª métricas llega en Fase 2 (Bloque B). No alimenta ningún panel.
export class GeografiaAnalizador {
  // Transacciones de una empresa (solo origen). Copia defensiva.
  private readonly transacciones: Transaccion[];
  // País registrado de la empresa (ej. "MEX"). null = no medible.
  private readonly paisRegistrado: string | null;

  constructor(transacciones: Transaccion[], paisRegistrado?: string | null) {
    this.transacciones = [...transacciones];
    this.paisRegistrado = paisRegistrado ?? null;
  }

  // "Ahora" de los datos: fecha máxima entre las transacciones.
  // Duplicado a propósito desde las otras calculadoras para no acoplar
  // módulos (cada una es autónoma). Vacío: usa hoy UTC.
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

  // Ventana móvil de N días terminando al cierre del "ahora".
  // Misma semántica que las demás calculadoras tiempo-real.
  private ventana(dias: number): Transaccion[] {
    const msPorDia = 24 * 60 * 60 * 1000;
    // +1 día: el corte es un día calendario completo, no su medianoche inicial.
    const hastaMs = Date.parse(this.ahoraISO()) + msPorDia;
    const desdeMs = hastaMs - dias * msPorDia;
    return this.transacciones.filter((t) => {
      const ms = Date.parse(t.fecha.slice(0, 10));
      return ms >= desdeMs && ms < hastaMs;
    });
  }

  // Nº txs en ventana cuya ubicación difiere de la registrada.
  // Compara CODIGO_PAIS (ej. tx PAN vs registrada MEX = 1). Cuenta al
  // revés también (registrada PAN + tx MEX = 1). Txs sin país no cuentan:
  // dato faltante no es discrepancia. Sin país registrado devuelve 0.
  contarDiscrepanciaPais(dias: number = 30): number {
    if (this.paisRegistrado == null) {
      return 0;
    }
    return this.ventana(dias).filter(
      (t) => t.codigoPais != null && t.codigoPais !== this.paisRegistrado,
    ).length;
  }

  // Nº txs en ventana hacia país de alto riesgo GAFI o sin regulación
  // formal (flags resueltos en SQL por JOIN a DIM_GEOGRAFIA).
  // Una tx a PAN/CYM suma aquí (y probablemente también en discrepancia:
  // son señales distintas que el OR del veredicto une). 0 si no hay.
  contarRiesgoGeografico(dias: number = 30): number {
    return this.ventana(dias).filter(
      (t) => t.paisAltoRiesgo === true || t.sinRegulacionFormal === true,
    ).length;
  }
}

// Calculadora del Módulo 5 (Contrapartes): concentración del dinero y
// transacciones circulares (típico de lavado: el dinero sale y regresa).
// Patrón gemelo a las demás calculadoras, con una diferencia: además de
// las txs propias necesita CONTEXTO (txs más allá de la empresa) para
// reconstruir ciclos A->B->C->A. Capa1 le pasa `todas` sin costo extra
// (route y queries intactos). Copia defensiva, sin fechas manuales.
// De momento standalone (Fase 1): su consumo en analizarModulo1 como 8ª
// y 9ª métricas llega en Fase 2 (Bloque B). No alimenta ningún panel.
export class ContrapartesAnalizador {
  // Txs emitidas por la empresa (solo origen). Copia defensiva.
  private readonly transacciones: Transaccion[];
  // Contexto para ciclos: idealmente TODAS las txs (incluye las que la
  // empresa recibe o no toca). Por defecto las propias (sin ciclos
  // visibles más allá de auto-loops, que se excluyen).
  private readonly contexto: Transaccion[];

  constructor(transacciones: Transaccion[], contexto?: Transaccion[]) {
    this.transacciones = [...transacciones];
    // Misma referencia solo si no dan contexto: se copian aparte para
    // aislar mutaciones externas en ambos arreglos.
    this.contexto = contexto ? [...contexto] : [...transacciones];
  }

  // "Ahora" de los datos: fecha máxima entre las txs propias.
  // Duplicado a propósito desde las otras calculadoras para no acoplar
  // módulos (cada una es autónoma). Vacío: usa hoy UTC.
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

  // "Ahora" del contexto: los bordes que cierran un ciclo suelen ser
  // posteriores a las emisiones propias (ej. C->A días después de A->B),
  // así que la ventana de ciclos se ancla al contexto, no a las propias.
  private ahoraContexto(): string {
    if (this.contexto.length === 0) {
      return this.ahoraISO();
    }
    let max = this.contexto[0].fecha.slice(0, 10);
    for (let i = 1; i < this.contexto.length; i++) {
      const f = this.contexto[i].fecha.slice(0, 10);
      if (f > max) {
        max = f;
      }
    }
    return max;
  }

  // Ventana móvil de N días terminando al cierre del "ahora".
  // Misma semántica que las demás calculadoras tiempo-real.
  private ventana(dias: number): Transaccion[] {
    const msPorDia = 24 * 60 * 60 * 1000;
    // +1 día: el corte es un día calendario completo, no su medianoche inicial.
    const hastaMs = Date.parse(this.ahoraISO()) + msPorDia;
    const desdeMs = hastaMs - dias * msPorDia;
    return this.transacciones.filter((t) => {
      const ms = Date.parse(t.fecha.slice(0, 10));
      return ms >= desdeMs && ms < hastaMs;
    });
  }

  // Suma montos por cuenta destino en la ventana (excluye txs sin cuenta:
  // dato faltante no es concentración). Devuelve mapa cuenta -> monto.
  private montosPorCuenta(dias: number): Map<string, number> {
    const mapa = new Map<string, number>();
    for (const t of this.ventana(dias)) {
      if (t.cuentaDestinoId == null) {
        continue;
      }
      mapa.set(t.cuentaDestinoId, (mapa.get(t.cuentaDestinoId) ?? 0) + t.monto);
    }
    return mapa;
  }

  // Ratio 0-1: monto hacia la cuenta top / total emitido en ventana.
  // Ej. 0.9 = el 90% del dinero va a una sola cuenta (AGENTS.md).
  // Sin emisiones o sin cuentas con dato devuelve 0 (nunca NaN).
  concentracionMaximaCuenta(dias: number = 30): number {
    const porCuenta = this.montosPorCuenta(dias);
    if (porCuenta.size === 0) {
      return 0;
    }
    let total = 0;
    let max = 0;
    for (const monto of porCuenta.values()) {
      total += monto;
      if (monto > max) {
        max = monto;
      }
    }
    if (total === 0) {
      return 0;
    }
    return max / total;
  }

  // Cuenta destino con más monto en la ventana (para el reporte).
  // null si no hay emisiones con cuenta. No vota en el veredicto.
  cuentaTop(dias: number = 30): string | null {
    const porCuenta = this.montosPorCuenta(dias);
    let top: string | null = null;
    let max = 0;
    for (const [cuenta, monto] of porCuenta) {
      if (monto > max) {
        max = monto;
        top = cuenta;
      }
    }
    return top;
  }

  // Nº de ciclos simples DISTINTOS (por nodos) que vuelven a la empresa
  // origen en la ventana. DFS sobre el contexto: caminos
  // empresa -> ... -> empresa de longitud 2..profundidadMax (incluye ida
  // y vuelta A->B->A; auto-loop A->A excluido; sin repetir intermedios
  // para no contar doble). Aristas paralelas (varias txs A->B) cuentan
  // como UN ciclo: importan las rutas de lavado, no cada transferencia.
  // Ventana anclada al contexto (ver ahoraContexto). Acotado a 4 saltos:
  // suficiente para pitufeo circular típico y barato.
  // Requiere contexto más allá de las propias (si solo recibe las propias,
  // únicamente vería el primer salto). 0 = sin ciclos o sin datos.
  contarCiclos(dias: number = 30, profundidadMax: number = 4): number {
    const msPorDia = 24 * 60 * 60 * 1000;
    const hastaMs = Date.parse(this.ahoraContexto()) + msPorDia;
    const desdeMs = hastaMs - dias * msPorDia;
    // Adyacencia origen -> destinos distintos (solo ventana, con ambos RFC).
    const adyacencia = new Map<string, Set<string>>();
    for (const t of this.contexto) {
      const ms = Date.parse(t.fecha.slice(0, 10));
      if (ms < desdeMs || ms >= hastaMs) {
        continue;
      }
      if (t.origenId == null || t.destinoId == null) {
        continue;
      }
      let vecinos = adyacencia.get(t.origenId);
      if (!vecinos) {
        vecinos = new Set<string>();
        adyacencia.set(t.origenId, vecinos);
      }
      vecinos.add(t.destinoId);
    }
    const origen = this.transacciones[0]?.origenId;
    if (origen == null || !adyacencia.has(origen)) {
      return 0;
    }
    // DFS con visitados para ciclos simples; cuenta cada retorno al origen
    // (longitud >= 2 porque el primer paso sale del origen).
    let ciclos = 0;
    const visitados = new Set<string>([origen]);
    const dfs = (actual: string, profundidad: number): void => {
      if (profundidad > profundidadMax) {
        return;
      }
      for (const siguiente of adyacencia.get(actual) ?? []) {
        if (siguiente === origen) {
          if (profundidad >= 1) {
            ciclos += 1;
          }
          continue;
        }
        if (visitados.has(siguiente) || profundidad >= profundidadMax) {
          continue;
        }
        visitados.add(siguiente);
        dfs(siguiente, profundidad + 1);
        visitados.delete(siguiente);
      }
    };
    dfs(origen, 0);
    return ciclos;
  }
}
