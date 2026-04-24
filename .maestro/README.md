# Workflow

- Define account personas in env.
- Create a dedicated auth subflow that flows can use to authenticate.
- Create flows that inject env into the auth subflow.
- Create a node setup script that nukes and creates accounts.

## Running locally

```bash
cd app
bash ../.maestro/scripts/run.sh
```

## Random email helper (Maestro JS)

`${NEW_USER_PREFIX + Math.floor(Math.random() * 1000) + '@mail.com'}`

## Tags

- `ios-only` — flows tagged `ios-only` are excluded from Android runs. Pass `--exclude-tags=ios-only` when running on Android.
