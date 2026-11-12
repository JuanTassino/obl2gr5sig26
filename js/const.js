const eventos_url = "https://sampleserver5.arcgisonline.com/arcgis/rest/services/LocalGovernment/Events/FeatureServer/0";
const trails_url = "https://sampleserver5.arcgisonline.com/arcgis/rest/services/LocalGovernment/Recreation/FeatureServer/1";
const geometry_url = "https://tasks.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer";
const county_url = "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Census_Counties/FeatureServer/0";

const event_id = 52026 //grupo 5 año 2026;
const ruta_prefix = "grupo5_2026";
const radio_km = 40;

const campos = { nombre: "NAME", estado: "STATE_NAME", poblacion: "POPULATION" };

export { eventos_url, trails_url , event_id, ruta_prefix, geometry_url, county_url, campos, radio_km };