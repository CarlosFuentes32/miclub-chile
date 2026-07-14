# Versionado y metadatos de build

MiClub Chile expone metadatos de versión y despliegue desde el health enterprise.

## Campos expuestos

- `version.version`: versión de la aplicación.
- `version.commit`: commit desplegado.
- `version.branch`: rama desplegada.
- `version.buildNumber`: número o ID de build.
- `version.buildTime`: fecha/hora de compilación.
- `version.generatedAt`: fecha/hora en que se generó la respuesta.
- `deployment.provider`: Railway, Vercel, GitHub Actions o Local/Unknown.
- `deployment.repository`: repositorio detectado.
- `deployment.environment`: ambiente actual.
- `deployment.deploymentId`: ID de deploy si el proveedor lo informa.

## Variables usadas

El sistema detecta automáticamente, cuando existen:

- `APP_VERSION`.
- `BUILD_NUMBER`.
- `BUILD_TIME` o `BUILD_DATE`.
- `RAILWAY_GIT_COMMIT_SHA`.
- `RAILWAY_GIT_BRANCH`.
- `RAILWAY_GIT_REPO_NAME`.
- `RAILWAY_DEPLOYMENT_ID`.
- `VERCEL_GIT_COMMIT_SHA`.
- `VERCEL_GIT_COMMIT_REF`.
- `VERCEL_GIT_REPO_SLUG`.
- `GITHUB_SHA`.
- `GITHUB_REF_NAME`.
- `GITHUB_RUN_NUMBER`.

Si no encuentra variables de proveedor, usa valores `unknown` para no inventar información.

## Cómo validar

```bash
npm run test:enterprise-health
npm run build
```

También se puede validar manualmente:

```bash
curl https://miclub-chile-staging.up.railway.app/api/health | jq .version
```

## Recomendación operativa

En staging y producción conviene configurar:

- `APP_VERSION`.
- `BUILD_TIME`.
- `LAST_PLAYWRIGHT_STATUS`.
- `LAST_PLAYWRIGHT_RUN_ID`.
- `LAST_PLAYWRIGHT_RUN_URL`.
- `LAST_PLAYWRIGHT_RUN_AT`.

Esto permite que el panel Super Admin muestre trazabilidad completa de versión y QA.
