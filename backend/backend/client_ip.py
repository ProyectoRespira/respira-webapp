"""Resolve the real client IP behind the nginx reverse proxy.

Every request reaches Django through the ``proxy`` container, so
``REMOTE_ADDR`` is always that container's Docker address. nginx passes the
address it saw in ``X-Real-IP``, set with ``proxy_set_header X-Real-IP
$remote_addr`` on every location (``proxy/nginx.conf*.template``).

That header is read instead of ``X-Forwarded-For`` because nginx overwrites
it: whatever ``X-Real-IP`` a client sends is replaced, so it holds exactly one
address and cannot be spoofed. ``X-Forwarded-For`` is built with
``$proxy_add_x_forwarded_for``, which *appends* to the client's own header, so
its leftmost entries are attacker-controlled.

The header is only trusted when ``CLIENT_IP_TRUST_PROXY_HEADER`` is on
(``BACKEND_TRUST_PROXY_IP_HEADER``, default on outside DEBUG). Turn it off for
any deployment where clients can reach Django without going through nginx, or
they could pick their own IP.
"""

from django.conf import settings


def get_client_ip(request):
    if getattr(settings, "CLIENT_IP_TRUST_PROXY_HEADER", False):
        real_ip = request.META.get("HTTP_X_REAL_IP", "").strip()
        if real_ip:
            return real_ip
    return request.META.get("REMOTE_ADDR")
