#!/usr/bin/env bash
# S1-Control v2 — Web-Schale auf einem Plesk-Server einrichten oder
# aktualisieren (ADR-006, docker-compose.plesk.yml).
#
# Aufruf auf dem Server als root:
#
#   bash deploy/plesk/deploy.sh                 # aus einem Checkout heraus
#   S1_ZWEIG=v2-architektur bash deploy.sh      # anderer Zweig
#
# Was das Skript tut, in dieser Reihenfolge:
#   1. Quelle nach $S1_ZIEL holen oder aktualisieren (git, Submodule).
#   2. .env anlegen, falls sie fehlt — und dann anhalten, bis sie ausgefuellt ist.
#   3. Bild bauen und Dienst starten (docker compose -f docker-compose.plesk.yml).
#   4. /gesundheit auf dem Loopback pruefen und das Protokoll zeigen.
#
# Was es NICHT tut: die Domain in Plesk anlegen, das Zertifikat holen, die
# nginx-Direktiven eintragen. Das sind drei Klicks in Plesk, siehe
# docs/v2/BETRIEB.md, „Plesk-Server“.
set -euo pipefail

S1_ZIEL="${S1_ZIEL:-/opt/s1-control}"
S1_QUELLE="${S1_QUELLE:-https://github.com/wattnpapa/S1-Control.git}"
S1_ZWEIG="${S1_ZWEIG:-v2-architektur}"
COMPOSE="docker compose -f docker-compose.plesk.yml"

fehlt() { echo "FEHLT: $1" >&2; exit 1; }
command -v git >/dev/null || fehlt "git"
command -v docker >/dev/null || fehlt "docker (Plesk: Erweiterung „Docker“ oder docker-ce installieren)"
docker compose version >/dev/null 2>&1 || fehlt "docker compose (Plugin v2)"

# 1. Quelle
if [ -d "$S1_ZIEL/.git" ]; then
  echo "Aktualisiere $S1_ZIEL ($S1_ZWEIG)"
  git -C "$S1_ZIEL" fetch --prune origin
  git -C "$S1_ZIEL" checkout -q "$S1_ZWEIG"
  git -C "$S1_ZIEL" pull --ff-only origin "$S1_ZWEIG"
else
  echo "Hole $S1_QUELLE ($S1_ZWEIG) nach $S1_ZIEL"
  git clone --branch "$S1_ZWEIG" "$S1_QUELLE" "$S1_ZIEL"
fi
git -C "$S1_ZIEL" submodule update --init --recursive
cd "$S1_ZIEL"

# 2. Zugangsdaten
if [ ! -f .env ]; then
  cp .env.beispiel .env
  chmod 600 .env
  echo
  echo "Neu angelegt: $S1_ZIEL/.env"
  echo "Bitte S1_WEB_ANMELDENAME und S1_WEB_PASSWORT (mindestens 12 Zeichen) eintragen"
  echo "und das Skript erneut starten."
  exit 2
fi
chmod 600 .env
# shellcheck disable=SC1091
set -a; . ./.env; set +a
[ -n "${S1_WEB_PASSWORT:-}" ] || fehlt "S1_WEB_PASSWORT in .env"
[ "${#S1_WEB_PASSWORT}" -ge 12 ] || fehlt "S1_WEB_PASSWORT hat weniger als 12 Zeichen"
PORT="${S1_PLESK_PORT:-8085}"

# 3. Bauen und starten
echo "Baue und starte den Dienst (Port 127.0.0.1:$PORT)"
$COMPOSE up -d --build --remove-orphans

# 4. Pruefen
echo -n "Warte auf /gesundheit "
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/gesundheit" >/dev/null 2>&1; then echo "— ok"; break; fi
  echo -n "."; sleep 2
done
curl -fsS "http://127.0.0.1:$PORT/gesundheit" >/dev/null || { echo; $COMPOSE logs --tail 50 s1-web; fehlt "Dienst antwortet nicht"; }
$COMPOSE logs --tail 5 s1-web | grep -E "Zugang|lauscht" || true
echo
echo "Fertig. Jetzt in Plesk (einmalig):"
echo "  1. Domain anlegen, SSL It! → Let's Encrypt, Umleitung http → https."
echo "  2. Apache & nginx Settings → Additional nginx directives:"
echo "     Inhalt von $S1_ZIEL/deploy/plesk/nginx-direktiven.conf (Port $PORT)."
echo "  3. https://<Domain> öffnen und anmelden."
