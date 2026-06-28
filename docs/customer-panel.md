# Panel Cliente

El Panel Cliente consume la API real para QR, progreso, recompensas, historial y perfil. El registro admite correo opcional y permite iniciar sesión con correo o teléfono.

Cuando el registro se abre desde el QR de un comercio, la URL incluye `business=<slug>` y el backend crea la asociación con ese comercio. El QR personal del cliente dura cinco minutos y se valida nuevamente en la API antes de mostrar su ficha al cajero.

El flujo principal no utiliza mocks.
