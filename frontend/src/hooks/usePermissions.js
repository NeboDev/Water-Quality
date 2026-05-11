/**
 * Hook centralizado de permisos.
 * Devuelve un objeto "can" con booleanos según el rol del usuario.
 * Toda la lógica de permisos vive aquí — no comparar strings de rol en componentes.
 */
export function usePermissions(rol) {
  const is = {
    admin:       rol === "admin",
    icuap:       rol === "icuap",
    operador:    rol === "operador",
    visualizador: rol === "visualizador",
  };

  return {
    // ── Nodos ─────────────────────────────────────────
    canManageNodes:    is.admin,                                   // Crear / editar / eliminar nodos
    canEditThresholds: is.admin,                                   // Modificar umbrales NOM-127
    canManageUsers:    is.admin,                                   // Crear usuarios con cualquier rol

    // ── Mapa ──────────────────────────────────────────
    canEditMap:        is.admin,                                   // Arrastrar marcadores en el mapa

    // ── Muestras físicas ──────────────────────────────
    canRecordSamples:  is.admin || is.icuap,                      // Registrar muestra (POST /muestras)
    canAnnotateSample: is.admin || is.icuap,                      // Añadir nota (PUT /muestras/:id/nota)

    // ── Alertas ───────────────────────────────────────
    canResolveAlerts:  is.admin || is.icuap || is.operador,       // Resolver alerta (PUT /alertas/:id/resolver)

    // ── Lectura (todos los roles autenticados) ─────────
    canViewData:       true,

    // Rol raw por si un componente lo necesita
    rol,
    roleLabel: {
      admin:       "Administrador",
      icuap:       "ICUAP",
      operador:    "Operador",
      visualizador: "Visualizador",
    }[rol] ?? rol,
  };
}
