from channels.generic.websocket import AsyncWebsocketConsumer
import asyncio, time, json, httpx
# import logging
# logger = logging.getLogger(__name__)

# from multiprocessing.shared_memory import SharedMemory
# from channels.db import database_sync_to_async
# from asgiref.sync import async_to_sync

MAX = 1000
WIDTH = 1
HEIGHT = 0.5
PADDLE_WIDTH = 0.005
PADDLE_HEIGHT = 0.05
BALL_SIZE = 0.01

class GameSession():
	def __init__(self):
		self.streaming = False
		self.end = False
		self.max_player_count = 1

		#usuable by more than one thread
		self.player_count = 0
		self.paddle_input = [[0,0],[0,0]]

		self.player_count = 0
		self.paddle_input = [[0,0],[0,0]]

		# size
		self.screen_width = MAX * WIDTH
		self.screen_height = MAX * HEIGHT
		self.paddle_width = MAX * PADDLE_WIDTH
		self.paddle_height = MAX * PADDLE_HEIGHT
		self.ball_size = MAX * BALL_SIZE

		# position
		self.ball = [0,0]
		self.paddleL = 0
		self.paddleR = 0

		self.ball_start_speedx = 2
		self.ball_start_speedy = 2
		self.ball_speedX = self.ball_start_speedx
		self.ball_speedY = self.ball_start_speedy
		self.ball_bounce_mult = 1.52
		self.passes = 0
		self.paddleL_speed = 0
		self.paddleR_speed = 0
		self.Lscore = 0
		self.Rscore = 0
		self.start = 0
		self.nonce = 0
		self.iterationStartT = 0

class PongGameLocal(AsyncWebsocketConsumer):

	GameSessions = {}

	################## CONNECT ##################

	async def connect(self):
		# This is called when the WebSocket connection is first made
		self.lobby_id = self.scope['url_route']['kwargs']['lobby_id']
		self.max_score = int(self.scope['url_route']['kwargs']['max_score'])
		query_string = self.scope["query_string"].decode()
		query_params = dict(qc.split("=") for qc in query_string.split("&") if "=" in qc)
		self.token = query_params.get("token")
		self.lobby_group_name = f"lobby_{self.lobby_id}"
		self.cookies = self.scope.get('cookies', {})
		self.csrf_token = self.cookies.get('csrftoken', None)
		self.game_session = None

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
		
		await self.accept()

		
	################## RECEIVE ##################

	async def receive(self, text_data):

		try:
			encoded_data = int(text_data)
			player = (encoded_data >> 2) & 1
			direction = (encoded_data >> 1) & 1
			moving = encoded_data & 1
			if encoded_data == 0:
				await self.send(text_data=json.dumps({
        	    'type': 'left_down',
        	    'status': 'false',
        	}))
			elif encoded_data == 1:
				await self.send(text_data=json.dumps({
        	    'type': 'left_down',
        	    'status': 'true',
        	}))
			elif encoded_data == 2:
				await self.send(text_data=json.dumps({
        	    'type': 'left_top',
        	    'status': 'false',
        	}))
			elif encoded_data == 3:
				await self.send(text_data=json.dumps({
        	    'type': 'left_top',
        	    'status': 'true',
        	}))
			elif encoded_data == 4:
				await self.send(text_data=json.dumps({
        	    'type': 'right_down',
        	    'status': 'false',
        	}))
			elif encoded_data == 5:
				await self.send(text_data=json.dumps({
        	    'type': 'right_down',
        	    'status': 'true',
        	}))
			elif encoded_data == 6:
				await self.send(text_data=json.dumps({
        	    'type': 'right_top',
        	    'status': 'false',
        	}))
			elif encoded_data == 7:
				await self.send(text_data=json.dumps({
        	    'type': 'right_top',
        	    'status': 'true',
        	}))
			self.update_paddle_input(player, direction, moving)

		except ValueError:
			try:
				data = json.loads(text_data)
				if data.get('type') == 'player_joined':
					if self.lobby_group_name not in self.GameSessions:
						self.GameSessions[self.lobby_group_name] = GameSession()
					self.game_session = self.GameSessions[self.lobby_group_name]
					self.game_session.player_count += 1
					if self.game_session.player_count == self.game_session.max_player_count:
						self.game_session.streaming = True
						self.game_task = asyncio.create_task(self.pong())
					# await self.send(text_data=json.dumps({'type': 'player_joined', 'status': 'success'}))
			except json.JSONDecodeError:
				pass

	def update_paddle_input(self, player, direction, moving):
			self.game_session.paddle_input[player][direction] = moving


	################## DISCONNECT ##################

	async def disconnect(self, close_code):
		# This is called when the WebSocket connection is closed
		if self.game_session is not None:
			self.game_session.player_count -= 1
			if self.lobby_group_name in self.GameSessions:
				del self.GameSessions[self.lobby_group_name]
	
	################## SIGNALHANDLER ##################

	async def send_game_end(self):
		message = "You tied."
		if int(self.game_session.Lscore) > int(self.game_session.Rscore):
			message = "P1 won!"
		elif int(self.game_session.Rscore) > int(self.game_session.Lscore):
			message = "P2 won!"

		game_state = {
        	'type': 'game_end',
			'message': message,
   		 }
		await self.send(text_data=json.dumps(game_state))


	################## THREAD ##################

	async def pong(self):

		await self.send(text_data=json.dumps({
        	'type': 'game_init',
        	'screen_width': str(WIDTH),
        	'screen_height': str(HEIGHT),
        	'paddle_width': str(PADDLE_WIDTH),
        	'paddle_height': str(PADDLE_HEIGHT),
        	'ball_size': str(BALL_SIZE),
			}))
		tickrate = 1/120
		self.game_session.start = int(time.time() * 1000)
		self.game_session.nonce = int(time.time() * 1000) - self.game_session.start
		self.game_session.iterationStartT = time.time()

		while self.game_session.player_count == self.game_session.max_player_count:
			duration = time.time() - self.game_session.iterationStartT
			sleeptime = max(0, tickrate - duration)
			if sleeptime > 0:
				await asyncio.sleep(sleeptime)
			self.game_session.iterationStartT = time.time()

			#increase ball speed in x direction every two passes
			if self.game_session.passes > 0 and self.game_session.passes % 2 == 0:
				self.game_session.ball_speedX += 1
				self.game_session.passes = 0

			#check for events from fontend
			self.game_session.paddleL_speed = (self.game_session.paddle_input[0][0] - self.game_session.paddle_input[0][1]) * 6
			self.game_session.paddleR_speed = (self.game_session.paddle_input[1][0] - self.game_session.paddle_input[1][1]) * 6

			#move ball
			self.game_session.ball[0] += self.game_session.ball_speedX
			self.game_session.ball[1] += self.game_session.ball_speedY

			#make sure data stays inside playing field
			if self.game_session.ball[1] < 0:
				self.game_session.ball[1] = 0

			if self.game_session.ball[1] > self.game_session.screen_height:
				self.game_session.ball[1] = self.game_session.screen_height

			#move left paddle
			self.game_session.paddleL += self.game_session.paddleL_speed

			#safety against moving and being out of bounds
			if self.game_session.paddleL >= self.game_session.screen_height - self.game_session.paddle_height or self.game_session.paddleL <= 0:
				self.game_session.paddleL_speed = 0
			if self.game_session.paddleL > self.game_session.screen_height - self.game_session.paddle_height:
				self.game_session.paddleL = self.game_session.screen_height - self.game_session.paddle_height
			if self.game_session.paddleL < 0:
				self.game_session.paddleL = 0

			#move right paddle
			self.game_session.paddleR += self.game_session.paddleR_speed

			#safety against moving and being out of bounds
			if self.game_session.paddleR >= self.game_session.screen_height - self.game_session.paddle_height or self.game_session.paddleR <= 0:
				self.game_session.paddleR_speed = 0
			if self.game_session.paddleR > self.game_session.screen_height - self.game_session.paddle_height:
				self.game_session.paddleR = self.game_session.screen_height - self.game_session.paddle_height
			if self.game_session.paddleR < 0:
				self.game_session.paddleR = 0

			#make ball bounce on paddles
			#Left Paddle
			if(self.game_session.ball[0] < 0 + self.game_session.paddle_width and (self.game_session.ball[1] >= self.game_session.paddleL - self.game_session.ball_size and self.game_session.ball[1] <= self.game_session.paddleL + self.game_session.paddle_height)):
				self.game_session.ball[0] = 0 + self.game_session.paddle_width
				self.game_session.passes += 1
				if self.game_session.paddleL_speed > 0:
					self.game_session.ball_speedY += self.game_session.ball_bounce_mult
				if self.game_session.paddleL_speed < 0:
					self.game_session.ball_speedY -= self.game_session.ball_bounce_mult
				self.game_session.ball_speedX *= -1
			#Right Paddle 
			if(self.game_session.ball[0] > self.game_session.screen_width - self.game_session.ball_size and (self.game_session.ball[1] + self.game_session.ball_size >= self.game_session.paddleR and self.game_session.ball[1] <= self.game_session.paddleR + self.game_session.paddle_height)):
				self.game_session.ball[0] = self.game_session.screen_width - self.game_session.ball_size
				self.game_session.passes += 1
				if self.game_session.paddleR_speed > 0:
					self.game_session.ball_speedY += self.game_session.ball_bounce_mult
				if self.game_session.paddleR_speed < 0:
					self.game_session.ball_speedY -= self.game_session.ball_bounce_mult
				self.game_session.ball_speedX *= -1

			#make ball bounce on top and bottom
			if self.game_session.ball[1] <= 0 or self.game_session.ball[1] >= self.game_session.screen_height - self.game_session.ball_size:
				self.game_session.ball_speedY *= -1

			#make ball reset if i leaves screen on x axis
			if self.game_session.ball[0] > self.game_session.screen_width - self.game_session.ball_size:
				self.game_session.Lscore += 1
				self.game_session.ball_speedX = self.game_session.ball_start_speedx
				self.game_session.ball[0] = self.game_session.screen_width/2
				self.game_session.ball[1] = self.game_session.screen_height/2
				self.game_session.ball_speedY = self.game_session.ball_start_speedy
			if (self.game_session.ball[0] < 0):
				self.game_session.Rscore += 1
				self.game_session.ball_speedX = - self.game_session.ball_start_speedx
				self.game_session.ball[0] = self.game_session.screen_width/2
				self.game_session.ball[1] = self.game_session.screen_height/2
				self.game_session.ball_speedY = self.game_session.ball_start_speedy

			#update nonce
			self.game_session.nonce = int(time.time() * 1000) - self.game_session.start
			await self.send(text_data=json.dumps({
					'type': 'game_update',
					'nonce': self.game_session.nonce,
					'paddleL': self.game_session.paddleL,
					'paddleR': self.game_session.paddleR,
					'ball_x': self.game_session.ball[0],
					'ball_y': self.game_session.ball[1],
					'Lscore': self.game_session.Lscore,
					'Rscore': self.game_session.Rscore,
    			}))
			
			if self.game_session.Lscore >= self.max_score or self.game_session.Rscore >= self.max_score:
				await self.send_game_end()
				break
		