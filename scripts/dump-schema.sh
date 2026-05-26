#!/usr/bin/env bash

yarn workspace @storyteller-platform/web db:dump

git add schema.sql web/src/database/schema.ts
