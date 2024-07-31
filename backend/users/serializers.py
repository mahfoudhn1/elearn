from rest_framework import serializers
from .models import User, Student, Teacher, Grade, Speciality, Module
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role']

class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model= Module
        fields = ['id', 'name']

class SpecialitySerializer(serializers.ModelSerializer):
    class Meta:
        model= Speciality
        fields = ['id', 'name']

class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model= Grade
        fields = ['id', 'name']

class TeacherSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many = True)
    grades = GradeSerializer(many = True)
    specialities = SpecialitySerializer(many = True)

    class Meta:
        model = Teacher
        fields = ["id","user","profile_privet","modules","grades","specialities","created_at","updated_at"]
    
    def create(self, validated_data):
            user = self.context['request'].user
            teacher = Teacher.objects.create(user=user, **validated_data)
            return teacher

class StudentSerializer(serializers.ModelSerializer):
    grade = GradeSerializer()

    class Meta:
        model = Student
        fields = ['id', 'user', 'grade']

    def create(self, validated_data):
        grade_data = validated_data.pop('grade')
        grade = Grade.objects.get_or_create(**grade_data)[0]
        student = Student.objects.create(grade=grade, **validated_data)
        return student
    
    def update(self, instance, validated_data):
        grade_data = validated_data.pop('grade')
        grade = Grade.objects.get_or_create(**grade_data)[0]
        instance.grade = grade
        instance.save()
        return instance
    

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True, help_text="Confirm your password")
    role = serializers.ChoiceField(choices=get_user_model().ROLE_CHOICE)

    class Meta:
        model = get_user_model()
        fields = ('username', 'email', 'password', 'password2', 'role')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Passwords must match."})
        return data
    
    def create(self, validated_data):
        user = get_user_model().objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data['role']
        )

        return user
    
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only = True)
    token = serializers.SerializerMethodField()

    def get_token(self, obj):
        user = User.objects.get(username=obj['username'])
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

    def validate(self, data):
        username = data.get('username')
        password = data.get('password')

        if username and password:
            user = authenticate(username=username, password=password)
            
            if user:
                data['user'] = user
            else:
                raise serializers.ValidationError("Invalid credentials")
        else:
            raise serializers.ValidationError("Both username and password are required")

        return data