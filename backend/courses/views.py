from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.views import UUIDLookupMixin

from .access import accessible_courses_for_student
from .models import (
    Course,
    Lesson,
    Material,
    Survey,
    SurveyAnswer,
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

    @transaction.atomic
    def _grade_and_store(self, survey, student, answers):
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

        return response, results

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        survey = self.get_object()
        student = get_student(request.user)
        if not student:
            raise PermissionDenied("Only students can submit answers.")

        serializer = SurveySubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        response, results = self._grade_and_store(
            survey, student, serializer.validated_data["answers"]
        )
        total = survey.total_points

        return Response(
            {
                "response": SurveyResponseSerializer(
                    response, context={"request": request}
                ).data,
                "score": response.score,
                "total": total,
                "correct_count": sum(1 for item in results if item["is_correct"]),
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
