# Plan formal de promoción a producción

Este plan no autoriza ni ejecuta producción. Requiere la frase explícita: `AUTORIZO PROMOCIÓN A PRODUCCIÓN`.

## Ventana propuesta

- Duración estimada: 90 a 150 minutos.
- Horario recomendado: baja actividad comercial.
- Participantes: responsable técnico, dueño del producto, contacto de soporte y contacto comercial.

## Pasos

1. Freeze temporal de cambios.
2. Confirmar commit candidato `606a5bd86880f23ebfb103e2dc818b86071b5bba`.
3. Confirmar GitHub Actions verdes en staging.
4. Confirmar Resend staging con envío QA real.
5. Confirmar `MONITORING_TOKEN` funcional.
6. Confirmar DNS/URLs staging funcionales.
7. Crear backup productivo gestionado.
8. Registrar snapshot/backup ID, hora, tamaño y retención.
9. Restaurar backup en base temporal.
10. Comparar conteos básicos.
11. Revisar SQL de migraciones pendientes.
12. Confirmar ausencia de sentencias destructivas no autorizadas.
13. Preparar snapshot de nombres de variables productivas, sin valores.
14. Promover código API.
15. Ejecutar migraciones productivas solo después de autorización.
16. Desplegar frontends.
17. Validar `/api/health/live`, `/api/health/ready`, `/api/health`.
18. Ejecutar smoke tests productivos no destructivos.
19. Validar login QA productivo autorizado.
20. Revisar logs, auditoría y errores 5xx.
21. Decisión Go/No Go.
22. Mantener monitoreo reforzado 24 horas.

## Criterios rollback

- Readiness falla.
- DB no responde.
- Migración queda incompleta.
- Login general falla.
- Roles/rutas protegidas fallan.
- Flujos de cajero/canje no cargan.
- Errores 5xx críticos.
- Health obligatorio en error.

## Comunicación

Antes: aviso interno de ventana.

Durante: canal único de coordinación.

Después: resumen de estado, commit desplegado y próximos pasos.
