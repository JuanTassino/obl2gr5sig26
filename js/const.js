const eventos_url = "https://sampleserver5.arcgisonline.com/arcgis/rest/services/LocalGovernment/Events/FeatureServer/0";
const trails_url = "https://sampleserver5.arcgisonline.com/arcgis/rest/services/LocalGovernment/Recreation/FeatureServer/1";
const geometry_url = "https://tasks.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer";
const county_url = "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Census_Counties/FeatureServer/0";
const pdf_url = "https://sampleserver5.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task";


const event_id = 52026 //grupo 5 año 2026;
const ruta_prefix = "grupo5_2026";
const radio_km = 40;
const max_lecturas = 80;

const campos = { nombre: "NAME", estado: "STATE_NAME", poblacion: "POPULATION" };

const eventos_type = [["0","Festival de arte"],["1","Feria de productores"],["2","Noche de cine"],["3","Feria"],["4","Desfile"],["5","Otro"]];

const colores_type = {
  0: { nombre: "Festival de arte", color: "#e07b39" },
  1: { nombre: "Feria de productores", color: "#4caf50" },
  2: { nombre: "Noche de cine", color: "#7e57c2" },
  3: { nombre: "Feria", color: "#e91e63" },
  4: { nombre: "Desfile", color: "#1e88e5" },
  5: { nombre: "Otro", color: "#78909c" },
};

export { eventos_url, trails_url , event_id, ruta_prefix, geometry_url, county_url, campos, radio_km, pdf_url, eventos_type, max_lecturas, colores_type };