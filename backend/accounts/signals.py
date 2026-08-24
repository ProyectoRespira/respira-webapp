from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .permissions import sync_user_group

User = get_user_model()


@receiver(post_save, sender=User)
def sync_user_role_group(sender, instance, raw=False, **kwargs):
    """Keep a user's group membership (and staff access) in sync with their role.

    - Fixtures (``raw=True``) are skipped so loaddata stays deterministic.
    - A user with an administrative role is granted ``is_staff`` so they can
      reach the admin; done via ``update()`` to avoid re-triggering this signal.
    """
    if raw:
        return

    sync_user_group(instance)

    if instance.role is not None and not instance.is_staff:
        User.objects.filter(pk=instance.pk).update(is_staff=True)
        instance.is_staff = True
