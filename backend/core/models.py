import uuid

from django.db import models


class UUIDModel(models.Model):
    """Abstract base that gives every model a non-guessable public identifier.

    The integer primary key is kept internally for foreign keys and index
    performance, but it must never be exposed through the API. Instead every
    model carries a ``uuid`` that is used as the public identifier in URLs,
    request bodies and responses.
    """

    uuid = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        db_index=True,
    )

    class Meta:
        abstract = True