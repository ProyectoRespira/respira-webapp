# Per-sensor push alerts

Devices that follow a sensor get a push notification when that sensor's air
quality changes level — a warning when it worsens, an all-clear when it
improves. The audience comes from `DeviceFollower`, the same rows the mobile app
writes when a user follows a sensor.

This is separate from the regional campaigns PushWave already handles. It exists
because "notify exactly the followers of station X" has to be driven by our own
data.

Code: `backend/api/push.py`, driven by the `send_sensor_alerts` management
command.

## Two things are required

Nothing is delivered unless **both** are true. Either one missing produces the
same symptom — no notification ever arrives — so check both before debugging
anything else.

1. `BACKEND_SENSOR_ALERTS_ENABLED=true` in the compose `.env`. It defaults to
   `false` so a freshly deployed environment cannot start notifying real devices
   before somebody decides it should.
2. Something calls the command on a schedule. It is not run by the entrypoint or
   by any deploy step — see the timer below.

## 1) Check what a run would do

Safe on any environment, sends nothing, needs neither of the above:

```bash
docker compose exec backend python manage.py send_sensor_alerts --dry-run
```

```
12 followed station(s) read, 1 worsened, 2 improved, 0 message(s) accepted, 0 dead token(s) cleared.
```

`0 followed station(s) read` means no station that anyone follows had a usable
reading — check that the app is registering follows, and that the stations they
point at are on and have rows in `station_readings_gold`.

To send once by hand, with delivery still switched off in the environment:

```bash
docker compose exec backend python manage.py send_sensor_alerts --force
```

## 2) When a notification is sent

Decided by `notification_for()` against `SensorAlertState`, one row per station:

| Situation | Result |
| --- | --- |
| Level worsens past what followers were last told | Warning |
| Level drops below what followers were last told, with an episode open | All-clear |
| Same level as the last notification | Nothing |
| `good` or `moderate` with no episode open | Nothing |
| An installation follows a station already in an alert level | Catch-up, to that device only |

Only `unhealthySensitive` and above start an episode — `good` and `moderate` are
not alerts, and sending them would train people to dismiss the ones that matter.
Every drop is announced, including one that lands on another alert-worthy level:
hazardous down to unhealthy still changes what somebody deciding whether to go
outside should do.

An episode closes when the station reads `good` or `moderate` again, which is
what lets the next bad episode alert from its first reading.

Notifications that Expo did not accept leave the state untouched, so the next
run makes the same announcement again rather than treating it as delivered.

Every delivered notification is recorded in `sensor_alert` with a `trend` of
`worsening`, `improving` or `catch_up`, which is the audit trail for the Sensor
Leasing programme.

### The catch-up, and why it is separate

`SensorAlertState` is per station, not per follower. Somebody who follows a
sensor that is *already* over the threshold matches no change, so the scheduled
sender has nothing to say about them — they would hear nothing until the air
worsened further or recovered, which is silence in exactly the case the feature
exists for.

`catch_up_follower()` closes that: the follow endpoint sends that one
installation a message describing how the air is right now. It runs outside the
follow's transaction (an HTTP call while holding `select_for_update` on the
installation would block that device's other follows), it never fails the
follow, and it deliberately does **not** advance `SensorAlertState` — that state
is what every other follower's next notification is judged against, and moving
it would suppress a real warning for all of them.

Only new follows trigger it. A repeated follow returns the existing row before
reaching that code, so an app retrying on a flaky network does not notify twice.

## 3) Recommended automation with systemd timer

The repository includes templates in `utils/systemd/`:

- `respira-sensor-alerts.service.template`
- `respira-sensor-alerts.timer`
- `respira-sensor-alerts.env.example`

Create service unit `/etc/systemd/system/respira-sensor-alerts.service`:

```ini
[Unit]
Description=Send Respira per-sensor push alerts to the devices following each sensor
Wants=docker.service
After=docker.service

[Service]
Type=oneshot
EnvironmentFile=-/etc/default/respira-sensor-alerts
ExecStart=/bin/sh -lc 'set -eu; COMPOSE_PATH="${RESPIRA_COMPOSE_PATH:-/workspaces/respira-webapp}"; cd "$COMPOSE_PATH"; docker compose exec -T backend python manage.py send_sensor_alerts ${RESPIRA_SENSOR_ALERTS_ARGS:-}'
```

Create timer unit `/etc/systemd/system/respira-sensor-alerts.timer`:

```ini
[Unit]
Description=Check followed Respira sensors for air quality changes every 15 minutes

[Timer]
OnCalendar=*:0/15
RandomizedDelaySec=2m
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now respira-sensor-alerts.timer
```

Firing more often than readings arrive is harmless: the sender is idempotent,
and a run with nothing to say costs one query per followed station.

### Optional environment-file pattern

```bash
sudo cp utils/systemd/respira-sensor-alerts.env.example /etc/default/respira-sensor-alerts
```

```bash
RESPIRA_COMPOSE_PATH=/absolute/path/to/compose/project
# Watch a new environment for a day before letting it notify real devices:
# RESPIRA_SENSOR_ALERTS_ARGS=--dry-run
```

Inspect status and logs:

```bash
systemctl list-timers respira-sensor-alerts.timer
journalctl -u respira-sensor-alerts.service -n 100 --no-pager
```

The command exits non-zero when any station failed, so a failed run shows up in
`systemctl status` instead of being recorded as a silent partial success.

## 4) Troubleshooting

**Nothing arrives at all.** Check the two requirements above first. Then confirm
devices are registering tokens: `DeviceInstallation` rows with a non-empty
`push_token`. Until the app calls `registerPushToken`, the token is fetched on
the device and thrown away, and there is nobody to send to.

**A dry run reports stations but no message arrives.** The stations have
followers, but those installations have no `push_token`. The run counts them as
considered and finds nobody reachable.

**Notifications arrive but tapping one does nothing.** The app routes on
`data.type == "sensor_alert"` and resolves `data.station_code` against the
follows it holds. A notification about a sensor the installation no longer
follows is ignored by design.

**Tokens disappearing.** Expo answering `DeviceNotRegistered` blanks that
token — the app was uninstalled. The device re-registers on next launch.

## Related

- [Backend environment variables](backend-env-vars.md) —
  `BACKEND_SENSOR_ALERTS_ENABLED`, `BACKEND_MAX_FOLLOWS_PER_INSTALLATION`
- [Certbot renewal](certbot-renewal.md) — the other systemd timer on these hosts
