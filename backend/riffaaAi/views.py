import os
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import AIInteraction, UserToken
from .serializers import AIInteractionSerializer
import requests
import PyPDF2
import logging
import time
import json

logger = logging.getLogger(__name__)

class AIInteractionView(generics.CreateAPIView):
    serializer_class = AIInteractionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        """
        Override create to handle both text prompt and PDF file and ensure proper response
        """
        try:
            # Get the serializer and validate data
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Perform creation
            self.perform_create(serializer)
            
            # Get the created instance
            instance = serializer.instance
            
            # Return successful response with all data
            return Response({
                'id': str(instance.uuid),
                'prompt': instance.prompt,
                'response': instance.response,
                'tokens_used': instance.tokens_used,
                'created_at': instance.created_at,
                'success': True,
                'message': 'AI response generated successfully'
            }, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            logger.error(f"Validation error in AI interaction: {str(e)}")
            return Response(
                {"error": str(e.detail) if hasattr(e, 'detail') else str(e), "success": False},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Unexpected error in AI interaction: {str(e)}", exc_info=True)
            return Response(
                {"error": "An internal server error occurred. Please try again later.", "success": False},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_create(self, serializer):
        logger.info("Starting perform_create")
        user = self.request.user
        prompt = serializer.validated_data.get('prompt', '')
        pdf_file = self.request.FILES.get('pdf_file')

        logger.info(f"User: {user}, Prompt: {prompt}, PDF provided: {pdf_file is not None}")

        # Validate that at least one input is provided
        if not prompt and not pdf_file:
            logger.warning("Validation failed: No prompt or PDF file provided.")
            raise ValidationError("Either a prompt or PDF file must be provided.")

        try:
            user_token = UserToken.objects.get(user=user)
        except UserToken.DoesNotExist:
            user_token = UserToken.objects.create(user=user)
        logger.info(f"User tokens before: {user_token.tokens}")

        if user_token.tokens <= 0:
            logger.warning("Validation failed: User has no tokens left.")
            raise ValidationError("You have no tokens left.")

        pdf_text = ""
        if pdf_file:
            logger.info("Extracting text from PDF.")
            pdf_text = self.extract_pdf_text(pdf_file)
            logger.info("PDF text extracted.")

        # Combine prompt and PDF text
        combined_prompt = self.build_prompt(prompt, pdf_text)
        logger.info("Built combined prompt.")

        # Get AI response
        logger.info("Getting AI response.")
        response_text, tokens_used = self.get_ai_response(combined_prompt)
        logger.info(f"AI response received. Tokens used: {tokens_used}")

        # Update user tokens
        if tokens_used > user_token.tokens:
            logger.warning("Validation failed: Insufficient tokens.")
            raise ValidationError("Insufficient tokens for this request.")
            
        user_token.tokens -= tokens_used
        user_token.save()
        logger.info(f"User tokens updated. New balance: {user_token.tokens}")

        # Save the interaction and get the instance
        logger.info("Saving AIInteraction.")
        serializer.save(
            user=user, 
            response=response_text,
            tokens_used=tokens_used
        )
        logger.info("AIInteraction saved successfully.")

    def extract_pdf_text(self, pdf_file):
        """Extract text from PDF file with robust error handling"""
        if not pdf_file.name.lower().endswith('.pdf'):
            raise ValidationError("Only PDF files are allowed.")
        
        if pdf_file.size > 10 * 1024 * 1024:
            raise ValidationError("PDF file size must be less than 10MB.")

        pdf_text = ""
        try:
            # Ensure we're at the start of the file
            if hasattr(pdf_file, 'seekable') and pdf_file.seekable():
                pdf_file.seek(0)
                
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text and page_text.strip():
                        pdf_text += f"{page_text}\n"
                except Exception as page_error:
                    logger.warning(f"Error extracting text from page {page_num + 1}: {str(page_error)}")
                    continue
            
            if not pdf_text.strip():
                raise ValidationError("Could not extract text from PDF. The file might be scanned or image-based.")
                
        except PyPDF2.PdfReadError as e:
            raise ValidationError(f"Invalid PDF file: {str(e)}")
        except Exception as e:
            raise ValidationError(f"Error reading PDF file: {str(e)}")
        
        return pdf_text

    def build_prompt(self, prompt, pdf_text):
        """Build the combined prompt for the AI"""
        if prompt and pdf_text:
            return f"User Question: {prompt}\n\nPDF Content:\n{pdf_text}"
        elif pdf_text:
            return f"Please analyze this PDF content:\n\n{pdf_text}"
        else:
            return prompt

    def get_ai_response(self, prompt):
        """Get response from DeepSeek API with robust error handling"""
        DEEPSEEK_API_URL = getattr(settings, 'DEEPSEEK_API_URL', 'https://api.deepseek.com/v1/chat/completions')
        DEEPSEEK_API_KEY = getattr(settings, 'DEEPSEEK_API_KEY')
        
        if not DEEPSEEK_API_KEY:
            logger.error("DeepSeek API key is not configured")
            raise ValidationError("AI service is temporarily unavailable. Please contact support.")

        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "max_tokens": 2048,
            "temperature": 0.7
        }

        max_retries = 3
        base_delay = 2
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Attempting DeepSeek API request (attempt {attempt + 1})")
                
                # Use a simple requests call without complex session setup
                response = requests.post(
                    DEEPSEEK_API_URL, 
                    headers=headers, 
                    json=data, 
                    timeout=60
                )
                
                # Check for HTTP errors
                if response.status_code == 401:
                    logger.error("DeepSeek API authentication failed")
                    raise ValidationError("AI service configuration error. Please contact support.")
                elif response.status_code == 429:
                    logger.error("DeepSeek API rate limit exceeded")
                    raise ValidationError("AI service is busy. Please try again in a moment.")
                elif response.status_code >= 500:
                    logger.error(f"DeepSeek API server error: {response.status_code}")
                    if attempt == max_retries - 1:
                        raise ValidationError("AI service is temporarily unavailable. Please try again later.")
                    time.sleep(base_delay * (2 ** attempt))
                    continue
                
                response.raise_for_status()
                
                # Parse successful response
                response_data = response.json()
                
                # Extract response from DeepSeek API
                try:
                    response_text = response_data["choices"][0]["message"]["content"]
                    tokens_used = response_data["usage"]["total_tokens"]
                    logger.info(f"Successfully received AI response with {tokens_used} tokens")
                    return response_text, tokens_used
                except (KeyError, IndexError) as e:
                    logger.error(f"Unexpected API response format: {response_data}")
                    raise ValidationError("Received an unexpected response from AI service.")

            except requests.exceptions.Timeout:
                logger.error(f"DeepSeek API timeout (attempt {attempt + 1})")
                if attempt == max_retries - 1:
                    raise ValidationError("AI service request timed out. Please try again.")
                time.sleep(base_delay * (2 ** attempt))
                
            except requests.exceptions.ConnectionError as e:
                logger.error(f"DeepSeek API connection error (attempt {attempt + 1}): {str(e)}")
                if attempt == max_retries - 1:
                    raise ValidationError("Unable to connect to AI service. Please check your internet connection and try again.")
                time.sleep(base_delay * (2 ** attempt))
                
            except requests.exceptions.RequestException as e:
                logger.error(f"DeepSeek API request failed (attempt {attempt + 1}): {str(e)}")
                if attempt == max_retries - 1:
                    raise ValidationError("AI service temporarily unavailable. Please try again later.")
                time.sleep(base_delay * (2 ** attempt))
                
            except ValidationError:
                raise
            except Exception as e:
                logger.error(f"Unexpected error during AI processing (attempt {attempt + 1}): {str(e)}")
                if attempt == max_retries - 1:
                    raise ValidationError("An unexpected error occurred. Please try again later.")
                time.sleep(base_delay * (2 ** attempt))
        
        raise ValidationError("Failed to get response from AI service after multiple attempts.")