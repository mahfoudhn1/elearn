from rest_framework import serializers
from .models import FieldOfStudy, Grade, Payment, User, Student, Teacher
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

class AuthSerializer(serializers.Serializer):
    code = serializers.CharField(required=False)
    error = serializers.CharField(required=False)

    
class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', "first_name" ,"last_name",'role', 'avatar_url', 'avatar_file', 'avatar']


    def get_avatar(self, obj):
        return obj.get_avatar()

class fieldofstudySerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldOfStudy
        fields = ['id', 'name' ]

class gradeSerializer(serializers.ModelSerializer):
    
    school_level = serializers.StringRelatedField()
    class Meta:
        model = Grade
        fields = ['id', 'name', 'school_level' ]
        
class TeacherSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = Teacher
        fields = ["id","user","price",'bio', "phone_number","profession" ,"degree" ,"university", "profile_privet","teaching_level","teaching_subjects","wilaya","created_at","updated_at"]
        read_only_fields = ['user']
    
    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user

        teacher = Teacher.objects.create(user=user, **validated_data)

        return teacher
    
class StudentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)  # Read-only for responses
    
    # Read-only nested representations for responses
    grade = gradeSerializer(read_only=True)
    field_of_study = fieldofstudySerializer(read_only=True)

    # Write-only ID fields for creation/updates
    grade_id = serializers.PrimaryKeyRelatedField(
        queryset=Grade.objects.all(),
        source="grade",  # Links to the `grade` field in the model
        write_only=True,
        required=False,  # Optional
        allow_null=True  # Allows null values
    )
    field_of_study_id = serializers.PrimaryKeyRelatedField(
        queryset=FieldOfStudy.objects.all(),
        source="field_of_study",  # Links to the `field_of_study` field in the model
        write_only=True,
        required=False,  # Optional
        allow_null=True  # Allows null values
    )

    class Meta:
        model = Student
        fields = [
            'id', 'user', 'wilaya', 
            'grade', 'grade_id',  # grade is read-only, grade_id is write-only
            'field_of_study', 'field_of_study_id',  # field_of_study is read-only, field_of_study_id is write-only
            'phone_number'
        ]
        read_only_fields = ['id', 'user']  # Ensure `id` and `user` are read-only

    def create(self, validated_data):
        # Get the request object from the context
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("No user found in the request context.")

        validated_data['user'] = request.user
        student = Student.objects.create(**validated_data)
        return student
    

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True, help_text="Confirm your password")
    role = serializers.ChoiceField(choices=get_user_model().ROLE_CHOICE, required=False, allow_null=True)

    class Meta:
        model = get_user_model()
        fields = ('username', "first_name", "last_name", 'email', 'password', 'password2', 'role', 'avatar_url', 'avatar_file')
        extra_kwargs = {
            'email': {'validators': []},  # We'll handle validation manually
            'username': {'validators': []}
        }

    def validate_email(self, value):
        # Check for duplicate email during updates or creations
        if self.instance and User.objects.filter(email=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        elif not self.instance and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        # Check for duplicate username during updates or creations
        if self.instance:  # For updates
            if User.objects.filter(username=value).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("A user with this username already exists.")
        else:  # For creates
            if User.objects.filter(username=value).exists():
                raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate(self, data):
        # Ensure the passwords match
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Passwords must match."})
        return data
    
    def create(self, validated_data):
        # Extract the role from validated data (None if not provided)
        role = validated_data.get('role', None)
        
        # Handle avatar_file if it exists, otherwise set to None
        avatar_file = validated_data.get('avatar_file', None)

        # Create the user
        user = get_user_model().objects.create_user(
            username=validated_data['username'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            email=validated_data['email'],
            password=validated_data['password'],
            avatar_file=avatar_file,
            role=role  # Role can be None if not provided
        )

        # Return the created user object
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

        if not username or not password:
            raise serializers.ValidationError("Both username and password are required")

        user = authenticate(username=username, password=password)

        if user is None:
            raise serializers.ValidationError("Invalid credentials")

        # if not user.email_verified:  
        #     raise serializers.ValidationError("Your email is not verified. Please verify your email.")

        data['user'] = user 
        return data

    
class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['teacher', 'current_balance', 'total_earned']