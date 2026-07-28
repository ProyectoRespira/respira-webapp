# Certbot Renewal and TLS Monitoring

This project stores Let's Encrypt assets on the host and mounts them into both services:

- `certbot/conf` -> certbot container (`/etc/letsencrypt`)
- `certbot/conf` -> proxy container (`/etc/nginx/ssl`)
- `certbot/www` -> shared ACME webroot (`/var/www/certbot`)

Use the utility script at `utils/certbot-maintenance.sh` to keep certificates updated.
It writes to `<project-root>/logs/certbot-maintenance.log` by default, or to the path passed with `--log-file`.
For `check-expiry`, it reads certificates from `./certbot/conf` relative to the current working directory when present, otherwise it falls back to `<project-root>/certbot/conf`. You can also pass `--certbot-config-dir` explicitly.

## 1) Initial certificate issuance (one-time)

If you have not issued a certificate yet:

```bash
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d your-domain.example -d www.your-domain.example \
  --email your-email@example.com --agree-tos --no-eff-email
```

Then reload proxy once:

```bash
docker compose exec -T proxy nginx -s reload
```

## 2) Renewal command

The renewal flow runs certbot and then reloads nginx:

```bash
./utils/certbot-maintenance.sh renew
```

If the compose project lives elsewhere, pass it explicitly:

```bash
./utils/certbot-maintenance.sh --project-root /absolute/path/to/respira-webapp renew
```

This is safe to run frequently. It does not force a new certificate every time; Certbot only renews certificates that are close enough to expiry.
All command output is appended to the maintenance log file for troubleshooting.

## 3) Expiry check command

For monitoring and operational checks:

```bash
./utils/certbot-maintenance.sh check-expiry --cert-name your-domain.example
```

If your Let's Encrypt files live outside the default `./certbot/conf`, pass the base directory explicitly:

```bash
./utils/certbot-maintenance.sh check-expiry --cert-name your-domain.example --certbot-config-dir /absolute/path/to/certbot/conf
```

Relative paths are resolved from the directory where you run the command.

The `cert_name` argument must be a plain certificate directory name, without path separators or traversal sequences.

Example output includes:
- Expiration timestamp (UTC)
- Remaining days

## 4) Recommended automation with systemd timer

The repository includes templates in `utils/systemd/` for manual host installation:

- `respira-certbot-renew.service.template`
- `respira-certbot-renew.timer`
- `respira-certbot-renew.env.example`

Create service unit `/etc/systemd/system/respira-certbot-renew.service`:

```ini
[Unit]
Description=Renew Let's Encrypt certificate for Respira
Wants=docker.service
After=docker.service

[Service]
Type=oneshot
EnvironmentFile=-/etc/default/respira-certbot-renew
ExecStart=/bin/sh -lc 'set -eu; COMPOSE_PATH="${RESPIRA_COMPOSE_PATH:-/workspaces/respira-webapp}"; cd "$COMPOSE_PATH"; set -- --project-root "$COMPOSE_PATH"; if [ -n "${RESPIRA_CERTBOT_LOG_FILE:-}" ]; then set -- "$@" --log-file "$RESPIRA_CERTBOT_LOG_FILE"; fi; ./utils/certbot-maintenance.sh "$@" renew'
```

Create timer unit `/etc/systemd/system/respira-certbot-renew.timer`:

```ini
[Unit]
Description=Run Respira certbot renewal twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=15m
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now respira-certbot-renew.timer
```

### Optional environment-file pattern

Create `/etc/default/respira-certbot-renew` if your compose path differs between hosts:

```bash
sudo cp utils/systemd/respira-certbot-renew.env.example /etc/default/respira-certbot-renew
```

Then edit:

```bash
RESPIRA_COMPOSE_PATH=/absolute/path/to/compose/project
# Optional: override the renewal log file path
# RESPIRA_CERTBOT_LOG_FILE=/var/log/respira-certbot.log
```

Inspect status and logs:

```bash
systemctl list-timers respira-certbot-renew.timer
journalctl -u respira-certbot-renew.service -n 100 --no-pager
```

The script log file is also useful for troubleshooting:

```bash
tail -n 100 logs/certbot-maintenance.log
```

Or if you chose a custom path:

```bash
./utils/certbot-maintenance.sh --project-root /absolute/path/to/respira-webapp --log-file /var/log/respira-certbot.log renew
```

## 5) Suggested alert threshold

Alert if remaining lifetime is less than 20 days. A simple check is:

```bash
./utils/certbot-maintenance.sh check-expiry --cert-name your-domain.example
```

Integrate this command into your monitoring platform or a scheduled host check.
