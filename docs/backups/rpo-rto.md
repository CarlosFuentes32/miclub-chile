# RPO y RTO

RPO objetivo inicial con backup diario: máximo 24 horas.

RTO se mide durante cada restore drill desde:

- inicio de descarga;
- validación;
- descifrado;
- `pg_restore`;
- conteos e integridad.

No se deben inventar tiempos. Cada ejercicio debe registrar duración real.

