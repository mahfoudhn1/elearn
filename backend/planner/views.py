"""DRF views for the planner app.

Every student-scoped queryset is filtered by ``request.user.student`` so a
student can only ever read or write their own rows. Detail routes use the
model ``uuid`` (via :class:`core.views.UUIDLookupMixin`), so an unknown or
other-student uuid yields 404 rather than leaking existence.
"""

from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework import serializers as drf_serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.views import UUIDLookupMixin
from courses.permissions import get_student
from django.db import IntegrityError

from .models import (
    AcademicPeriod,
    AcademicYear,
    Commitment,
    CommitmentException,
    StudentPlannerProfile,
)
from .onboarding import apply_onboarding, build_onboarding_state
from .permissions import HasStudentProfile
from .serializers import (
    AcademicPeriodSerializer,
    AcademicYearSerializer,
    CommitmentExceptionSerializer,
    CommitmentSerializer,
    OnboardingSerializer,
    StudentPlannerProfileSerializer,
)


class AcademicYearViewSet(UUIDLookupMixin, viewsets.ReadOnlyModelViewSet):
    """Academic years are shared config; students get read-only access."""

    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated]


class AcademicPeriodViewSet(UUIDLookupMixin, viewsets.ReadOnlyModelViewSet):
    """Academic periods are shared config; filter by year and kind."""

    serializer_class = AcademicPeriodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = AcademicPeriod.objects.select_related("academic_year")
        year_uuid = self.request.query_params.get("academic_year")
        kind = self.request.query_params.get("kind")
        if year_uuid:
            queryset = queryset.filter(academic_year__uuid=year_uuid)
        if kind:
            queryset = queryset.filter(kind=kind)
        return queryset


class StudentPlannerProfileViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    """The caller's own planner profile.

    ``create`` is idempotent: the first call creates the row, later calls update
    it. ``student`` is assigned from the authenticated user, never the payload.
    """

    serializer_class = StudentPlannerProfileSerializer
    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get_queryset(self):
        student = get_student(self.request.user)
        if student is None:
            return StudentPlannerProfile.objects.none()
        return StudentPlannerProfile.objects.filter(student=student)

    def create(self, request, *args, **kwargs):
        student = get_student(request.user)
        if student is None:
            raise PermissionDenied(HasStudentProfile.message)
        profile, created = StudentPlannerProfile.objects.get_or_create(student=student)
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=http_status)


class CommitmentViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    """A student's recurring fixed blocks."""

    serializer_class = CommitmentSerializer
    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get_queryset(self):
        student = get_student(self.request.user)
        if student is None:
            return Commitment.objects.none()
        queryset = Commitment.objects.filter(student=student)
        kind = self.request.query_params.get("kind")
        weekday = self.request.query_params.get("weekday")
        if kind:
            queryset = queryset.filter(kind=kind)
        if weekday is not None:
            queryset = queryset.filter(weekday=weekday)
        return queryset

    def perform_create(self, serializer):
        student = get_student(self.request.user)
        if student is None:
            raise PermissionDenied(HasStudentProfile.message)
        serializer.save(student=student)


class CommitmentExceptionViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    """Single-date cancellations/moves for the caller's commitments."""

    serializer_class = CommitmentExceptionSerializer
    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get_queryset(self):
        student = get_student(self.request.user)
        if student is None:
            return CommitmentException.objects.none()
        queryset = CommitmentException.objects.filter(
            commitment__student=student
        ).select_related("commitment")
        commitment_uuid = self.request.query_params.get("commitment")
        if commitment_uuid:
            queryset = queryset.filter(commitment__uuid=commitment_uuid)
        return queryset


class OnboardingStateView(APIView):
    """Everything already known about the student, and what is still missing."""

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get(self, request):
        student = get_student(request.user)
        return Response(build_onboarding_state(student))


class OnboardingView(APIView):
    """Apply the onboarding questionnaire in one transactional call.

    Idempotent: re-submitting replaces the student's onboarding-created rows.
    """

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def put(self, request):
        student = get_student(request.user)
        serializer = OnboardingSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        try:
            state = apply_onboarding(student, serializer.validated_data)
        except IntegrityError as exc:
            raise drf_serializers.ValidationError(
                {"detail": "The submission violated a data constraint."}
            ) from exc
        return Response(state, status=status.HTTP_200_OK)
