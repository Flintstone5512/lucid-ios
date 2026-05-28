#!/bin/bash
set -e

PROFILES_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
mkdir -p "$PROFILES_DIR"

for profile in certs/LucidShieldAction.mobileprovision certs/LucidShieldConfiguration.mobileprovision; do
  if [ -f "$profile" ]; then
    cp "$profile" "$PROFILES_DIR/"
    echo "Installed $profile"
  else
    echo "WARNING: $profile not found, skipping"
  fi
done
