class UUIDLookupMixin:
    """Make DRF resolve detail routes by the model's ``uuid`` instead of its pk.

    The URL kwarg stays ``pk`` so existing route definitions keep working, but
    the lookup filters on ``uuid`` and therefore never accepts a guessable
    integer id.
    """

    lookup_field = "uuid"
    lookup_url_kwarg = "pk"
    lookup_value_regex = "[0-9a-fA-F-]{36}"