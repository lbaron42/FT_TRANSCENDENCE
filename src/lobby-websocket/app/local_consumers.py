from channels.generic.websocket import AsyncWebsocketConsumer
import json
import httpx
# import logging
# logger = logging.getLogger(__name__)

class LocalLobbyConsumer(AsyncWebsocketConsumer):

	################## CONNECT ##################

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

        await self.accept()

	################## RECEIVE ##################

    async def receive(self, text_data):
        # Handle messages from the WebSocket
        data = json.loads(text_data)
        action = data.get('action')

        if action == 'start_game':
            await self.send(text_data=json.dumps({
            'type': 'start_game',
            'message': 'ok'
        }))
            
	################## DISCONNECT ##################

    async def disconnect(self, close_code):

        await self.delete_lobby_entry()

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
