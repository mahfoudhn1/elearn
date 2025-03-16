from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from users.serializers import PaymentSerializer
from users.models import Payment

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'teacher'):
            return Payment.objects.filter(teacher=user.teacher)
        return Payment.objects.none()

    @action(detail=False, methods=['get'])
    def monthly_earnings(self, request):
        user = request.user
        if not hasattr(user, 'teacher'):
            return Response({'error': 'Only teachers can view earnings'}, status=status.HTTP_403_FORBIDDEN)

        payment = Payment.objects.get(teacher=user.teacher)
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))
        
        monthly = payment.monthly_earnings(year, month)
        return Response({
            'teacher': user.teacher.name,
            'year': year,
            'month': month,
            'monthly_earnings': monthly,
            'current_balance': payment.current_balance,
            'total_earned': payment.total_earned
        })