from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import async_to_sync
# from .signals import game_update_signal, game_init_signal, game_end_signal
import asyncio, time, json, math, httpx
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
PAC_SIZE = 0.03

class GameSession():
	def __init__(self):
		self.streaming = False
		self.end = False
		self.gameThread = None
		self.max_player_count = 1


		#usuable by more than one thread
		self.player_count = 0
		self.paddle_input = [[0,0],[0,0]]

		# locks
		# self.player_count_lock = asyncio.Lock()
		# self.player_input_lock = asyncio.Lock()

		self.player_count = 0
		self.paddle_input = [[0,0],[0,0]]
		self.pac_input = [[0,0],[0,0]]
		# [is pac, lr or ud, player 1|2,up|down,moves]

		# size
		self.screen_width = MAX * WIDTH
		self.screen_height = MAX * HEIGHT
		self.paddle_width = MAX * PADDLE_WIDTH
		self.paddle_height = MAX * PADDLE_HEIGHT
		self.ball_size = MAX * BALL_SIZE
		self.pac_size = MAX * PAC_SIZE

		# position
		self.ball = [0,0]
		self.paddleL = 0
		self.paddleR = 0
		self.pac = [MAX/2,50]

		self.pac_speed = 0
		self.pac_speedX = 0
		self.pac_speedy = 0
		self.pac_start_speed = 1
		self.ball_start_speedx = 2
		self.ball_start_speedy = 2
		self.ball_speedX = self.ball_start_speedx
		self.ball_speedY = self.ball_start_speedy
		self.ball_bounce_mult = 1.52
		self.passes = 0
		self.paddle_speed = 6
		self.paddleL_speed = 0
		self.paddleR_speed = 0
		self.Lscore = 0
		self.Rscore = 0
		self.Pscore = 0
		self.start = 0
		self.nonce = 0
		self.iterationStartT = 0

class PacPongGameLocal(AsyncWebsocketConsumer):

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
			is_pac = (encoded_data >> 4) & 1
			achsis = (encoded_data >> 3) & 1
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

			if encoded_data == 20:
				await self.send(text_data=json.dumps({
        	    'type': 'mid_down',
        	    'status': 'false',
        	}))
			elif encoded_data == 21:
				await self.send(text_data=json.dumps({
        	    'type': 'mid_down',
        	    'status': 'true',
        	}))
			elif encoded_data == 22:
				await self.send(text_data=json.dumps({
        	    'type': 'mid_top',
        	    'status': 'false',
        	}))
			elif encoded_data == 23:
				await self.send(text_data=json.dumps({
        	    'type': 'mid_top',
        	    'status': 'true',
        	}))
			elif encoded_data == 28:
				await self.send(text_data=json.dumps({
        	    'type': 'mid_right',
        	    'status': 'false',
        	}))
			elif encoded_data == 29:
				await self.send(text_data=json.dumps({
        	    'type': 'mid_right',
        	    'status': 'true',
        	}))
			elif encoded_data == 30:
				await self.send(text_data=json.dumps({
        	    'type': 'mid_left',
        	    'status': 'false',
        	}))
			elif encoded_data == 31:
				await self.send(text_data=json.dumps({
        	    'type': 'mid_left',
        	    'status': 'true',
        	}))
			self.update_player_input(is_pac, achsis, player, direction, moving)

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
						self.game_task = asyncio.create_task(self.pac_pong())
			except json.JSONDecodeError:
				pass

	def update_player_input(self, is_pac, achsis, player, direction, moving):
		if is_pac == 0:
				self.game_session.paddle_input[player][direction] = moving
		else:
				self.game_session.pac_input[achsis][direction] = moving


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
		if int(self.game_session.Lscore) > int(self.game_session.Rscore) and int(self.game_session.Lscore) > int(self.game_session.Pscore):
			message = "P1 won!"
		elif int(self.game_session.Rscore) > int(self.game_session.Lscore) and int(self.game_session.Rscore) > int(self.game_session.Pscore):
			message = "P2 won!"
		elif int(self.game_session.Pscore) > int(self.game_session.Lscore) and int(self.game_session.Pscore) > int(self.game_session.Rscore):
			message = "PAC won!"

		game_state = {
        	'type': 'game_end',
			'message': message,
   		 }
		await self.send(text_data=json.dumps(game_state))


	################## THREAD ##################

	async def pac_pong(self):

		await self.send(text_data=json.dumps({
        	'type': 'game_init',
        	'screen_width': str(WIDTH),
        	'screen_height': str(HEIGHT),
        	'paddle_width': str(PADDLE_WIDTH),
        	'paddle_height': str(PADDLE_HEIGHT),
        	'ball_size': str(BALL_SIZE),
			'pac_size': str(PAC_SIZE),
			}))
		tickrate = 1/120
		self.game_session.start = int(time.time() * 1000)
		self.game_session.nonce = int(time.time() * 1000) - self.game_session.start
		self.game_session.iterationStartT = time.time()

		while self.game_session.player_count == self.game_session.max_player_count:
			#gameclock logic
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
			#paddles
			# async with self.game_session.player_input_lock:
			self.game_session.paddleL_speed = (self.game_session.paddle_input[0][0] - self.game_session.paddle_input[0][1]) * self.game_session.paddle_speed
			self.game_session.paddleR_speed = (self.game_session.paddle_input[1][0] - self.game_session.paddle_input[1][1]) * self.game_session.paddle_speed
			#pac
			self.game_session.pac_speed = self.game_session.pac_start_speed
			self.game_session.pac_speedx = (self.game_session.pac_input[1][0] - self.game_session.pac_input[1][1]) * self.game_session.pac_speed
			self.game_session.pac_speedy = (self.game_session.pac_input[0][0] - self.game_session.pac_input[0][1]) * self.game_session.pac_speed

			#move pac
			self.game_session.pac[0] += self.game_session.pac_speedx
			self.game_session.pac[1] += self.game_session.pac_speedy

			#safety against pac moving and being out of bounds
			if self.game_session.pac[1] < 0 + self.game_session.pac_size/2:
				self.game_session.pac[1] = 0 + self.game_session.pac_size/2
			
			if self.game_session.pac[1] > self.game_session.screen_height - self.game_session.pac_size/2:
				self.game_session.pac[1] = self.game_session.screen_height - self.game_session.pac_size/2
			
			if self.game_session.pac[0] < (self.game_session.screen_width / 3) + self.game_session.pac_size/2:
				self.game_session.pac[0] = (self.game_session.screen_width / 3) + self.game_session.pac_size/2
			
			if self.game_session.pac[0] > ((self.game_session.screen_width / 3) * 2) - self.game_session.pac_size/2:
				self.game_session.pac[0] = ((self.game_session.screen_width / 3) * 2) - self.game_session.pac_size/2

			#make pac collide with the ball
			# Calculate the distance between the centers of the two balls
			distance = math.sqrt((self.game_session.ball[1] - self.game_session.pac[1])**2 + (self.game_session.ball[0] - self.game_session.pac[0])**2)
			
			# Check if the distance is less than the sum of the radii
			if distance < (self.game_session.ball_size/2 + self.game_session.pac_size/2):
				self.game_session.Pscore += 1
				self.game_session.ball_speedX = self.game_session.ball_start_speedx
				self.game_session.ball[0] = self.game_session.screen_width/2
				self.game_session.ball[1] = self.game_session.screen_height/2
				self.game_session.pac[0] = self.game_session.screen_width/2
				self.game_session.pac[1] = 50
				self.game_session.ball_speedY = self.game_session.ball_start_speedy

			#move ball
			self.game_session.ball[0] += self.game_session.ball_speedX
			self.game_session.ball[1] += self.game_session.ball_speedY

			#make sure ball stays inside playing field
			if self.game_session.ball[1] < 0:
				self.game_session.ball[1] = 0

			if self.game_session.ball[1] > self.game_session.screen_height:
				self.game_session.ball[1] = self.game_session.screen_height

			#move left paddle
			self.game_session.paddleL += self.game_session.paddleL_speed

			#safety against paddleL moving and being out of bounds
			if self.game_session.paddleL >= self.game_session.screen_height - self.game_session.paddle_height or self.game_session.paddleL <= 0:
				self.game_session.paddleL_speed = 0
			if self.game_session.paddleL > self.game_session.screen_height - self.game_session.paddle_height:
				self.game_session.paddleL = self.game_session.screen_height - self.game_session.paddle_height
			if self.game_session.paddleL < 0:
				self.game_session.paddleL = 0

			#move right paddle
			self.game_session.paddleR += self.game_session.paddleR_speed

			#safety against PaddleR moving and being out of bounds
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
				self.game_session.pac[0] = self.game_session.screen_width/2
				self.game_session.pac[1] = 50
				self.game_session.ball_speedY = self.game_session.ball_start_speedy
			if (self.game_session.ball[0] < 0):
				self.game_session.Rscore += 1
				self.game_session.ball_speedX = - self.game_session.ball_start_speedx
				self.game_session.ball[0] = self.game_session.screen_width/2
				self.game_session.ball[1] = self.game_session.screen_height/2
				self.game_session.pac[0] = self.game_session.screen_width/2
				self.game_session.pac[1] = 50
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
					'Pscore': self.game_session.Pscore,
					'pac_x': self.game_session.pac[0],
					'pac_y': self.game_session.pac[1],
    			}))
			
			if self.game_session.Lscore >= self.max_score or self.game_session.Rscore >= self.max_score or self.game_session.Pscore >= self.max_score:
				await self.send_game_end()
				break
		
