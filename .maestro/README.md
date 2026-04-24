# Workflow

- Define account personas in env.
- Create a dedicated auth subflow that flows can use to authenticate.
- Create flows that inject env into the auth subflow.
- Create a node setup script that nukes and creates accounts.

util for random email:
`${NEW_USER_PREFIX}+${java.util.UUID.randomUUID()}@example.com`