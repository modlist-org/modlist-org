#!/usr/bin/env bash
# Build and deploy modlist.org to Cloudflare Workers.
#   ./deploy.sh            build -> apply pending D1 migrations -> deploy -> smoke test
#   ./deploy.sh --dry-run  build and validate the bundle without deploying

set -Eeuo pipefail

readonly PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly D1_DATABASE="modlist"
readonly SITE_URL="https://modlist.org"

cd "${PROJECT_DIR}"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

if command -v bun >/dev/null 2>&1; then
  RUN=(bun x)
else
  RUN=(npx --no-install)
fi

step() { printf '\n\033[1;35m[%s]\033[0m %s\n' "$1" "$2"; }

if ! "${RUN[@]}" wrangler whoami 2>/dev/null | grep -q "You are logged in"; then
  echo "Error: not logged in to Cloudflare. Run: ${RUN[*]} wrangler login" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  echo "Warning: working tree has uncommitted changes; they will be deployed." >&2
fi

step 1/4 "Build"
"${RUN[@]}" nuxi build

if [[ "${DRY_RUN}" == true ]]; then
  step 2/4 "Validate bundle (dry run)"
  "${RUN[@]}" wrangler deploy --dry-run
  echo "Dry run complete. Nothing was deployed."
  exit 0
fi

step 2/4 "Apply D1 migrations"
"${RUN[@]}" wrangler d1 migrations apply "${D1_DATABASE}" --remote

step 3/4 "Deploy Worker"
"${RUN[@]}" wrangler deploy

step 4/4 "Smoke test"
# Include a server-rendered mod page: SSR-only failures don't show up in API checks
first_slug="$(curl -s "${SITE_URL}/api/mods?limit=1" | sed -n 's/.*"slug": *"\([^"]*\)".*/\1/p' | head -n 1)"
for path in "/" "/api/mods?limit=1" ${first_slug:+"/mods/${first_slug}"}; do
  status="$(curl -s -o /dev/null -w '%{http_code}' "${SITE_URL}${path}")"
  if [[ "${status}" != "200" ]]; then
    echo "Error: ${SITE_URL}${path} returned ${status}. Roll back with: ${RUN[*]} wrangler rollback" >&2
    exit 1
  fi
  echo "  ${path} -> ${status}"
done

echo "Deployment complete: ${SITE_URL}"
