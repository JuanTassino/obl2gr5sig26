import { pdf_url } from "./const.js";

const [print, PrintTemplate, PrintParameters] = await $arcgis.import([
  "@arcgis/core/rest/print.js",
  "@arcgis/core/rest/support/PrintTemplate.js",
  "@arcgis/core/rest/support/PrintParameters.js",
]);


export async function exportarPDF(view, titulo) {
  const parametros = (layout) => new PrintParameters({
    view,
    template: new PrintTemplate({ format: "pdf", layout, layoutOptions: { titleText: titulo } }),
  });
  try {
    return (await print.execute(pdf_url, parametros("a4-landscape"))).url;
  } catch (e) {
    console.warn("Falló a4-landscape, se prueba map-only:", e);
    return (await print.execute(pdf_url, parametros("map-only"))).url;
  }
}