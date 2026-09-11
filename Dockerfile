# S1-Control v2 — die Web-Schale als Container (ADR-005).
#
# Zwei Stufen: Die erste baut aus dem Quellbaum, die zweite enthaelt nur Node
# und die drei gebuendelten Teile (web.mjs, akte-worker.mjs, renderer/). Kein
# node_modules im Laufbild — esbuild hat alles eingebuendelt, was die Schale
# braucht, und Electron braucht sie nicht.
#
# Bauen und starten: siehe docker-compose.yml und README-v2.md, Abschnitt
# „Web-Schale und Docker". Der Bau braucht die ausgecheckten Submodule unter
# vendor/ (git submodule update --init --recursive), weil der Kontext eine
# Kopie des Arbeitsbaums ist, kein Klon.

# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS bau

WORKDIR /quelle
# Electron ist devDependency und wuerde beim `npm ci` sein Binaerpaket laden —
# im Container nutzlos und gross.
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1

COPY package.json package-lock.json .npmrc tsconfig.json tsconfig.base.json ./
COPY bau ./bau
COPY vendor ./vendor
COPY packages ./packages
COPY apps ./apps
COPY eslint.config.mjs vitest.config.ts ./

# `npm ci` baut ueber `postinstall` die Kernpakete unter vendor/ (bau/kern-bauen.mjs).
RUN npm ci
# Derselbe Bau wie `npm run build`, nur ohne `kern:bauen` (schon geschehen).
RUN npm run typecheck && npm run build:renderer && npm run build:schale

# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim

ARG S1_APP_VERSION=0.0.0
ENV NODE_ENV=production \
    S1_APP_VERSION=${S1_APP_VERSION} \
    S1_WEB_HOST=0.0.0.0 \
    S1_WEB_PORT=8080 \
    S1_SHARE=/share \
    S1_DATEN=/daten

WORKDIR /app
COPY --from=bau /quelle/apps/desktop/out/web.mjs /quelle/apps/desktop/out/akte-worker.mjs ./
COPY --from=bau /quelle/apps/desktop/out/renderer ./renderer

# /share ist der Einhaengepunkt des NAS-Shares, /daten haelt Profile, Spiegel
# und Protokoll der Web-Arbeitsplaetze (local-first, §5.1). Beides liegt
# ausserhalb des Bildes; /daten als Volume, damit die Client-Kennungen und die
# Upload-Staende einen Neustart ueberleben.
RUN mkdir -p /share /daten && chown node:node /daten
USER node
VOLUME ["/daten"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.S1_WEB_PORT+'/gesundheit').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "web.mjs"]
