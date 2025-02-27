from django.http import JsonResponse
from django.shortcuts import render
from django.db import IntegrityError
from .models import Lobby
import requests

# import logging
# logger = logging.getLogger(__name__)

def create_lobby(request):
    if request.method == 'POST':
        name = request.POST.get('lobby-name')
        score = request.POST.get('score')
        tournament = request.POST.get('tornament-mode')
        tournament_mode = tournament is not None
        pac_pong = request.POST.get('pong-mode') == '1'
        mode = int(request.POST.get('mode'))
        cur_player = 0
        if (pac_pong and mode is not 1):
            mode = 3
        elif(tournament_mode):
            mode = 4
        auth_response = requests.get(
            "http://userdata:8004/user-api/profile/",
            headers = {
                'Content-Type': 'application/json',
                'Authorization': request.headers.get('Authorization'),
            },
            cookies=request.COOKIES
        )

        if auth_response.status_code != 200:
            return JsonResponse({'error': 'Unauthorized user'}, status=401)
        
        try:
            lobby = Lobby(
                name=name,
                max_score=score,
                max_player_count=mode,
                current_player_count=cur_player,
                tournament_mode=tournament_mode,
                pac_pong=pac_pong
                )
            lobby.save()

            return JsonResponse(
                {'message': 'Lobby created successfully!', 'lobby': lobby.id, 'lobby_name': lobby.name, 'max_score': lobby.max_score, 'cur_player': lobby.current_player_count, 'max_player_count': lobby.max_player_count, 'pac_pong': lobby.pac_pong, 'tournament_mode': lobby.tournament_mode}, 
                status=201
            )        
        except IntegrityError:
            return JsonResponse(
            {'error': 'A lobby with this name already exists.'}, 
            status=400
            )

    return JsonResponse(
        {'error': 'Invalid request method. Only POST is allowed.'}, 
        status=405
    )

def get_lobby(request, lobby_id):
    if request.method == 'GET':
        try:
            lobby = Lobby.objects.get(id=lobby_id)
            # Return detailed information about the lobby
            lobby_data = {
                'id': lobby.id,
                'name': lobby.name,
                'current_player_count': lobby.current_player_count,
                'max_player_count': lobby.max_player_count,
                'p1': lobby.p1,
                'p2': lobby.p2,
                'max_score': lobby.max_score,
                'tournament_mode': lobby.tournament_mode,
                'pac_pong': lobby.pac_pong,
            }
            return JsonResponse({'message': 'Lobby retrieved successfully', 'lobby': lobby_data}, status=200)
        except Lobby.DoesNotExist:
            return JsonResponse({'error': 'Lobby not found'}, status=404)
    return JsonResponse({'error': 'Invalid HTTP method'}, status=405)

    


def all(request):
    if request.method == 'GET':
        lobbies = Lobby.objects.all()

        lobby_list = []
        for lobby in lobbies:
            lobby_list.append({
                'id': lobby.id,
                'name': lobby.name,
                'current_player_count': lobby.current_player_count,
                'max_player_count': lobby.max_player_count,
                'p1': lobby.p1,
                'p2': lobby.p2,
                'max_score': lobby.max_score,
                'tournament_mode': lobby.tournament_mode,
                'pac_pong': lobby.pac_pong,
            })
        return JsonResponse(lobby_list, safe=False)
    
    return JsonResponse(
        {'error': 'Invalid request method. Only GET is allowed.'}, 
        status=405
    )

def player_joined(request, lobby_id, user_name):
    if request.method == "POST":
        try:
            lobby = Lobby.objects.get(id=lobby_id)
            if user_name in lobby.in_lobby:
                return JsonResponse({'error': f'User {user_name} is already in the lobby {lobby_id}'}, status=400)
            if lobby.current_player_count == lobby.max_player_count:
                return JsonResponse({'error': f'Lobby full'}, status=400)
            lobby.current_player_count += 1
            lobby.in_lobby = lobby.in_lobby + [user_name] 
            lobby.save()
            return JsonResponse({'message': f'Player joined lobby {lobby_id}'}, status=200)
        except Lobby.DoesNotExist:
            return JsonResponse({'error': 'Lobby not found'}, status=404)
    return JsonResponse({'error': 'Invalid method'}, status=405)

def player_left(request, lobby_id, user_name):
    if request.method == "POST":
        try:
            lobby = Lobby.objects.get(id=lobby_id)
            lobby.current_player_count -= 1
            lobby.in_lobby.remove(user_name)
            if lobby.p1 == user_name:
                lobby.p1 = None
            if lobby.p2 == user_name:
                lobby.p2 = None
            if lobby.p3 == user_name:
                lobby.p3 = None
            lobby.save()
            return JsonResponse({
            'roles': {
                'p1': f'{lobby.p1}',
                'p2': f'{lobby.p2}',
                'p3': f'{lobby.p3}' 
            },
            'cur_player': lobby.current_player_count
            }, status=200)
        except Lobby.DoesNotExist:
            return JsonResponse({'error': 'Lobby not found'}, status=404)
    return JsonResponse({'error': 'Invalid method'}, status=405)

def delete_lobby_entry(request, lobby_id):
    if request.method == "POST":
        auth_response = requests.get(
            "http://userdata:8004/user-api/profile/",
            headers = {
                'Content-Type': 'application/json',
                'Authorization': request.headers.get('Authorization'),
            },
            cookies=request.COOKIES
        )
        if auth_response.status_code != 200:
            return JsonResponse({'error': 'Unauthorized user'}, status=401)

        try:
            lobby = Lobby.objects.get(id=lobby_id)
            lobby.delete()  # Delete the lobby from the database
            return JsonResponse({'message': f'Lobby {lobby_id} deleted'}, status=200)
        except Lobby.DoesNotExist:
            return JsonResponse({'error': 'Lobby not found'}, status=404)
    return JsonResponse({'error': 'Invalid method'}, status=405)

def select_player(request, player, lobby_id, user_name):
    if request.method == "POST" and player in ('p1', 'p2', 'p3'):
        try:
            lobby = Lobby.objects.get(id=lobby_id)
        except Lobby.DoesNotExist:
            return JsonResponse({'error': 'Lobby not found'}, status=404)
        if player == 'p1':
            if lobby.p2 == user_name:
                lobby.p2 = None
            elif lobby.p3 == user_name:
                lobby.p3 = None
        elif player == 'p2':
            if lobby.p1 == user_name:
                lobby.p1 = None
            elif lobby.p3 == user_name:
                lobby.p3 = None
        elif player == 'p3':
            if lobby.p1 == user_name:
                lobby.p1 = None
            elif lobby.p2 == user_name:
                lobby.p2 = None
        setattr(lobby, player, user_name)
        lobby.save()
        return JsonResponse({'p1': f'{lobby.p1}', 'p2': f'{lobby.p2}', 'p3': f'{lobby.p3}'}, status=200)
    return JsonResponse({'error': 'Invalid method or player'}, status=405)


def desselect_player(request, player, lobby_id):
    if request.method == "POST" and player in ('p1', 'p2', 'p3'):
        try:
            lobby = Lobby.objects.get(id=lobby_id)
        except Lobby.DoesNotExist:
            return JsonResponse({'error': 'Lobby not found'}, status=404)
        setattr(lobby, player, "None")
        lobby.save()
        return JsonResponse({'p1': f'{lobby.p1}', 'p2': f'{lobby.p2}', 'p3': f'{lobby.p3}'}, status=200)
    return JsonResponse({'error': 'Invalid method or player'}, status=405)

def get_players(request, lobby_id):
    if request.method == "GET":
        try:
            lobby = Lobby.objects.get(id=lobby_id)
            return JsonResponse({'p1': f'{lobby.p1}', 'p2': f'{lobby.p2}', 'p3': f'{lobby.p3}'}, status=200)
        except Lobby.DoesNotExist:
            return JsonResponse({'error': 'Lobby not found'}, status=404)
    return JsonResponse({'error': 'Invalid method'}, status=405)