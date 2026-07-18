#!/usr/bin/env bash
#
# Smoke do app Pro (assinante) — páginas + APIs públicas/protegidas.
#
# Uso:
#   npm run verify:pro -- https://seu-preview.vercel.app
#   bash scripts/pro-smoke.sh https://gabriel-vitrini.vercel.app
#
# Opcional (fluxo register→connect em ambientes que permitem mock):
#   PRO_SMOKE_FULL=1 bash scripts/pro-smoke.sh http://localhost:3000
#
set -euo pipefail

BASE="${1:-https://gabriel-vitrini.vercel.app}"
BASE="${BASE%/}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILURES=0
pass() { echo -e "  ${GREEN}✅${NC} $1"; }
fail() { echo -e "  ${RED}❌${NC} $1"; FAILURES=$((FAILURES + 1)); }
warn() { echo -e "  ${YELLOW}⚠️${NC}  $1"; }

echo "Pro smoke · $BASE"
echo "Data: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

login_code="$(curl -sS -o /tmp/pro-login.html -w "%{http_code}" "${BASE}/pro/login" || echo "000")"
if [[ "$login_code" == "200" ]]; then
  pass "GET /pro/login → 200"
else
  fail "GET /pro/login → ${login_code} (esperado 200 — branch Pro ainda não deployado?)"
fi

conectar_code="$(curl -sS -o /dev/null -w "%{http_code}" "${BASE}/pro/conectar" || echo "000")"
if [[ "$conectar_code" == "200" || "$conectar_code" == "307" || "$conectar_code" == "302" ]]; then
  pass "GET /pro/conectar → ${conectar_code}"
else
  fail "GET /pro/conectar → ${conectar_code}"
fi

onboarding_code="$(curl -sS -o /tmp/pro-onboarding.json -w "%{http_code}" "${BASE}/api/me/onboarding" || echo "000")"
if [[ "$onboarding_code" == "401" || "$onboarding_code" == "403" ]]; then
  pass "GET /api/me/onboarding sem sessão → ${onboarding_code}"
else
  fail "GET /api/me/onboarding sem sessão → ${onboarding_code} (esperado 401/403)"
fi

portal_code="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/me/billing/portal" || echo "000")"
if [[ "$portal_code" == "401" || "$portal_code" == "403" || "$portal_code" == "503" ]]; then
  pass "POST /api/me/billing/portal sem sessão → ${portal_code}"
else
  fail "POST /api/me/billing/portal → ${portal_code} (esperado 401/403/503)"
fi

# ROM continua no ar
rom_login="$(curl -sS -o /dev/null -w "%{http_code}" "${BASE}/login" || echo "000")"
if [[ "$rom_login" == "200" ]]; then
  pass "GET /login (ROM) → 200 — painel intacto"
else
  fail "GET /login (ROM) → ${rom_login}"
fi

if [[ "${PRO_SMOKE_FULL:-}" == "1" ]]; then
  echo ""
  echo "## Fluxo autenticado (PRO_SMOKE_FULL=1)"
  email="pro-smoke-$(date +%s)@example.com"
  reg_code="$(curl -sS -o /tmp/pro-reg.json -D /tmp/pro-reg.hdr -w "%{http_code}" \
    -X POST "${BASE}/api/pro/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"display_name\":\"Dani Mariniello\",\"email\":\"${email}\",\"password\":\"teste123\"}" \
    || echo "000")"

  if [[ "$reg_code" != "200" ]]; then
    fail "POST /api/pro/auth/register → ${reg_code}"
    cat /tmp/pro-reg.json 2>/dev/null | head -c 300; echo
  else
    pass "POST /api/pro/auth/register → 200"
    cookie="$(awk 'BEGIN{IGNORECASE=1} /^set-cookie:/{print $2; exit}' /tmp/pro-reg.hdr | tr -d '\r')"
    cookie="${cookie%%;*}"
    if [[ -z "$cookie" ]]; then
      fail "Cookie vitrini_pro_session ausente"
    else
      pass "Cookie de sessão Pro presente"

      onb="$(curl -sS -o /tmp/pro-onb2.json -w "%{http_code}" \
        -H "Cookie: ${cookie}" "${BASE}/api/me/onboarding" || echo "000")"
      if [[ "$onb" == "200" ]]; then
        ready="$(node -e "const j=require('/tmp/pro-onb2.json'); process.exit(j?.data?.ready_for_day===false?0:1)" && echo no || echo yes)"
        if [[ "$ready" == "no" ]]; then
          pass "Onboarding: ready_for_day=false antes do connect"
        else
          warn "Onboarding já ready_for_day (conta reutilizada?)"
        fi
      else
        fail "GET /api/me/onboarding autenticado → ${onb}"
      fi

      conn="$(curl -sS -o /tmp/pro-conn.json -w "%{http_code}" \
        -X POST "${BASE}/api/me/connect" \
        -H "Cookie: ${cookie}" \
        -H 'Content-Type: application/json' \
        -d '{"provider":"avec","display_name":"Dani Mariniello","api_token":"mock","unit_external_id":null}' \
        || echo "000")"
      if [[ "$conn" == "200" ]]; then
        pass "POST /api/me/connect (mock) → 200"
      else
        fail "POST /api/me/connect → ${conn} (mock só em non-prod / AVEC_MOCK)"
        cat /tmp/pro-conn.json 2>/dev/null | head -c 300; echo
      fi
    fi
  fi
else
  warn "PRO_SMOKE_FULL não definido — pulando register/connect (use em preview/dev)"
fi

echo ""
if [[ "$FAILURES" -eq 0 ]]; then
  echo -e "${GREEN}✅ Pro smoke OK${NC}"
  exit 0
else
  echo -e "${RED}❌ ${FAILURES} falha(s) Pro — ver deploy/SETUP-PRO.md${NC}"
  exit 1
fi
