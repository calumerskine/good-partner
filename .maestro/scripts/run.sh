#!/bin/bash
# Load .env
source .env

maestro test --exclude-tags=ignore ../.maestro/flows/ \
  -e EMPTY_USER_EMAIL=$EMPTY_USER_EMAIL \
  -e ONBOARDED_USER_EMAIL=$ONBOARDED_USER_EMAIL \
  -e NEW_USER_PREFIX=$NEW_USER_PREFIX \
  -e TEST_PASSWORD=$EXPO_PUBLIC_TEST_PASSWORD