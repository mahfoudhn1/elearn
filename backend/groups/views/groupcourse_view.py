from rest_framework import viewsets

from subscription.models import Subscription
from groups.serializers import GroupCourseSerializer, QuizSerializer, StudentAnswerSerializer
from groups.models import GroupCourse, Question, Quiz, StudentAnswer
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from rest_framework.response import Response


class GroupCourseViewSet(viewsets.ModelViewSet):
    serializer_class = GroupCourseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if hasattr(user, 'teacher'):
            return GroupCourse.objects.filter(teacher=user.teacher)

        elif hasattr(user, 'student'):
            student = user.student
            subscriptions = Subscription.objects.filter(
                student=student,
                is_active=True
            ).values_list('teacher_id', flat=True)

            return GroupCourse.objects.filter(
                group__students=student,
                teacher_id__in=subscriptions
            )

        return GroupCourse.objects.none()

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user.teacher)

        
class QuizViewset(viewsets.ReadOnlyModelViewSet):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated]


class StudentAnswerViewSet(viewsets.ModelViewSet):
    queryset = StudentAnswer.objects.all()
    serializer_class = StudentAnswerSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        student = request.user.student
        print('Request data:', request.data)  # Log incoming payload
        print('student:', request.user.student)  # Log incoming payload

        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError as e:
            print('Validation error:', e.detail)  # Log validation errors
            raise
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        print('User:', self.request.user)
        student = self.request.user.student
        print()
        question = serializer.validated_data['question']
        quiz = question.quiz
        print('Student:', student)
        print('Question:', question)
        print('Survey:', quiz)

        try:
            group_course = GroupCourse.objects.get(quiz=quiz)
            print('GroupCourse:', group_course)
        except GroupCourse.DoesNotExist:
            raise serializers.ValidationError("Survey is not linked to a valid course.")

        if student not in group_course.group.students.all():
            raise serializers.ValidationError("You are not a member of this group.")

        if not Subscription.objects.filter(student=student, teacher=group_course.teacher, is_active=True).exists():
            raise serializers.ValidationError("You need an active subscription to this teacher.")

        serializer.save(student=student)