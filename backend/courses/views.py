from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.views import UUIDLookupMixin

from tracking.services import record_activity

from .access import accessible_courses_for_student
from .models import (
    Course,
    Lesson,
    Material,
    Section,
    Survey,
    SurveyAnswer,
    SurveyAttempt,
    SurveyQuestion,
    SurveyResponse,
    UserLessonProgress,
)
from .permissions import (
    IsTeacher,
    OwnsCourseObjectPermission,
    get_student,
    get_teacher,
)
from .serializers import (
    CourseDetailSerializer,
    CourseListSerializer,
    CourseWriteSerializer,
    LessonSerializer,
    MaterialSerializer,
    SectionSerializer,
    SurveyDetailSerializer,
    SurveyResponseSerializer,
    SurveySubmitSerializer,
    SurveyWriteSerializer,
    user_is_course_owner,
)


class CourseViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, OwnsCourseObjectPermission]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return CourseWriteSerializer
        if self.action == "retrieve":
            return CourseDetailSerializer
        return CourseListSerializer

    def get_queryset(self):
        user = self.request.user
        teacher = get_teacher(user)
        student = get_student(user)

        queryset = Course.objects.select_related("teacher__user").prefetch_related(
            "lessons",
            "materials",
            "surveys__questions",
        )

        if teacher:
            queryset = queryset.filter(teacher=teacher)
        elif student:
            queryset = accessible_courses_for_student(student)
        else:
            return Course.objects.none()

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        teacher_id = self.request.query_params.get("teacher")
        if teacher_id:
            queryset = queryset.filter(teacher__uuid=teacher_id)

        return queryset.annotate(
            lessons_count=Count("lessons", distinct=True),
            materials_count=Count("materials", distinct=True),
            surveys_count=Count("surveys", distinct=True),
        )

    def perform_create(self, serializer):
        teacher = get_teacher(self.request.user)
        if not teacher:
            raise PermissionDenied("Only teachers can create courses.")
        serializer.save(teacher=teacher)

    @action(detail=True, methods=["post"], url_path="reorder")
    def reorder(self, request, pk=None):
        course = self.get_object()
        if not user_is_course_owner(request.user, course):
            raise PermissionDenied("You can only reorder your own course.")

        with transaction.atomic():
            section_ids = request.data.get("sections") or []
            lesson_ids = request.data.get("lessons") or []

            for order, section_id in enumerate(section_ids, start=1):
                section = course.sections.filter(uuid=section_id).first()
                if section:
                    section.order = order
                    section.save(update_fields=["order"])

            for order, lesson_id in enumerate(lesson_ids, start=1):
                lesson = course.lessons.filter(uuid=lesson_id).first()
                if lesson:
                    lesson.order = order
                    lesson.save(update_fields=["order"])

        return Response({"status": "reordered", "course": str(course.uuid)})


class SectionViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated, OwnsCourseObjectPermission]

    def get_queryset(self):
        user = self.request.user
        teacher = get_teacher(user)
        student = get_student(user)

        queryset = Section.objects.select_related("course__teacher__user")

        if teacher:
            queryset = queryset.filter(course__teacher=teacher)
        elif student:
            queryset = queryset.filter(
                course__in=accessible_courses_for_student(student)
            )
        else:
            return Section.objects.none()

        course_id = self.request.query_params.get("course")
        if course_id:
            queryset = queryset.filter(course__uuid=course_id)

        return queryset

    def perform_create(self, serializer):
        course = serializer.validated_data.get("course")
        if not course or not user_is_course_owner(self.request.user, course):
            raise PermissionDenied("You can only add sections to your own courses.")
        order = serializer.validated_data.get("order")
        if order in (None, 0):
            last = course.sections.order_by("-order").first()
            serializer.save(order=(last.order + 1) if last else 1)
        else:
            serializer.save()


class LessonViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated, OwnsCourseObjectPermission]

    def get_queryset(self):
        user = self.request.user
        teacher = get_teacher(user)
        student = get_student(user)

        queryset = Lesson.objects.select_related("course__teacher__user").prefetch_related(
            "materials"
        )

        if teacher:
            queryset = queryset.filter(course__teacher=teacher)
        elif student:
            queryset = queryset.filter(
                course__in=accessible_courses_for_student(student)
            )
        else:
            return Lesson.objects.none()

        course_id = self.request.query_params.get("course_id") or self.request.query_params.get(
            "course"
        )
        if course_id:
            queryset = queryset.filter(course__uuid=course_id)

        return queryset.annotate(materials_count=Count("materials", distinct=True))

    def perform_create(self, serializer):
        course = serializer.validated_data.get("course")
        if not course or not user_is_course_owner(self.request.user, course):
            raise PermissionDenied("You can only add lessons to your own courses.")

        order = serializer.validated_data.get("order")
        if order in (None, 0):
            last = course.lessons.order_by("-order").first()
            serializer.save(order=(last.order + 1) if last else 1)
        else:
            serializer.save()

    def _get_course(self):
        course_id = self.request.query_params.get(
            "course_id"
        ) or self.request.query_params.get("course")
        if not course_id:
            raise ValidationError({"course_id": "This query parameter is required."})
        return get_object_or_404(Course, uuid=course_id)

    @action(detail=False, methods=["get"], url_path="by_course")
    def by_course(self, request):
        course = self._get_course()
        teacher = get_teacher(request.user)
        student = get_student(request.user)

        if teacher and course.teacher_id == teacher.id:
            pass
        elif not (
            student
            and accessible_courses_for_student(student).filter(pk=course.pk).exists()
        ):
            raise PermissionDenied("You do not have access to this course.")

        lessons = course.lessons.prefetch_related("materials")
        serializer = LessonSerializer(
            lessons, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="mark_as_finished")
    def mark_as_finished(self, request, pk=None):
        lesson = self.get_object()
        student = get_student(request.user)
        if not student:
            raise PermissionDenied("Only students can track lesson progress.")

        progress, created = UserLessonProgress.objects.update_or_create(
            student=student,
            lesson=lesson,
            defaults={"is_finished": True},
        )
        return Response(
            {
                "status": "Lesson marked as finished",
                "created": created,
                "lesson": lesson.id,
                "is_finished": progress.is_finished,
            }
        )

    @action(detail=True, methods=["post"], url_path="mark_as_unfinished")
    def mark_as_unfinished(self, request, pk=None):
        lesson = self.get_object()
        student = get_student(request.user)
        if not student:
            raise PermissionDenied("Only students can track lesson progress.")

        progress, created = UserLessonProgress.objects.update_or_create(
            student=student,
            lesson=lesson,
            defaults={"is_finished": False},
        )
        return Response(
            {
                "status": "Lesson marked as unfinished",
                "created": created,
                "lesson": lesson.id,
                "is_finished": progress.is_finished,
            }
        )

    @action(detail=True, methods=["post"], url_path="save_position")
    def save_position(self, request, pk=None):
        lesson = self.get_object()
        student = get_student(request.user)
        if not student:
            raise PermissionDenied("Only students can track lesson progress.")

        try:
            position = int(request.data.get("position_seconds", 0))
        except (TypeError, ValueError):
            raise ValidationError(
                {"position_seconds": "Provide the playback position in whole seconds."}
            )
        if position < 0:
            raise ValidationError({"position_seconds": "Position cannot be negative."})

        progress, _ = UserLessonProgress.objects.get_or_create(
            student=student, lesson=lesson
        )
        previous_position = progress.last_position_seconds
        finished = bool(request.data.get("is_finished", progress.is_finished))
        if (
            lesson.duration_seconds
            and lesson.duration_seconds > 0
            and not request.data.get("is_finished")
            and lesson.duration_seconds - position <= 15
        ):
            finished = True

        updates: list[str] = ["last_position_seconds"]
        progress.last_position_seconds = position
        delta = max(position - previous_position, 0)
        if delta >= 5:
            record_activity(
                request.user,
                "VIDEO_WATCH",
                object_uuid=lesson.uuid,
                duration_seconds=delta,
                metadata={"course": str(lesson.course.uuid)},
            )
        if finished and not progress.is_finished:
            progress.is_finished = True
            updates.append("is_finished")
            record_activity(
                request.user,
                "LESSON_COMPLETED",
                object_uuid=lesson.uuid,
                metadata={"course": str(lesson.course.uuid)},
            )
        progress.save(update_fields=updates)
        return Response(
            {
                "lesson": lesson.id,
                "last_position_seconds": progress.last_position_seconds,
                "is_finished": progress.is_finished,
            }
        )


class MaterialViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    serializer_class = MaterialSerializer
    permission_classes = [IsAuthenticated, OwnsCourseObjectPermission]

    def get_queryset(self):
        user = self.request.user
        teacher = get_teacher(user)
        student = get_student(user)

        queryset = Material.objects.select_related("course__teacher__user", "lesson")

        if teacher:
            queryset = queryset.filter(course__teacher=teacher)
        elif student:
            queryset = queryset.filter(
                course__in=accessible_courses_for_student(student)
            )
        else:
            return Material.objects.none()

        course_id = self.request.query_params.get("course")
        if course_id:
            queryset = queryset.filter(course__uuid=course_id)

        lesson_id = self.request.query_params.get("lesson")
        if lesson_id:
            queryset = queryset.filter(lesson__uuid=lesson_id)

        return queryset

    def perform_create(self, serializer):
        lesson = serializer.validated_data.get("lesson")
        course = serializer.validated_data.get("course") or (
            lesson.course if lesson else None
        )
        if not course or not user_is_course_owner(self.request.user, course):
            raise PermissionDenied("You can only add material to your own courses.")
        serializer.save(course=course)


class SurveyViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, OwnsCourseObjectPermission]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return SurveyWriteSerializer
        return SurveyDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        survey = self.get_object()
        student = get_student(request.user)
        if (
            student
            and not user_is_course_owner(request.user, survey.course)
            and (survey.shuffle_questions or survey.shuffle_choices)
        ):
            import random

            data = self.get_serializer(survey).data
            if survey.shuffle_questions:
                questions = list(data["questions"])
                random.shuffle(questions)
                data["questions"] = questions
            if survey.shuffle_choices:
                for question in data["questions"]:
                    choices = list(question["choices"])
                    random.shuffle(choices)
                    question["choices"] = choices
            return Response(data)
        return super().retrieve(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        teacher = get_teacher(user)
        student = get_student(user)

        queryset = Survey.objects.select_related("course__teacher__user").prefetch_related(
            "questions__choices"
        )

        if teacher:
            queryset = queryset.filter(course__teacher=teacher)
        elif student:
            queryset = queryset.filter(
                course__in=accessible_courses_for_student(student),
                is_published=True,
            )
        else:
            return Survey.objects.none()

        course_id = self.request.query_params.get("course")
        if course_id:
            queryset = queryset.filter(course__uuid=course_id)

        lesson_id = self.request.query_params.get("lesson")
        if lesson_id:
            queryset = queryset.filter(lesson__uuid=lesson_id)

        return queryset.annotate(questions_count=Count("questions", distinct=True))

    def perform_create(self, serializer):
        course = serializer.validated_data.get("course")
        if not course or not user_is_course_owner(self.request.user, course):
            raise PermissionDenied("You can only add surveys to your own courses.")
        serializer.save()

    def _check_available(self, survey):
        now = timezone.now()
        if survey.available_from and now < survey.available_from:
            raise ValidationError(
                {"detail": "This quiz is not open yet."}
            )
        if survey.available_until and now > survey.available_until:
            raise ValidationError(
                {"detail": "This quiz is closed."}
            )

    def _student_attempts(self, survey, student):
        return SurveyAttempt.objects.filter(survey=survey, student=student)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        survey = self.get_object()
        student = get_student(request.user)
        if not student:
            raise PermissionDenied("Only students can start a quiz.")
        self._check_available(survey)

        used = self._student_attempts(survey, student).count()
        if survey.max_attempts is not None and used >= survey.max_attempts:
            raise PermissionDenied("No attempts left for this quiz.")

        attempt = SurveyAttempt.objects.create(
            survey=survey,
            student=student,
            attempt_number=used + 1,
        )
        record_activity(
            request.user,
            "QUIZ_STARTED",
            object_uuid=survey.uuid,
            metadata={"course": str(survey.course.uuid), "attempt": attempt.attempt_number},
        )

        server_now = timezone.now()
        deadline = (
            server_now + timezone.timedelta(minutes=survey.time_limit_minutes)
            if survey.time_limit_minutes
            else None
        )
        return Response(
            {
                "attempt": str(attempt.uuid),
                "attempt_number": attempt.attempt_number,
                "started_at": attempt.started_at,
                "server_now": server_now,
                "deadline": deadline,
                "time_limit_minutes": survey.time_limit_minutes,
                "attempts_left": (
                    None
                    if survey.max_attempts is None
                    else max(survey.max_attempts - used - 1, 0)
                ),
            },
            status=status.HTTP_201_CREATED,
        )

    @transaction.atomic
    def _grade_and_store(self, survey, student, answers, attempt=None):
        response, _ = SurveyResponse.objects.update_or_create(
            survey=survey, student=student
        )
        response.answers.all().delete()

        score = 0
        results = []
        questions = {str(question.uuid): question for question in survey.questions.all()}

        for answer in answers:
            question = questions.get(str(answer["question"]))
            if not question:
                raise ValidationError(
                    {"question": f"Question {answer['question']} is not in this survey."}
                )

            choice = None
            text_answer = answer.get("text_answer", "") or ""
            is_correct = False

            if question.question_type == SurveyQuestion.QuestionType.SHORT_ANSWER:
                is_correct = (
                    text_answer.strip().lower()
                    == question.expected_answer.strip().lower()
                    and bool(question.expected_answer.strip())
                )
            else:
                choice_id = answer.get("choice")
                if choice_id is None:
                    raise ValidationError(
                        {"choice": f"Question {question.uuid} needs a choice."}
                    )
                choice = question.choices.filter(uuid=choice_id).first()
                if not choice:
                    raise ValidationError(
                        {"choice": f"Choice {choice_id} is not valid for question {question.uuid}."}
                    )
                is_correct = choice.is_correct

            if is_correct:
                score += question.points

            SurveyAnswer.objects.create(
                response=response,
                question=question,
                choice=choice,
                text_answer=text_answer,
                is_correct=is_correct,
            )

            results.append(
                {
                    "question": str(question.uuid),
                    "is_correct": is_correct,
                    "correct_choice": (
                        str(question.correct_choice().uuid)
                        if question.correct_choice()
                        else None
                    ),
                    "explanation": question.explanation,
                }
            )

        response.score = score
        response.save(update_fields=["score", "updated_at"])

        if attempt is not None:
            total = survey.total_points
            attempt.score = score
            attempt.submitted_at = timezone.now()
            if total:
                attempt.passed = (
                    round((score / total) * 100) >= survey.passing_score_percent
                )
            else:
                attempt.passed = False
            if attempt.started_at:
                attempt.time_spent_seconds = max(
                    int((attempt.submitted_at - attempt.started_at).total_seconds()), 0
                )
            attempt.save(
                update_fields=["score", "passed", "time_spent_seconds", "submitted_at"]
            )

        return response, results

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        survey = self.get_object()
        student = get_student(request.user)
        if not student:
            raise PermissionDenied("Only students can submit answers.")
        self._check_available(survey)

        serializer = SurveySubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        attempt = None
        attempt_id = serializer.validated_data.get("attempt")
        if attempt_id:
            attempt = (
                SurveyAttempt.objects.filter(
                    uuid=attempt_id, survey=survey, student=student
                )
                .order_by("-attempt_number")
                .first()
            )
            if attempt is None:
                raise ValidationError({"attempt": "Unknown attempt for this quiz."})
            if attempt.submitted_at:
                raise ValidationError({"attempt": "This attempt was already submitted."})
            if (
                survey.time_limit_minutes
                and timezone.now()
                > attempt.started_at
                + timezone.timedelta(minutes=survey.time_limit_minutes, seconds=30)
            ):
                raise ValidationError({"attempt": "Time is up for this attempt."})
        else:
            used = self._student_attempts(survey, student).count()
            if survey.max_attempts is not None and used >= survey.max_attempts:
                raise PermissionDenied("No attempts left for this quiz.")
            attempt = SurveyAttempt.objects.create(
                survey=survey,
                student=student,
                attempt_number=used + 1,
            )

        response, results = self._grade_and_store(
            survey, student, serializer.validated_data["answers"], attempt=attempt
        )
        total = survey.total_points
        percent = round((response.score / total) * 100) if total else 0
        passed = percent >= survey.passing_score_percent

        record_activity(
            request.user,
            "QUIZ_SUBMITTED",
            object_uuid=survey.uuid,
            metadata={
                "course": str(survey.course.uuid),
                "score": response.score,
                "total": total,
                "attempt": attempt.attempt_number,
            },
        )

        if survey.show_results == Survey.ShowResults.NEVER or (
            survey.show_results == Survey.ShowResults.AFTER_DEADLINE
            and (not survey.available_until or timezone.now() < survey.available_until)
        ):
            return Response(
                {
                    "response": SurveyResponseSerializer(
                        response, context={"request": request}
                    ).data,
                    "score": None,
                    "total": total,
                    "correct_count": None,
                    "passed": None,
                    "results": None,
                    "message": "Your submission has been recorded. Results are not available yet.",
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {
                "response": SurveyResponseSerializer(
                    response, context={"request": request}
                ).data,
                "score": response.score,
                "total": total,
                "correct_count": sum(1 for item in results if item["is_correct"]),
                "percent": percent,
                "passed": passed,
                "results": results,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def results(self, request, pk=None):
        survey = self.get_object()
        if not user_is_course_owner(request.user, survey.course):
            raise PermissionDenied("Only the course teacher can view results.")

        responses = survey.responses.select_related("student__user").prefetch_related(
            "answers"
        )
        return Response(
            SurveyResponseSerializer(
                responses, many=True, context={"request": request}
            ).data
        )

    @action(detail=True, methods=["get"])
    def attempts(self, request, pk=None):
        survey = self.get_object()
        student = get_student(request.user)
        if not student:
            raise PermissionDenied("Only students can view their attempts.")
        attempts = self._student_attempts(survey, student).order_by("attempt_number")
        return Response(
            [
                {
                    "id": str(attempt.uuid),
                    "attempt_number": attempt.attempt_number,
                    "started_at": attempt.started_at,
                    "submitted_at": attempt.submitted_at,
                    "score": attempt.score,
                    "passed": attempt.passed,
                    "time_spent_seconds": attempt.time_spent_seconds,
                }
                for attempt in attempts
            ]
        )

    @action(detail=True, methods=["get"])
    def analytics(self, request, pk=None):
        survey = self.get_object()
        if not user_is_course_owner(request.user, survey.course):
            raise PermissionDenied("Only the course teacher can view analytics.")

        attempts = survey.attempts.select_related("student__user")
        submitted = [attempt for attempt in attempts if attempt.submitted_at]
        responses = survey.responses.select_related("student__user")
        total_points = survey.total_points

        scores = [response.score for response in responses]
        percents = [
            round((score / total_points) * 100) if total_points else 0
            for score in scores
        ]
        passing = [
            percent for percent in percents
            if percent >= survey.passing_score_percent
        ]

        question_stats = []
        for question in survey.questions.all().prefetch_related("choices", "answers"):
            answers = question.answers.all()
            total_answers = answers.count()
            correct_answers = sum(1 for answer in answers if answer.is_correct)
            choice_counts = [
                {
                    "choice": str(choice.uuid),
                    "text": choice.text,
                    "count": sum(
                        1 for answer in answers if answer.choice_id == choice.id
                    ),
                }
                for choice in question.choices.all()
            ]
            question_stats.append(
                {
                    "question": str(question.uuid),
                    "text": question.text,
                    "question_type": question.question_type,
                    "points": question.points,
                    "total_answers": total_answers,
                    "correct_answers": correct_answers,
                    "correct_rate": (
                        round((correct_answers / total_answers) * 100)
                        if total_answers
                        else None
                    ),
                    "choice_counts": choice_counts,
                }
            )

        started_students = {attempt.student_id for attempt in attempts}
        return Response(
            {
                "survey": str(survey.uuid),
                "title": survey.title,
                "kind": survey.kind,
                "total_points": total_points,
                "passing_score_percent": survey.passing_score_percent,
                "attempts_started": len(attempts),
                "attempts_submitted": len(submitted),
                "distinct_students": len(
                    started_students
                    | {response.student_id for response in responses}
                ),
                "average_percent": (
                    round(sum(percents) / len(percents)) if percents else None
                ),
                "pass_rate": (
                    round((len(passing) / len(percents)) * 100) if percents else None
                ),
                "questions": question_stats,
            }
        )
