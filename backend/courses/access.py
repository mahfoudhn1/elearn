"""Subscription-aware access rules for the courses app.

A student may only see courses published by teachers they are subscribed to.

Subscription lapse is handled with a "content cutoff" (see
``subscription.models.Subscription.content_cutoff``):

* while the subscription is active the cutoff is ``None`` -> the student sees
  every course the teacher ever published;
* while it is inactive the cutoff is the moment access ended -> courses that
  already existed before that moment stay visible, but anything the teacher
  publishes afterwards is hidden;
* renewing clears the cutoff, so the courses posted during the gap become
  visible again.
"""

from django.db.models import Q

from .models import Course


def teacher_cutoffs_for_student(student):
    """Map ``teacher_id -> cutoff`` for every teacher the student subscribed to.

    A cutoff of ``None`` means the student currently has full access to that
    teacher's catalogue. When several subscriptions point at the same teacher
    the most permissive one wins.
    """
    from subscription.models import Subscription

    cutoffs = {}
    subscriptions = Subscription.objects.filter(student=student).select_related(
        "teacher", "plan"
    )
    for subscription in subscriptions:
        if not subscription.has_access_history():
            continue

        teacher_id = subscription.teacher_id
        cutoff = subscription.content_cutoff()

        if teacher_id not in cutoffs:
            cutoffs[teacher_id] = cutoff
        elif cutoffs[teacher_id] is not None and cutoff is None:
            cutoffs[teacher_id] = None
        elif cutoffs[teacher_id] is not None and cutoff is not None:
            cutoffs[teacher_id] = max(cutoffs[teacher_id], cutoff)

    return cutoffs


def accessible_courses_for_student(student):
    """Queryset of published courses the student is allowed to see."""
    cutoffs = teacher_cutoffs_for_student(student)
    if not cutoffs:
        return Course.objects.none()

    condition = Q()
    for teacher_id, cutoff in cutoffs.items():
        if cutoff is None:
            condition |= Q(teacher_id=teacher_id)
        else:
            condition |= Q(teacher_id=teacher_id, created_at__lte=cutoff)

    return Course.objects.filter(Q(is_published=True) & condition)


def is_course_accessible(student, course):
    if not course.is_published:
        return False

    from subscription.models import Subscription

    subscriptions = Subscription.objects.filter(
        student=student, teacher_id=course.teacher_id
    )
    for subscription in subscriptions:
        if not subscription.has_access_history():
            continue
        cutoff = subscription.content_cutoff()
        if cutoff is None or course.created_at <= cutoff:
            return True
    return False


def course_access_info(student, course):
    """Describe a course's access state for the given student."""
    from subscription.models import Subscription

    subscriptions = [
        subscription
        for subscription in Subscription.objects.filter(
            student=student, teacher_id=course.teacher_id
        )
        if subscription.has_access_history()
    ]
    has_subscription = bool(subscriptions)
    subscription_active = any(
        subscription.is_active_subscription() for subscription in subscriptions
    )
    visible = course.is_published and any(
        subscription.content_cutoff() is None
        or course.created_at <= subscription.content_cutoff()
        for subscription in subscriptions
    )

    return {
        "has_subscription": has_subscription,
        "subscription_active": subscription_active,
        "is_locked": not visible,
    }
