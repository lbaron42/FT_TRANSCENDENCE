from channels.generic.websocket import AsyncWebsocketConsumer
import json
import httpx
import random
# import logging
# logger = logging.getLogger(__name__)

class PlayerSlots:
    def __init__(self):
        self.p1 = None
        self.p2 = None
        self.p3 = None
        self.p4 = None
    def reset(self):
        self.p1 = None
        self.p2 = None
        self.p3 = None
        self.p4 = None

class PlayerSlotsRound2:
    def __init__(self):
        self.p1 = None
        self.p2 = None
        self.p3 = None
        self.p4 = None
    def reset(self):
        self.p1 = None
        self.p2 = None
        self.p3 = None
        self.p4 = None

class LobbySession:
    def __init__(self):
        self.enable_start = True
        self.enable_game3 = True
        self.player_names = {}
        self.player_ready = []
        self.players = PlayerSlots()
        self.players2 = PlayerSlotsRound2()


class TournamentConsumer(AsyncWebsocketConsumer):

    LobbySessions = {}

	################## CONNECT ##################

    async def connect(self):
        self.lobby_id = self.scope['url_route']['kwargs']['lobby_id']
        self.user_name = self.scope["url_route"]["kwargs"]["user_name"]
        query_string = self.scope["query_string"].decode()
        query_params = dict(qc.split("=") for qc in query_string.split("&") if "=" in qc)
        self.token = query_params.get("token")

        self.lobby_group_name = f"lobby_{self.lobby_id}"
        self.cookies = self.scope.get('cookies', {})
        self.csrf_token = self.cookies.get('csrftoken', None)
        self.lobby_session = None
        self.roles = {"p1": None, "p2": None, "p3": None, "p4": None}

        if self.token:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "http://userdata:8004/user-api/profile/",
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {self.token}',
						'X-CSRFToken': self.csrf_token,
                    },
                    cookies=self.cookies,
                )
                if response.status_code != 200:
                    await self.close(code=4001)
                    return
        else:
            await self.close(code=4001)
            return
        
        await self.channel_layer.group_add(
            self.lobby_group_name,
            self.channel_name
        )   
        await self.accept()

	################## RECEIVE ##################

    async def receive(self, text_data):
        # Handle messages from the WebSocket
        data = json.loads(text_data)
        action = data.get('action')
        if action == 'player_joined':
            if self.lobby_group_name not in self.LobbySessions:
                self.LobbySessions[self.lobby_group_name] = LobbySession()
            self.lobby_session = self.LobbySessions[self.lobby_group_name]
            player_joined_success = await self.player_joined()

            if player_joined_success:
                self.lobby_session.player_names[self.user_name] = self.channel_name
                await self.channel_layer.group_send(
                self.lobby_group_name,
                {
                    'type': 'send_update_players',
                    'player_names' : self.lobby_session.player_names
                }
                )
            else:
                await self.disconnect(4001)

        elif action == 'restart_tournament':
            self.lobby_session.players.reset()
            self.lobby_session.players2.reset()
            self.lobby_session.enable_game3 = True
            self.assign_roles()
            await self.start_tournament()

        elif action == 'start_tournament':
            self.lobby_session.enable_start = False
            await self.start_tournament()

        elif action == 'start_1':
            await self.send_2players(
                self.lobby_session.player_names.get(self.lobby_session.players.p1),
                self.lobby_session.players.p1,
                self.lobby_session.player_names.get(self.lobby_session.players.p2),
                self.lobby_session.players.p2,
                'start_1'
                )
            await self.send_2players(
                self.lobby_session.player_names.get(self.lobby_session.players.p3),
                self.lobby_session.players.p3,
                self.lobby_session.player_names.get(self.lobby_session.players.p4),
                self.lobby_session.players.p4,
                'game_1_ongoing'
                )
        elif action == 'start_2':
            await self.send_2players(
                self.lobby_session.player_names.get(self.lobby_session.players.p3),
                self.lobby_session.players.p3,
                self.lobby_session.player_names.get(self.lobby_session.players.p4), 
                self.lobby_session.players.p4,
                'start_2'
                )
            await self.send_2players(
                self.lobby_session.player_names.get(self.lobby_session.players.p1),
                self.lobby_session.players.p1,
                self.lobby_session.player_names.get(self.lobby_session.players.p2), 
                self.lobby_session.players.p2,
                'game_2_ongoing'
                )
        elif action == 'start_3':
            await self.send_2players(
                self.lobby_session.player_names.get(self.lobby_session.players2.p1),
                self.lobby_session.players2.p1,
                self.lobby_session.player_names.get(self.lobby_session.players2.p2), 
                self.lobby_session.players2.p2,
                'start_3'
                )
            await self.send_2players(
                self.lobby_session.player_names.get(self.lobby_session.players2.p3),
                self.lobby_session.players2.p3,
                self.lobby_session.player_names.get(self.lobby_session.players2.p4), 
                self.lobby_session.players2.p4,
                'game_3_ongoing'
                )
        elif action == 'game_end':
            game_id = data.get('game')
            winner = data.get('winner')
            if game_id == 'game_1':
                if winner == 'p1':
                    self.lobby_session.players2.p1 = self.lobby_session.players.p1
                    self.lobby_session.players2.p3 = self.lobby_session.players.p2
                else:
                    self.lobby_session.players2.p1 = self.lobby_session.players.p2
                    self.lobby_session.players2.p3 = self.lobby_session.players.p1
                await self.channel_layer.group_send(
                self.lobby_group_name,
                {
                    'type': 'send_p1_round2',
                    'p1_round2' : self.lobby_session.players2.p1,
                    'p3_round2' : self.lobby_session.players2.p3,
                }
                )
                await self.send_2players(
                self.lobby_session.player_names.get(self.lobby_session.players.p3),
                self.lobby_session.players.p3,
                self.lobby_session.player_names.get(self.lobby_session.players.p4), 
                self.lobby_session.players.p4,
                'enable_start_2'
                )
            elif game_id == 'game_2':
                if winner == 'p1':
                    self.lobby_session.players2.p2 = self.lobby_session.players.p3
                    self.lobby_session.players2.p4 = self.lobby_session.players.p4
                else:
                    self.lobby_session.players2.p2 = self.lobby_session.players.p4
                    self.lobby_session.players2.p4 = self.lobby_session.players.p3
                await self.channel_layer.group_send(
                self.lobby_group_name,
                {
                    'type': 'send_p2_round2',
                    'p2_round2' : self.lobby_session.players2.p2,
                    'p4_round2' : self.lobby_session.players2.p4,
                }
                )
            elif game_id == 'game_3':
                final_winner = self.lobby_session.players2.p1
                if winner == 'p2':
                    final_winner = self.lobby_session.players2.p2
                await self.channel_layer.group_send(
                self.lobby_group_name,
                {
                    'type': 'send_winner',
                    'winner' : final_winner,
                }
                )


        if (self.lobby_session.players2.p1 is not None and self.lobby_session.players2.p2 is not None and self.lobby_session.enable_game3):
            self.lobby_session.enable_game3 = False
            await self.send_2players(
                self.lobby_session.player_names.get(self.lobby_session.players2.p1), 
                self.lobby_session.players2.p1,
                self.lobby_session.player_names.get(self.lobby_session.players2.p2), 
                self.lobby_session.players2.p2,
                'enable_start_3'
                )


        if len(self.lobby_session.player_names) == 4 and self.lobby_session.enable_start:
            self.assign_roles()
            await self.channel_layer.group_send(
                self.lobby_group_name,
                {
                    'type': 'enable_tournament_button',
                    'message' : 'tournament button enabled',
                }
            )
        elif len(self.lobby_session.player_names) == 4 and self.lobby_session.enable_start:
            await self.channel_layer.group_send(
                self.lobby_group_name,
                {
                    'type': 'enable_reset_button',
                    'message' : 'tournament reset button enabled',
                }
            )
    
        else :
            await self.channel_layer.group_send(
                self.lobby_group_name,
                {
                    'type': 'disable_tournament_button',
                    'message' : 'tournament button disabled'
                }
            )


    def assign_roles(self):
        player_list = list(self.lobby_session.player_names.keys())
        random.shuffle(player_list)        
        self.lobby_session.players.p1 = player_list[0]
        self.lobby_session.players.p2 = player_list[1]
        self.lobby_session.players.p3 = player_list[2]
        self.lobby_session.players.p4 = player_list[3]

    def get_assigned_roles(self):
        return {
            'p1': self.lobby_session.players.p1,
            'p2': self.lobby_session.players.p2,
            'p3': self.lobby_session.players.p3,
            'p4': self.lobby_session.players.p4,
        }
    
    async def start_tournament(self):
        await self.channel_layer.group_send(
            self.lobby_group_name,
            {
                'type': 'send_start_tournament',
                'roles' : self.get_assigned_roles(),
            }
        )
        await self.send_2players(
            self.lobby_session.player_names.get(self.lobby_session.players.p1), 
            self.lobby_session.players.p1,
            self.lobby_session.player_names.get(self.lobby_session.players.p2), 
            self.lobby_session.players.p2,
            'enable_start_1'
        )
        # await self.send_2players(
        #     self.lobby_session.player_names.get(self.lobby_session.players.p3),
        #     self.lobby_session.players.p3,
        #     self.lobby_session.player_names.get(self.lobby_session.players.p4), 
        #     self.lobby_session.players.p4,
        #     'enable_start_2'
        # )
    
    async def send_start_tournament(self, event):
        await self.send(text_data=json.dumps({
            'type': 'start_tournament',
            'roles': event['roles']
        }))

    async def send_2players(self, player1, p1_name, player2, p2_name, event_type):
        if player1:
            await self.channel_layer.send(
                player1,
                {
                    'type': event_type,
                    'roles' : {
                        'p1' : p1_name,
                        'p2' : p2_name,
                    },
                }
            )
        if player2:
            await self.channel_layer.send(
                player2,
                {
                    'type': event_type,
                    'roles' : {
                        'p1' : p1_name,
                        'p2' : p2_name,
                    },
                }
            )

    async def send_winner(self, event):
        await self.send(text_data=json.dumps({
            'type': 'winner',
            'winner' : event['winner']
        })) 

    async def send_p1_round2(self, event):
        await self.send(text_data=json.dumps({
            'type': 'p1_round2',
            'p1_round2' : event['p1_round2'],
            'p3_round2' : event['p3_round2']
        }))  

    async def send_p2_round2(self, event):
        await self.send(text_data=json.dumps({
            'type': 'p2_round2',
            'p2_round2' : event['p2_round2'],
            'p4_round2' : event['p4_round2']
        }))  

    async def send_update_players(self, event):
        await self.send(text_data=json.dumps({
            'type': 'update_players',
            'player_names' : event['player_names']
        }))   

    async def send_player_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'player_left',
            'player_names' : event['player_names']
        }))              

    async def enable_tournament_button(self, event):
        await self.send(text_data=json.dumps({
            'type': 'enable_tournament_button',
            'message' : event['message']
        }))

    async def disable_tournament_button(self, event):
        await self.send(text_data=json.dumps({
            'type': 'disable_tournament_button',
            'message' : event['message']
        }))

    async def enable_start_1(self, event):
        await self.send(text_data=json.dumps({
            "type": "enable_start_1",
            "roles": event["roles"]
        }))

    async def enable_start_2(self, event):
        await self.send(text_data=json.dumps({
            "type": "enable_start_2",
            "roles": event["roles"]
        }))

    async def enable_start_3(self, event):
        await self.send(text_data=json.dumps({
            "type": "enable_start_3",
            "roles": event["roles"]
        }))

    async def start_1(self, event):
        await self.send(text_data=json.dumps({
            "type": "start_1",
            "roles": event["roles"]
        }))

    async def start_2(self, event):
        await self.send(text_data=json.dumps({
            "type": "start_2",
            "roles": event["roles"]
        }))

    async def start_3(self, event):
        await self.send(text_data=json.dumps({
            "type": "start_3",
            "roles": event["roles"]
        }))

    async def game_1_ongoing(self, event):
        await self.send(text_data=json.dumps({
            "type": "game_1_ongoing",
            "roles": event["roles"]
        }))

    async def game_2_ongoing(self, event):
        await self.send(text_data=json.dumps({
            "type": "game_2_ongoing",
            "roles": event["roles"]
        }))

    async def game_3_ongoing(self, event):
        await self.send(text_data=json.dumps({
            "type": "game_3_ongoing",
            "roles": event["roles"]
        }))

    async def player_joined(self):
        url = f"http://lobby_api:8002/lobby/player_joined/{self.lobby_id}/{self.user_name}/"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data={'key': 'value'})
            if response.status_code != 200:
                return False
            return True


	################## DISCONNECT ##################

    async def disconnect(self, close_code):
        if self.lobby_session is not None:
            if await self.player_left() == 0:
                await self.delete_lobby_entry()

        await self.channel_layer.group_discard(
            self.lobby_group_name,
            self.channel_name
        )

    async def player_left(self):
        url = f"http://lobby_api:8002/lobby/player_left/{self.lobby_id}/{self.user_name}/"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data={'key': 'value'})
            if response.status_code != 200:
                print(f"Failed to leave lobby {self.lobby_id}: {response.text}")
                return
            
            data = response.json()
            self.lobby_session.players.reset()
            self.lobby_session.players2.reset()
            self.lobby_session.enable_game3 = True
            self.lobby_session.enable_start = True
            del self.lobby_session.player_names[self.user_name]
            # await self.channel_layer.group_send(
            #     self.lobby_group_name,
            #     {
            #         'type': 'send_update_players',
            #         'player_names' : self.lobby_session.player_names
            #     }
            # )
            await self.channel_layer.group_send(
                self.lobby_group_name,
                {
                    'type': 'send_player_left',
                    'player_names' : self.lobby_session.player_names
                }
            )
            return data.get('cur_player')


    async def delete_lobby_entry(self):
        url = f"http://lobby_api:8002/lobby/delete/{self.lobby_id}/"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                    url,
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {self.token}',
						'X-CSRFToken': self.csrf_token,
                    },
                    cookies=self.cookies,
                )
            if response.status_code != 200:
                print(f"Failed to delete lobby {self.lobby_id}: {response.text}")
                return

