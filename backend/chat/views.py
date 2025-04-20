from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from groups.models import Group
from .models import ChatMessage
from .serializer import ChatMessageSerializer
from .pagination import ChatCursorPagination

class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ChatCursorPagination  

    def get_queryset(self):
        group_id = self.request.query_params.get('group_id')
        if group_id:
            # Return non-pinned messages for pagination or all if no pinned distinction needed
            return ChatMessage.objects.filter(group_id=group_id)
        return ChatMessage.objects.all()
    
    def perform_create(self, serializer):
        group = Group.objects.get(id=self.request.data['group'])
        
        if self.request.user != group.admin.user and not group.students.filter(user=self.request.user).exists():
            raise PermissionDenied("You're not a member of this group.")

        is_pinned = self.request.data.get('is_pinned', False)
        if is_pinned and self.request.user != group.admin.user:
            raise PermissionDenied("Only the teacher can pin messages.")
        serializer.save(sender=self.request.user)

    def update(self, request, *args, **kwargs):
        message = self.get_object()
        group = message.group

        if 'is_pinned' in request.data:
            if request.user != group.admin.user:
                raise PermissionDenied("Only the teacher can update pin status.")

        return super().update(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        group_id = request.query_params.get('group_id')
        if not group_id:
            return super().list(request, *args, **kwargs)

        # Fetch all pinned messages for the group
        pinned_messages = ChatMessage.objects.filter(group_id=group_id, is_pinned=True)
        pinned_serializer = self.get_serializer(pinned_messages, many=True)

        # Get paginated messages
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # Combine pinned and paginated messages in the response
            return self.get_paginated_response({
                'pinned_messages': pinned_serializer.data,
                'paginated_messages': serializer.data
            })

        # Fallback for non-paginated case (unlikely with cursor pagination)
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'pinned_messages': pinned_serializer.data,
            'paginated_messages': serializer.data
        })