/*
 * La imagen del comprobante (P6).
 *
 * UN solo dibujo para dos lugares: el programa (el botón "Imagen para
 * WhatsApp" y la vista previa de Ajustes > Comprobante) y la página que abre
 * el QR en el teléfono del cliente (servidor/comprobante-web/, que carga este
 * mismo archivo; publicar.js lo sube a su lado). Así la imagen sale igual de
 * los dos lados.
 *
 * Recibe los datos cortos de datosDelComprobante() (servidor/comprobante.js):
 *   t tienda, n número, f fecha, i renglones, T total $, x tasa, p pagos,
 *   c color, h datos del negocio, g mensaje, cj caja, st sin tasa, ...
 * El logo va aparte (no cabe en el QR): solo lo tiene el programa.
 *
 * Se dibuja en un canvas, sin librerías: el recibo es simple.
 */
(function () {
  "use strict";
  const num = (n) => Number(n).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const USD = (n) => "$" + num(n);
  const BS = (n) => "Bs " + num(n);
  const MENSAJE = "¡Gracias por su compra!";

  function fechaDe(iso) {
    try {
      return new Date(iso).toLocaleString("es-VE", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });
    } catch (e) { return String(iso); }
  }

  function cargarImagen(src) {
    return new Promise((ok) => {
      if (!src) return ok(null);
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => ok(null);
      img.src = src;
    });
  }

  // Los renglones, del más largo al que cabe: el canvas no corta solo.
  function partir(g, texto, ancho) {
    const palabras = String(texto).split(" ");
    const lineas = [];
    let actual = "";
    for (const p of palabras) {
      const prueba = actual ? actual + " " + p : p;
      if (actual && g.measureText(prueba).width > ancho) { lineas.push(actual); actual = p; } else actual = prueba;
    }
    if (actual) lineas.push(actual);
    return lineas;
  }

  async function dibujar(c, opciones) {
    const op = opciones || {};
    const ancho = 720, m = 44, escala = 2;
    const marca = /^#[0-9a-f]{6}$/i.test(c.c || "") ? c.c : (op.color || "#2E8B6E");
    const logo = await cargarImagen(op.logo);
    const fuente = (peso, tam) => `${peso} ${tam}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

    const lineas = [];
    const pon = (t, o) => lineas.push(Object.assign({ t: String(t) }, o || {}));
    (c.i || []).forEach((it) => {
      pon(it[0], { b: 1, der: USD(it[3]) });
      pon(it[1] + " × " + USD(it[2]) + (it[4] ? " · " + it[4] : ""), { s: 1 });
    });
    if (c.m) pon("y " + c.m + " productos más", { s: 1 });
    if (c.d > 0) pon("Ahorro", { der: "−" + USD(c.d) });
    if (c.e > 0) pon("Envases", { der: USD(c.e) });
    pon("", { raya: 1 });
    pon(BS(c.T * c.x), { grande: 1 });
    pon(USD(c.T) + (c.st ? "" : " · tasa " + num(c.x) + " Bs/$"), { s: 1 });
    (c.p || []).forEach((p) => pon(p[0], { der: p[1] }));
    if (c.vu) pon("Vuelto", { der: c.vu });
    if (c.fi) pon("Fiado a", { der: c.fi });
    if (c.fa) pon("Factura " + c.fa, { s: 1 });
    (c.dv || []).forEach((d) => pon("Devuelto " + d[0], { der: "−" + USD(d[1]) }));
    if (c.a) pon("VENTA ANULADA", { b: 1 });

    // La cabecera crece con los datos del negocio (dirección, teléfono, RIF, redes).
    const datos = c.h || [];
    const sub = "Comprobante #" + c.n + " · " + fechaDe(c.f) + (c.cj ? " · " + c.cj : "");
    const medidor = document.createElement("canvas").getContext("2d");
    const xTexto = logo ? m + 96 : m;
    medidor.font = fuente(400, 20);
    const renglonesSub = partir(medidor, sub, ancho - xTexto - m);
    const renglonesDatos = [];
    datos.forEach((d) => renglonesDatos.push(...partir(medidor, d, ancho - xTexto - m)));
    const cabeza = Math.max(logo ? 136 : 0, 72 + renglonesDatos.length * 26 + renglonesSub.length * 26 + 22);
    medidor.font = fuente(700, 26);
    const renglonesPie = partir(medidor, c.g || MENSAJE, ancho - m * 2);

    const altoLinea = (l) => (l.grande ? 64 : l.raya ? 24 : l.s ? 34 : 40);
    const pie = 80 + renglonesPie.length * 32;
    const alto = cabeza + 30 + lineas.reduce((s, l) => s + altoLinea(l), 0) + pie;

    const cv = document.createElement("canvas");
    cv.width = ancho * escala; cv.height = alto * escala;
    const g = cv.getContext("2d");
    g.scale(escala, escala);
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, ancho, alto);
    g.fillStyle = marca; g.fillRect(0, 0, ancho, cabeza);

    if (logo) {
      // En un cuadro blanco: un logo oscuro sobre el color de la tienda se perdería.
      g.fillStyle = "#ffffff";
      if (g.roundRect) { g.beginPath(); g.roundRect(m, 30, 76, 76, 12); g.fill(); } else g.fillRect(m, 30, 76, 76);
      const lado = 64, r = Math.min(lado / logo.width, lado / logo.height);
      const w = logo.width * r, h = logo.height * r;
      g.drawImage(logo, m + 38 - w / 2, 68 - h / 2, w, h);
    }
    let y = 64;
    g.fillStyle = "#ffffff"; g.font = fuente(800, 34); g.fillText(c.t, xTexto, y, ancho - xTexto - m);
    g.font = fuente(400, 20);
    g.globalAlpha = 0.92;
    for (const r of renglonesDatos) { y += 26; g.fillText(r, xTexto, y); }
    g.globalAlpha = 0.8;
    for (const r of renglonesSub) { y += 26; g.fillText(r, xTexto, y); }
    g.globalAlpha = 1;

    y = cabeza + 30;
    for (const l of lineas) {
      const h = altoLinea(l);
      if (l.raya) { g.fillStyle = "#1d1d1f"; g.fillRect(m, y + 8, ancho - m * 2, 3); y += h; continue; }
      g.fillStyle = l.s ? "#6b6b70" : "#1d1d1f";
      g.font = fuente(l.grande ? 800 : l.b ? 600 : 400, l.grande ? 46 : l.s ? 21 : 25);
      g.fillText(l.t, m, y + h - 14, l.der ? ancho - m * 2 - 200 : ancho - m * 2);
      if (l.der) { g.textAlign = "right"; g.font = fuente(600, 25); g.fillText(l.der, ancho - m, y + h - 14); g.textAlign = "left"; }
      y += h;
    }
    g.strokeStyle = "#d0d0d6"; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(m, y + 20); g.lineTo(ancho - m, y + 20); g.stroke(); g.setLineDash([]);
    g.textAlign = "center"; g.fillStyle = "#1d1d1f"; g.font = fuente(700, 26);
    renglonesPie.forEach((r, k) => g.fillText(r, ancho / 2, y + 62 + k * 32));
    g.fillStyle = "#6b6b70"; g.font = fuente(400, 18);
    g.fillText("Comprobante de entrega. No es una factura fiscal.", ancho / 2, y + 62 + renglonesPie.length * 32);
    return new Promise((ok, mal) => cv.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo armar la imagen."))), "image/png"));
  }

  const raiz = typeof window === "object" ? window : globalThis;
  raiz.dibujarComprobante = dibujar;
})();
