from channels.generic.websocket import AsyncWebsocketConsumer
import json
import httpx
import logging
logger = logging.getLogger(__name__)

class LobbyConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.lobby_id = self.scope['url_route']['kwargs']['lobby_id']
        self.pac_pong = self.scope['url_route']['kwargs']['pac_pong']
        self.user_name = self.scope["url_route"]["kwargs"]["user_name"]
        query_string = self.scope["query_string"].decode()
        query_params = dict(qc.split("=") for qc in query_string.split("&") if "=" in qc)
        self.token = query_params.get("token")

        self.lobby_group_name = f"lobby_{self.lobby_id}"
        self.roles = {"p1": None, "p2": None, "p3": None}

        self.cookies = self.scope.get('cookies', {})
        self.csrf_token = self.cookies.get('csrftoken', None)
        self.lobby_session = None

        if self.token:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "http://userdata:8004/user-api/profile/",
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {self.token}',
                    },
                    cookies=self.cookies,
                )
                if response.status_code != 200:
                    await self.close(code=4001)
                    return
        else:
            await self.close(code=4001)
            return

        player_joined_success = await self.player_joined()
        if player_joined_success:
            await self.channel_layer.group_add(
                self.lobby_group_name,
                self.channel_name
            )
            await self.accept()
        else:
            await self.close(code=4001)

	################## DISCONNECT ##################

    async def disconnect(self, close_code):

        logger.debug("close_code:")
        logger.debug(close_code)
        if close_code != 4001 and close_code != 1006:
            if await self.player_left() == 0:
                await self.delete_lobby_entry()
            else:
                await self.channel_layer.group_send(
                    self.lobby_group_name,
                    {
                        'type': 'disable_start_button',
                        'message' : 'start button disabled'
                    }
                )

            await self.channel_layer.group_discard(
                self.lobby_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        # Handle messages from the WebSocket
        data = json.loads(text_data)
        action = data.get('action')

        if action == 'p1_select':
            await self.assign_role('p1')
        elif action == 'p1_deselect':
            await self.unassign_role('p1')
        elif action == 'p2_select':
            await self.assign_role('p2')
        elif action == 'p2_deselect':
            await self.unassign_role('p2')
        elif action == 'p3_select':
            await self.assign_role('p3')
        elif action == 'p3_deselect':
            await self.unassign_role('p3')
        elif action == 'init_player_roles':
            await self.init_player_roles()
        elif action == 'start_game':
            await self.channel_layer.group_send(
                self.lobby_group_name,
                {
                    'type': 'start_game',
                    'message': 'ok'
                }
            )

        if (self.pac_pong == 'false' or (self.pac_pong == 'true' and self.roles['p3'] != "None")) and self.roles['p1'] != "None" and self.roles['p2'] != "None":
            await self.channel_layer.group_send(
                self.lobby_group_name,
                {
                    'type': 'enable_start_button',
                    'message' : 'start button enabled'
                }
            )
        else:
            await self.channel_layer.group_send(
                self.lobby_group_name,
                {
                    'type': 'disable_start_button',
                    'message' : 'start button disabled'
                }
            )
            

    async def start_game(self, event):
        await self.send(text_data=json.dumps({
            'type': 'start_game',
            'message': event['message']
        }))

    async def enable_start_button(self, event):
        await self.send(text_data=json.dumps({
            'type': 'enable_start_button',
            'message' : event['message']
        }))

    async def disable_start_button(self, event):
        await self.send(text_data=json.dumps({
            'type': 'disable_start_button',
            'message' : event['message']
        }))

    async def assign_role(self, role):
        url = f"http://lobby_api:8002/lobby/player_select/{role}/{self.lobby_id}/{self.user_name}/"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data={'key': 'value'})
            if response.status_code != 200:
                print(f"Failed to assin role {self.lobby_id}: {role}")
                return 
        try: 
            self.roles = response.json()
        except httpx.JSONDecodeError:
            print(f"Failed to decode JSON from response: {response.text}")
            return
        await self.update_roles()

    async def unassign_role(self, role):
        url = f"http://lobby_api:8002/lobby/player_deselect/{role}/{self.lobby_id}/"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data={'key': 'value'})
            if response.status_code != 200:
                print(f"Failed to assin role {self.lobby_id}: {role}")
                return 
        try: 
            self.roles = response.json()
        except httpx.JSONDecodeError:
            print(f"Failed to decode JSON from response: {response.text}")
            return
        await self.update_roles()

    async def update_roles(self):
        await self.channel_layer.group_send(
            self.lobby_group_name,
            {
                'type': 'send_update_roles',
                'roles': self.roles,
            }
        )

    async def init_player_roles(self):
        # Send updated roles to this WebSocket
        url = f"http://lobby_api:8002/lobby/players/{self.lobby_id}/"
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            if response.status_code != 200:
                print(f"Failed to join lobby {self.lobby_id}: {response.text}")
                return
            self.roles = response.json()

        await self.send(text_data=json.dumps({
            'type': 'update_roles',
            'roles': self.roles,
        }))

    async def send_update_roles(self, event):
        # Send updated roles to this WebSocket
        await self.send(text_data=json.dumps({
            'type': 'update_roles',
            'roles': event['roles'],
        }))

    async def player_joined(self):
        url = f"http://lobby_api:8002/lobby/player_joined/{self.lobby_id}/{self.user_name}/"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data={'key': 'value'})
            if response.status_code != 200:
                return False
            return True
    
    async def player_left(self):
        url = f"http://lobby_api:8002/lobby/player_left/{self.lobby_id}/{self.user_name}/"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data={'key': 'value'})
            if response.status_code != 200:
                print(f"Failed to leave lobby {self.lobby_id}: {response.text}")
                return
            
            data = response.json()
            self.roles = data.get('roles', {})

            await self.update_roles()
            return data.get('cur_player')

    async def delete_lobby_entry(self):
        url = f"http://lobby_api:8002/lobby/delete/{self.lobby_id}/"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                    url,
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {self.token}',
                    },
                    cookies=self.cookies,
                )
            if response.status_code != 200:
                print(f"Failed to delete lobby {self.lobby_id}: {response.text}")
                return
