UPDATE "users"
SET "role" = 'SUPER_ADMIN'
WHERE "email" IN ('administrador@miclubchile.cl', 'prueba.admin@miclubchile.cl')
  AND "role" = 'MICLUB_ADMIN';
