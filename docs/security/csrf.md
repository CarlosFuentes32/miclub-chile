# CSRF

La API usa refresh token en cookie HttpOnly. Para métodos POST/PATCH/PUT/DELETE se valida Origin/Referer contra `CORS_ORIGIN`. SameSite se mantiene `lax` en no-producción y `none; secure` en producción cuando corresponde a dominios separados HTTPS.
