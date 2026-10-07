"""Pure correlation helper for the calibration report (no Django).

Pearson's r between two equal-length sequences, with a guard for degenerate
inputs (fewer than two pairs, or zero variance on either side).
"""

from __future__ import annotations

import math
from typing import Sequence


def pearson(pairs: Sequence[tuple[float, float]]) -> tuple[float | None, int]:
    """Return ``(r, n)``. ``r`` is ``None`` when it is undefined."""
    points = [(float(x), float(y)) for x, y in pairs]
    n = len(points)
    if n < 2:
        return None, n

    mean_x = sum(x for x, _ in points) / n
    mean_y = sum(y for _, y in points) / n
    covariance = sum((x - mean_x) * (y - mean_y) for x, y in points)
    variance_x = sum((x - mean_x) ** 2 for x, _ in points)
    variance_y = sum((y - mean_y) ** 2 for _, y in points)
    if variance_x <= 0 or variance_y <= 0:
        return None, n
    r = covariance / math.sqrt(variance_x * variance_y)
    return round(r, 6), n
