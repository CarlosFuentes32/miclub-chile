# Gestión de sesiones

Las sesiones guardan hash de refresh token, familia, expiración, revocación, último uso, user-agent sanitizado, IP hasheada y detección de reuse. El refresh rota sesión. Si un refresh revocado se reutiliza, se revocan sesiones activas del usuario y se audita `refresh_token_reuse_detected`.
