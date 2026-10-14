#!/bin/bash
# Pushes the TalkingSites sign-in theme into the auth.talkingsites.org brand's Custom CSS.
# Usage: scripts/authentik-brand-css.sh [light|glass|gradient] [glow|white|bright|sticker|spotlight|band|underline|wordmark|original]   (default: glass band)
# Preview the variants first in brand/authentik/preview.html.
set -euo pipefail

A=https://auth.talkingsites.org/api/v3
H="Authorization: Bearer $(pass show authentik-ew/service-account | head -1)"
HERE="$(cd "$(dirname "$0")/../brand/authentik" && pwd)"
VARIANT="${1:-glass}"
LOGO="${2:-band}"
[[ -f "$HERE/variants/$VARIANT.css" ]] || { echo "No variant '$VARIANT' (try light, glass or gradient)" >&2; exit 1; }
[[ -f "$HERE/logo/$LOGO.css" ]] || { echo "No logo treatment '$LOGO' (see brand/authentik/logo/)" >&2; exit 1; }

BRAND=$(curl -sf -H "$H" "$A/core/brands/?domain=auth.talkingsites.org" | jq -r '.results[0].brand_uuid // empty')
[[ -n $BRAND ]] || { echo "No auth.talkingsites.org brand" >&2; exit 1; }

cat "$HERE/talkingsites.css" "$HERE/variants/$VARIANT.css" "$HERE/logo/$LOGO.css" | jq -Rs '{branding_custom_css: .}' |
  curl -sf -H "$H" -H 'Content-Type: application/json' -X PATCH "$A/core/brands/$BRAND/" -d @- |
  jq -r --arg v "$VARIANT $LOGO" '"Custom CSS (\($v)) set on \(.domain): \(.branding_custom_css | length) chars"'
