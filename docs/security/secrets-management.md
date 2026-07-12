# Gestión de secretos

No versionar `.env` reales, tokens, DATABASE_URL, JWT_SECRET, RESEND_API_KEY ni webhook secrets. Si se detecta secreto: no imprimirlo, clasificar riesgo, recomendar rotación y preparar limpieza de historial con autorización.
