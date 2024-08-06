from django.db import models
from users.models import Student
from django.core.files.storage import FileSystemStorage
from users.models import StudentBranch, StudentClass


    
fs = FileSystemStorage(location="/media/material/")


class Course(models.Model):

    title = models.CharField(max_length=200)
    descitption = models.TextField()
    thumbnail = models.ImageField(upload_to='thumbnails/', null=True, blank=True)    
    course_class = models.CharField(
        max_length=50,
        choices = StudentClass.choices
        )
    course_branch =  models.CharField(
        max_length=50,
        choices = StudentBranch.choices
        )
    
    def __str__(self):
        return self.title
       


class Lesson(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=200)
    description = models.TextField()
    video = models.URLField()
    order = models.PositiveIntegerField() 

    
    def __str__(self):
        return self.title
    
class UserLessonProgress(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    is_finished = models.BooleanField(default=False)

    class Meta:
        unique_together = ('student', 'lesson')
    
    def __str__(self):
        return f'{self.student} - {self.lesson} - Finished: {self.is_finished}'


class Survey(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    question = models.TextField()
    answer = models.TextField()
    student_answer = models.TextField(null=True, blank=True)

    def is_correct(self):
        return self.student_answer == self.answer


    def __str__(self):
        return self.question
    