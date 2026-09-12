Algoritmo de auditoria de fraudes. 


El algoritmo sera un sistema de tres capas. 

En la primera capa sera la deteccion de transacciones desde la base de datos de los enpoints. 
En la capa1 tendra los siguiente: 
1. Volumen y Frecuencia. 
- Num de transacciones por dia/semana/mes
- MOnto total movido por periodo
- ticket promedio por transaccion
-DESVIACION ESTANDAR DEL MONTO

2. Velocidad
-Transacciones en ventada cortas de tiempo
- Cambio PORCENTUAL de volumen mes contra mes (explicacion de crecimiento repentino)

3. Patrones de estructuracion
- Transacciones debajo de umbrales regulatorios 
- Multiples transacciones pequeñas que sumadas es una grande

4. Geografia 
- Discrepancia entre ubicacion registrada y ubicacion de transacciones
- Transacciones internacionales a paises de alto riesgos o paises que no tienen una regulacion formal

5. Contrapartes
- Concetracion de transacciones a donde va el dinero ?? el 90% va a una sola cuenta 
- Transaciones circulares

6. Choerenncia de negocio y transacciones
-Volumen transaccional vs tamaño declarado del negocio o el tipo de negocio
- Tipo de transacciones vs giro de negocio un gym con transacciones internacionales
- Horario de transacciones vs horario tipico de operacion de giro


El modelo las transacciones es el siguiente: 
Transacciones: 
- ID transaccion
- ID empresa
- Fecha y hora
- Monto
- Tipo de transaccion (tranferencia, pago de nomina)
- Canal (sucursal, online)
- Ubicacion
- cuenta destino
- Moneda
- Estado(aceptada o rechazada pendiente)
- RFC 


Buenas practicas todod debe estar documentado en comentarios con la explicacion y hacer buenas practicas de programacion cual quier cambio tienes que preguntar.
