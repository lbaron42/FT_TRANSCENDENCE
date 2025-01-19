from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.crypto import get_random_string
from django.contrib.auth.models import User
from .models import Profile
import logging

logger = logging.getLogger('django')

@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        logger.info(f"Creating profile for user: {instance.username} (ID: {instance.id})")
        base_display_name = instance.username
        unique_display_name = base_display_name
        while Profile.objects.filter(display_name=unique_display_name).exists():
            unique_display_name = f"{base_display_name}_{get_random_string(5)}"
        Profile.objects.create(user=instance, display_name=unique_display_name)
        logger.info(f"Profile created for user: {instance.username} (ID: {instance.id})")
