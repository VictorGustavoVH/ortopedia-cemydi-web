# Política de Seguridad

## Revisión de Dependencias

Este proyecto implementa escaneo automático de vulnerabilidades en las dependencias para mantener la seguridad del código.

### Escaneo Automático

El proyecto utiliza **npm audit** para escanear vulnerabilidades en las dependencias. El escaneo se ejecuta automáticamente:

- **En CI/CD**: Cada push y pull request (GitHub Actions)
- **Semanalmente**: Cada lunes a las 2 AM UTC
- **Manualmente**: Puede ejecutarse en cualquier momento

### Comandos Disponibles

#### Backend

```bash
# Escanear vulnerabilidades
npm run audit

# Escanear solo dependencias de producción
npm run audit:production

# Escanear con nivel de severidad moderado o superior
npm run security:check

# Intentar corregir vulnerabilidades automáticamente
npm run audit:fix

# Forzar corrección (usar con precaución)
npm run security:fix
```

#### Frontend

```bash
# Escanear vulnerabilidades
npm run audit

# Escanear solo dependencias de producción
npm run audit:production

# Escanear con nivel de severidad moderado o superior
npm run security:check

# Intentar corregir vulnerabilidades automáticamente
npm run audit:fix

# Forzar corrección (usar con precaución)
npm run security:fix
```

### Workflow de GitHub Actions

El workflow `.github/workflows/security-audit.yml` ejecuta automáticamente:

1. **Escaneo de Backend**: Analiza todas las dependencias del backend
2. **Escaneo de Frontend**: Analiza todas las dependencias del frontend
3. **Generación de Reportes**: Crea reportes JSON con los resultados
4. **Artifacts**: Guarda los reportes por 30 días para revisión

### Niveles de Severidad

- **Low**: Vulnerabilidades de baja severidad
- **Moderate**: Vulnerabilidades moderadas (incluidas en el escaneo)
- **High**: Vulnerabilidades altas
- **Critical**: Vulnerabilidades críticas

### Proceso de Corrección

1. **Identificar**: El escaneo identifica vulnerabilidades
2. **Evaluar**: Revisar el impacto de cada vulnerabilidad
3. **Corregir**: Actualizar dependencias vulnerables
4. **Verificar**: Ejecutar `npm audit` nuevamente para confirmar

### Reportes

Los reportes de seguridad se generan automáticamente en:
- **CI/CD**: Artifacts de GitHub Actions
- **Local**: Ejecutar `npm audit --json > audit-report.json`

### Recursos Adicionales

- [npm audit documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)
- [Snyk](https://snyk.io/)

