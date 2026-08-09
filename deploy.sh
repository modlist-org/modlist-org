#!/usr/bin/env bash

set -Eeuo pipefail

readonly DEPLOY_HOST="oci"
readonly REMOTE_PROJECT_DIR="modlist-org"
readonly PM2_APP_NAME="modlist-org"
readonly PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly LOCAL_OUTPUT_DIR="${PROJECT_DIR}/.output"

for command_name in ssh sftp; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Error: ${command_name} command not found." >&2
    exit 1
  fi
done

if [[ ! -d "${LOCAL_OUTPUT_DIR}" ]]; then
  echo "Error: ${LOCAL_OUTPUT_DIR} not found. Run npm run build first." >&2
  exit 1
fi

if [[ ! -f "${LOCAL_OUTPUT_DIR}/server/index.mjs" ]]; then
  echo "Error: .output/server/index.mjs not found. Check Nuxt build output." >&2
  exit 1
fi

echo "[1/3] Remove remote .output"
ssh "${DEPLOY_HOST}" \
  'set -e; cd "$HOME/modlist-org"; rm -rf -- .output'

echo "[2/3] Upload local .output via SFTP"
sftp -b - "${DEPLOY_HOST}" <<SFTP_COMMANDS
lcd "${PROJECT_DIR}"
cd "${REMOTE_PROJECT_DIR}"
put -r .output
SFTP_COMMANDS

echo "[3/3] Restart PM2 application"
ssh "${DEPLOY_HOST}" "pm2 restart ${PM2_APP_NAME}"

echo "Deployment complete: ${DEPLOY_HOST}:~/${REMOTE_PROJECT_DIR} (.output), PM2 ${PM2_APP_NAME}"
