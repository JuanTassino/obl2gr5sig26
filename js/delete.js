
async function borrarPropios(layer, where) {
  if (!where || !where.trim()) {
    throw new Error("Condición de borrado vacía: no se borra nada.");
  }
  const ids = await layer.queryObjectIds({ where });
  if (ids.length === 0) return 0;

  const resultado = await layer.applyEdits({
    deleteFeatures: ids.map((objectId) => ({ objectId })),
  });
  const errores = resultado.deleteFeatureResults.filter((r) => r.error);
  if (errores.length > 0) {
    throw new Error(errores.map((r) => r.error.message).join("; "));
  }
  return ids.length;
}

export { borrarPropios };