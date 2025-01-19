from rest_framework.pagination import LimitOffsetPagination

# Custom pagiation class for the GameData API to set default limit
class GameDataPagination(LimitOffsetPagination):
	default_limit = 10
	max_limit = 50