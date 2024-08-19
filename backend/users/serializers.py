from rest_framework import serializers
from .models import User, Student, Teacher
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

class AuthSerializer(serializers.Serializer):
    code = serializers.CharField(required=False)
    error = serializers.CharField(required=False)

    
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', "first_name" ,"last_name",'role']



class TeacherSerializer(serializers.ModelSerializer):

    class Meta:
        model = Teacher
        fields = ["id","user","price", "phone_number","avatar","profession" ,"degree" ,"university", "profile_privet","teaching_level","teaching_subjects","wilaya","created_at","updated_at"]
        read_only_fields = ['user']
    
    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user

        teacher = Teacher.objects.create(user=user, **validated_data)

        return teacher
    
    def update(self, instance, validated_data):


        instance.profile_privet = validated_data.get('profile_privet', instance.profile_privet)
        instance.save()

        return instance

class StudentSerializer(serializers.ModelSerializer):


    class Meta:
        model = Student
        fields = ['id', 'user',"avatar", "wilaya","school_level", "hightschool_speciality", "phone_number"]
        read_only_fields = ['user']

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user


        student = Student.objects.create(user=user, **validated_data)

        return student

    def update(self, instance, validated_data):

        instance.save()
        return instance
    

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True, help_text="Confirm your password")
    role = serializers.ChoiceField(choices=get_user_model().ROLE_CHOICE)

    class Meta:
        model = get_user_model()
        fields = ('username',"first_name","last_name", 'email', 'password', 'password2', 'role')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Passwords must match."})
        return data
    
    def create(self, validated_data):
        user = get_user_model().objects.create_user(
            username=validated_data['username'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
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
    
