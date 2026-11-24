# Mi Movistar – Prototipo de facturación (proyecto académico)

## 1. Contexto
Proyecto del curso Creatividad Empresarial (Design Thinking). Problema: clientes residenciales de Movistar Perú (28–50 años) no entienden su recibo ni por qué cambia el monto.
Dos soluciones, integradas en una misma sección de facturación:
1. Botón **«¿Por qué me cobran esto?»** junto a cada concepto, con explicación en lenguaje simple.
2. **Comparador mensual** (mes anterior vs actual) con etiqueta «NUEVO», diferencia y pantalla **«¿Por qué subió tu recibo?»** con gráfico.
El prototipo se usará en una prueba exploratoria con usuarios. Todos los datos son ilustrativos.

## 2. Meta de esta fase
Convertir el prototipo actual (`reference/prototipo-actual.html`, un solo HTML con React) en una **app web móvil completa, con apariencia y flujos lo más cercanos posible (~95 %) a la app Mi Movistar Perú**, con backend en Supabase y publicada en GitHub Pages.
"Parecido" significa: misma estructura de navegación, jerarquía, tipo de componentes, espaciado, tono de texto y recorridos del usuario. Se logra con diseño propio (ver reglas), no copiando archivos de la marca.

## 3. Stack
- Vite + React + TypeScript, React Router con **HashRouter** (GitHub Pages no soporta rutas del lado servidor).
- Estilos: Tailwind CSS o CSS modules; tokens en un solo archivo (colores, radios, sombras, tipografía).
- Supabase JS v2 (solo clave anon en el cliente).
- PWA básica: `manifest.webmanifest`, icono, instalable en el celular.
- Despliegue: GitHub Actions → GitHub Pages. `base` de Vite = `/<nombre-repo>/`. Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como Repository variables.
- Idioma: español de Perú. Moneda `S/ 0.00`. Fechas «15 de noviembre de 2026».

## 4. Pantallas (todas deben funcionar, sin botones decorativos)
Navegación inferior: **Inicio · Mi recibo · Comparar meses · Consumo · Perfil**.
1. **Registro / ingreso**: nombre + celular peruano (+51, 9 dígitos que empiezan en 9). Sin SMS ni contraseña. Aviso visible de prototipo académico y de para qué se usa el número.
2. **Inicio**: saludo, tarjeta de línea/servicios, resumen del recibo del mes (monto, vencimiento, estado), accesos rápidos (Ver recibo, Comparar, Consumo, Ayuda), aviso «Tu recibo subió S/ X» con enlace al comparador.
3. **Mi recibo** (resumen) → **Detalle** con una tarjeta por concepto y botón **«¿Por qué?»** que abre panel inferior (concepto, importe, explicación simple, motivo, chips para otro concepto, «Entendido»).
4. **Historial de recibos** (últimos 6 meses generados de forma determinista a partir del celular). Cada uno abre su detalle.
5. **Comparar meses**: tarjetas anterior/actual, diferencia en rojo/verde, tabla por concepto, etiqueta **NUEVO**, selector para elegir qué dos meses comparar.
6. **¿Por qué subió/bajó tu recibo?**: desglose del cambio, texto explicativo y gráfico de barras apiladas (SVG propio o librería liviana).
7. **Pagar recibo (SIMULADO)**: elegir método (tarjeta, Yape/Plin, agente) → pantalla de confirmación ficticia. **No pedir ni guardar datos de tarjeta reales**; usar campos de ejemplo bloqueados o botones "Simular pago". Al finalizar, el estado cambia a «Pagado» en la demo.
8. **Consumo**: datos, minutos y SMS del periodo (valores ilustrativos aleatorios por participante), con barras de progreso.
9. **Mis servicios / Mi plan**: detalle del plan con sus beneficios (texto ilustrativo).
10. **Ayuda**: preguntas frecuentes sobre facturación (acordeón) y un chat de ayuda **simulado** con respuestas predefinidas. Debe incluir la pregunta «¿Por qué cambió mi recibo?» enlazada al comparador.
11. **Notificaciones**: lista con avisos tipo «Tu recibo de octubre ya está disponible», «Vence en 3 días».
12. **Perfil**: nombre, celular, cerrar sesión, enlace «Acerca de este prototipo».
13. **Cuestionario final de la prueba** (opcional pero recomendado): 4–5 preguntas (¿entendiste por qué subió?, escala de facilidad 1–5, comentario). Se guarda en `survey_responses`.
14. **Panel del investigador** (`#/admin`): login con Supabase Auth (email), tabla de participantes, eventos, métricas (tiempo hasta llegar a «¿Por qué subió?», cantidad de «¿Por qué?» abiertos), exportar CSV.

## 5. Recibo aleatorio por persona
Portar `buildBill(phone)` del prototipo: PRNG sembrado con el celular → mismo celular = mismo recibo; celulares distintos = recibos distintos.
- Plan mensual 39.90–99.90, 1–3 cargos extra de un catálogo (paquete de datos, cargo proporcional, llamadas internacionales/roaming, decodificador adicional, servicios de terceros), a veces un cargo que ya existía el mes anterior con monto menor.
- Ampliar para 6 meses de historial y para el consumo.
- Al registrarse, guardar el recibo en Supabase llamando a la función `register_participant` (ver `supabase/schema.sql`).
- Catálogo de explicaciones en un archivo `concepts.ts` con texto simple, sin tecnicismos.

## 6. Analítica de la prueba
Registrar con la función `log_event` (id de participante, id de sesión, evento, pantalla, props JSON):
`register`, `screen_view`, `why_open` (concepto), `why_switch_concept`, `why_close`, `compare_open`, `compare_change_months`, `why_up_open`, `pay_start`, `pay_done`, `faq_open`, `chat_message`, `survey_submit`, `logout`.
Nunca bloquear la UI si falla el registro del evento.

## 7. Supabase
- Ejecutar `supabase/schema.sql` (tablas, RLS, funciones, vista de resumen).
- Los clientes anónimos **no leen tablas directamente**: solo llaman a las funciones `register_participant` y `log_event`.
- Solo usuarios en `admin_users` (Supabase Auth) pueden leer datos. Crear el usuario admin con el correo que indique el dueño y agregarlo a `admin_users`.
- Nunca poner la `service_role` key en el repositorio ni en el cliente.

## 8. Diseño (fidelidad ~95 %)
- Azul Movistar `#019DF4`, azul oscuro `#0B2739`, verde `#5CB615`, fondo gris claro, tarjetas blancas con radios 14–18 px, tipografía sans moderna (por ejemplo Plus Jakarta Sans), iconos de línea simples.
- Estructura y patrones de la app real: cabecera azul con saludo, tarjetas de resumen, bottom sheets, chips, barra inferior de 5 pestañas, estados vacíos y de carga, microcopy en español peruano.
- Modo oscuro y reducción de movimiento respetados, foco visible, contraste AA, tamaños táctiles ≥ 44 px.
- Pantalla completa en móvil; marco de teléfono solo en escritorio.
- Antes de dar por terminado, revisar capturas de cada pantalla en 360 px y 414 px de ancho.

## 9. Reglas de seguridad y ética (obligatorias)
- Es un **prototipo académico**, no la app oficial. Debe verse claramente: aviso en el registro, en «Acerca de» y en el pie del Inicio, y `<title>` con «(prototipo)». No hacerlo pasar por la app real.
- No usar logotipos, íconos ni imágenes oficiales descargados de Movistar. Usar un wordmark y recursos propios. Si el dueño tiene autorización de Movistar para usar la marca, la pone él.
- No pedir contraseñas, DNI, datos de tarjetas ni códigos reales. No enviar SMS ni correos a los participantes.
- Solo se guardan nombre, celular y eventos de uso. Aviso claro de finalidad. Incluir en el panel admin un botón para **borrar todos los datos** de los participantes y documentar en el README que deben borrarse al terminar el curso.
- No dominios que imiten a Movistar (usar el de github.io o uno claramente académico).
- Validar entradas en cliente y en base de datos; sin `dangerouslySetInnerHTML`.

## 10. Entregables
- Repositorio con README (cómo correr, desplegar, variables, cómo crear el admin, cómo exportar datos, cómo borrar datos).
- URL publicada en GitHub Pages.
- Script/SQL aplicado en Supabase y verificado.
- Checklist final (marcar cada ítem tras probarlo de verdad):
  - [ ] Registro con celular válido/inválido
  - [ ] Dos celulares distintos ven recibos distintos; el mismo celular ve el mismo
  - [ ] Cada «¿Por qué?» muestra su explicación; chips cambian de concepto
  - [ ] Comparador, NUEVO, diferencia, y gráfico coinciden con los datos del recibo
  - [ ] Historial, Consumo, Pagar (simulado), Ayuda/chat, Notificaciones, Perfil funcionan
  - [ ] Los eventos llegan a Supabase; panel admin lista participantes y exporta CSV
  - [ ] Un cliente anónimo NO puede leer tablas (probar con la clave anon)
  - [ ] Funciona en celular real (iOS/Android) vía el enlace de GitHub Pages
