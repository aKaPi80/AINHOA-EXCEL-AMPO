# Consulta de aprietes

Prueba local basada en `C:\Users\alvar\Desktop\esparrago-aprieteak_v3.xlsm`.

La app carga `data/torque-data.json`, generado desde la hoja `Pares`, y permite consultar por:

- Tamaño
- Material
- Xylan sí/no

Nota: en el Excel recibido no hay columnas ni textos identificables para Xylan. El selector está preparado, pero los valores actuales son los mismos datos disponibles en la tabla del Excel. Cuando el Excel definitivo esté en Drive, habrá que exponerlo como una fuente legible por la app o regenerar este JSON desde ese archivo.

## Ejecutar

```powershell
node dev-server.cjs
```

Abrir `http://127.0.0.1:4173`.
