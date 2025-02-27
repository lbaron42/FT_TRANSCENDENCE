import logging
from rest_framework import generics
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
from .serializers import GameDataSerializer
from .models import GameData
from user_management.models import Profile
from rest_framework import status
from app.paginations import GameDataPagination

# from django.utils.decorators import method_decorator
# from django.views.decorators.csrf import csrf_exempt

logger = logger = logging.getLogger('django')

class MicroserviceTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        token = request.headers.get('Microservice-Token')
        if not token:
            return None
        expected_token = getattr(settings, "MICROSERVICE_SECRET_TOKEN", None)
        if not expected_token or token != expected_token:
            raise AuthenticationFailed('No permission to access API')
        return (None, None)

# @method_decorator(csrf_exempt, name='dispatch')
class GameDataCreate(generics.CreateAPIView):
    queryset = GameData.objects.all()
    serializer_class = GameDataSerializer
    authentication_classes = [MicroserviceTokenAuthentication]
    permission_classes = []
#
#     def dispatch(self, request, *args, **kwargs):
#         logger.info(f"Received request at {request.path} with method {request.method}")
#         logger.info(f"Headers: {dict(request.headers)}")
# 
#         try:
#             body = request.body.decode("utf-8")
#             logger.info(f"Request Body: {body}")
#         except Exception as e:
#             logger.warning(f"Failed to read request body: {e}")
# 
#         return super().dispatch(request, *args, **kwargs)

class GameDataList(generics.ListAPIView):
	queryset = GameData.objects.all()
	serializer_class = GameDataSerializer
	pagination_class = GameDataPagination
	
class GameUserHistory(generics.ListAPIView):
	queryset = GameData.objects.all()
	serializer_class = GameDataSerializer
	pagination_class = GameDataPagination
	
	def get_queryset(self):
		user = self.request.user
		if not user.is_authenticated:
			return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
		try:
			profile = Profile.objects.get(user=user)
		except Profile.DoesNotExist:
			return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
		queryset = GameData.objects.filter(players=profile)
		gameMode = self.request.query_params.get('gameMode')
		if gameMode is not None:
			queryset = queryset.filter(gameMode=gameMode)

		logger.info(f"The game data will be provided with {queryset.count()} games")
		return queryset
	