from channels.generic.websocket import AsyncWebsocketConsumer
from .signals import game_update_signal, game_init_signal, game_end_signal
import asyncio, time, threading, json, math
# import logging

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

# logger = logging.getLogger(__name__)

class GameSession():
	def __init__(self):
		self.streaming = False
		self.end = False

		#usuable by more than one thread
		self.player_count = 0
		self.paddle_input = [[0,0],[0,0]]

		# locks
		self.player_count_lock = threading.Lock()
		self.player_input_lock = threading.Lock()

		self.player_count = 0
		self.paddle_input = [[0,0],[0,0]]
		self.pac_input = [[0,0],[0,0]]
		# [is pac, lr or ud, player 1|2,up|down,moves]

		# size
		self.screen_width = MAX * WIDTH
		self.screen_height = MAX * HEIGHT
		self.paddle_width = MAX * PADDLE_WIDTH
		self.paddle_heigth = MAX * PADDLE_HEIGHT
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

class PacPongGame(AsyncWebsocketConsumer):

	GameSessions = {}

	################## CONNECT ##################

	async def connect(self):
		# This is called when the WebSocket connection is first made
		self.lobby_id = self.scope['url_route']['kwargs']['lobby_id']
		self.max_player_count = int(self.scope['url_route']['kwargs']['max_player'])
		self.max_score = int(self.scope['url_route']['kwargs']['max_score'])
		self.lobby_group_name = f"lobby_{self.lobby_id}"
		
		await self.channel_layer.group_add(
            self.lobby_group_name,
            self.channel_name
        )
		# logger.debug("test")
		if self.lobby_group_name not in self.GameSessions:
			self.GameSessions[self.lobby_group_name] = GameSession()
			# logger.debug(f"Created new GameSession for lobby: {self.lobby_group_name}")

		self.game_session = self.GameSessions[self.lobby_group_name]

		if self.game_session.streaming == True:
			# logger.debug("Lobby is full. Rejecting connection.")
			await self.close()
			return

		self.game_session.player_count += 1
		# logger.debug("player_count: %s, max_player_count: %s", self.game_session.player_count, self.max_player_count)
		
		if self.game_session.player_count == self.max_player_count:
			# logger.debug("all players connected")
			game_update_signal.connect(self.game_update_signal_handler, sender=self)
			game_init_signal.connect(self.game_init_signal_handler, sender=self)
			game_end_signal.connect(self.game_end_signal_handler, sender=self)
			self.game_session.streaming = True
			self.gameThread = threading.Thread(target= self.pac_pong)
			self.gameThread.daemon = True
			self.gameThread.start()

		await self.accept()

		
	################## RECEIVE ##################
	
	async def receive(self, text_data):
		encoded_data = int(text_data)
		is_pac = (encoded_data >> 4) & 1
		achsis = (encoded_data >> 3) & 1
		player = (encoded_data >> 2) & 1
		direction = (encoded_data >> 1) & 1
		moving = encoded_data & 1
		await asyncio.to_thread(self.update_player_input, is_pac, achsis, player, direction, moving)
	# [is pac, lr or ud, player 1|2,up|down,moves]

	def update_player_input(self, is_pac, achsis, player, direction, moving):
		if is_pac == 0:
			with self.game_session.player_input_lock:
				self.game_session.paddle_input[player][direction] = moving
		else:
			with self.game_session.player_input_lock:
				self.game_session.pac_input[achsis][direction] = moving

	################## DISCONNECT ##################

	async def disconnect(self, close_code):
		# This is called when the WebSocket connection is closed
		await asyncio.to_thread(self.decrease_player_count)
		if self.game_session.streaming == False:
			# logger.debug("Deleting lobby....")
			""" game_mode = 'single-player'
			if self.max_player_count == 2:
				game_mode = 'multi-player'
			url = f"http://nginx:80/lobby/players/{self.lobby_id}"
			async with httpx.AsyncClient() as client:
				response = await client.get(url)
			if response.status_code != 200:
				print(f"Failed to get players.")
				return
			roles = response.json()
			url = f"http://nginx:80/user-api/addgame/"
			async with httpx.AsyncClient() as client:
				response = await client.post(url, data=
								{'gameMode': game_mode,
			   					'players':[roles.p1, roles.p2],
								'score': [self.Lscore, self.Rscore],
			   					})
				if response.status_code != 200:
					print(f"Failed to send score")
					return """
			if self.lobby_group_name in self.GameSessions:
				del self.GameSessions[self.lobby_group_name]
		else:
			self.game_session.streaming = False
		game_update_signal.disconnect(self.game_update_signal_handler, sender=self)
		game_init_signal.disconnect(self.game_init_signal_handler, sender=self)
		game_end_signal.disconnect(self.game_end_signal_handler, sender=self)

		if self.game_session.streaming == True:
			await self.channel_layer.group_send(
        		self.lobby_group_name,
        		{
        		'type': 'player_left',
        	    'message' : 'player disconnected - returning to lobby.',
   			 	}
			)

		await self.channel_layer.group_discard(
			self.lobby_group_name,
		    self.channel_name
		)

	async def player_left(self, event):
		await self.send(text_data=json.dumps(event))

	def decrease_player_count(self):
		with self.game_session.player_count_lock:
			self.game_session.player_count -= 1
	
	################## SIGNALHANDLER ##################

	async def game_update_signal_handler(self, **kwargs):

		kwargs.pop('sender', None)
		game_state = {
			'type': 'game_update',
			'nonce': kwargs['nonce'],
			'paddleL': kwargs['paddleL'],
			'paddleR': kwargs['paddleR'],
			'ball_x': kwargs['ball_x'],
			'ball_y': kwargs['ball_y'],
			'Lscore': kwargs['Lscore'],
			'Rscore': kwargs['Rscore'],
			'Pscore': kwargs['Pscore'],
			'pac_x': kwargs['pac_x'],
			'pac_y': kwargs['pac_y'],
    	}
		if self.max_player_count > 1:
			await self.channel_layer.group_send(
        		self.lobby_group_name,
        		game_state,
			)
		else:
			await self.send(text_data=json.dumps(game_state))


	async def game_update(self, event):
		await self.send(text_data=json.dumps(event))

	async def game_init_signal_handler(self, **kwargs):

		kwargs.pop('sender', None)
		game_state = {
        	'type': 'game_init',
        	'screen_width': kwargs['screen_width'],
        	'screen_height': kwargs['screen_height'],
        	'paddle_width': kwargs['paddle_width'],
        	'paddle_heigth': kwargs['paddle_heigth'],
        	'ball_size': kwargs['ball_size'],
			'pac_size': kwargs['pac_size'],
			}
		
		if self.max_player_count > 1:
			await self.channel_layer.group_send(
        		self.lobby_group_name,
        		game_state,
			)
		else:
			await self.send(text_data=json.dumps(game_state))

	async def game_init(self, event):
		await self.send(text_data=json.dumps(event))

	async def game_end_signal_handler(self, **kwargs):

		message = "You tied."
		if int(kwargs['Lscore']) > int(kwargs['Rscore'] and kwargs['Lscore']) > int(kwargs['Pscore']):
			message = "P1 won!"
		elif int(kwargs['Lscore']) < int(kwargs['Rscore'] and kwargs['Rscore']) > int(kwargs['Pscore']):
			message = "P2 won!"
		elif int(kwargs['Pscore']) < int(kwargs['Lscore'] and kwargs['Pscore']) > int(kwargs['Rscore']):
			message = "PAC won!"

		game_state = {
        	'type': 'game_end',
			'message': message,
   		 }

		if self.max_player_count > 1:
			await self.channel_layer.group_send(
        		self.lobby_group_name,
        		game_state,
			)
		else:
			await self.send(text_data=json.dumps(game_state))

	async def game_end(self, event):
		await self.send(text_data=json.dumps(event))

	################## THREAD ##################

	def pac_pong(self):

		game_init_signal.send(sender=self, 
			screen_width=str(WIDTH),
			screen_height=str(HEIGHT),
			paddle_width=str(PADDLE_WIDTH),
			paddle_heigth=str(PADDLE_HEIGHT),
			ball_size=str(BALL_SIZE),
			pac_size=str(PAC_SIZE))
		
		tickrate = 1/120 * 1000
		servertickrate = 1/240 * 1000
		self.game_session.start = (time.time() * 1000)
		self.game_session.nonce = (time.time() * 1000) - self.game_session.start
		self.game_session.iterationStartT = (time.time() * 1000)

		accumulatedTime = 0

		ball1 = 0 
		ball2 = 0
		ball3 = 0 
		ball4 = 0

		while True:
			with self.game_session.player_count_lock:
				if self.game_session.player_count != self.max_player_count:
					break
			#gameclock logic
			delta_time = ((time.time() * 1000) - self.game_session.iterationStartT)
			#print("frame took " + str(delta_time) + " ms")
			#if delta_time < servertickrate:
				#print("sleeping for" + str((servertickrate/1000)-delta_time))
				#time.sleep(servertickrate - delta_time)
				#delta_time = servertickrate
			accumulatedTime += delta_time
			#sleeptime = tickrate - delta_time
			#if sleeptime > 0:
			#	time.sleep(sleeptime)
			self.game_session.iterationStartT = (time.time() * 1000)

			#increase ball speed in x direction every two passes
			if self.game_session.passes > 0 and self.game_session.passes % 2 == 0:
				self.game_session.ball_speedX += 1
				self.game_session.passes = 0

			#check for events from fontend
			#paddles
			with self.game_session.player_input_lock:
				self.game_session.paddleL_speed = ((self.game_session.paddle_input[0][0] - self.game_session.paddle_input[0][1]) * self.game_session.paddle_speed)
				self.game_session.paddleR_speed = ((self.game_session.paddle_input[1][0] - self.game_session.paddle_input[1][1]) * self.game_session.paddle_speed)
			#pac
				self.game_session.pac_speed = self.game_session.pac_start_speed
				self.game_session.pac_speedx = (self.game_session.pac_input[1][0] - self.game_session.pac_input[1][1]) * self.game_session.pac_speed
				self.game_session.pac_speedy = (self.game_session.pac_input[0][0] - self.game_session.pac_input[0][1]) * self.game_session.pac_speed

			#move pac
			self.game_session.pac[0] += self.game_session.pac_speedx * delta_time
			self.game_session.pac[1] += self.game_session.pac_speedy * delta_time

			#safety against pac moving and being out of bounds
			if self.game_session.pac[1] < 0 + self.game_session.pac_size/2:
				self.game_session.pac[1] = 0 + self.game_session.pac_size/2
			
			if self.game_session.pac[1] > self.game_session.screen_height - self.game_session.pac_size/2:
				self.game_session.pac[1] = self.game_session.screen_height - self.game_session.pac_size/2
			
			if self.game_session.pac[0] < 0 + self.game_session.pac_size/2:
				self.game_session.pac[0] = 0 + self.game_session.pac_size/2
			
			if self.game_session.pac[0] > self.game_session.screen_width - self.game_session.pac_size/2:
				self.game_session.pac[0] = self.game_session.screen_width - self.game_session.pac_size/2

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
			ball1 = self.game_session.ball[0]
			self.game_session.ball[0] += self.game_session.ball_speedX * delta_time
			self.game_session.ball[1] += self.game_session.ball_speedY * delta_time
			ball2 = self.game_session.ball[0]
			
			#print("ball moved: " + str(ball2-ball1) + " units per frame")

			#make sure ball stays inside playing field
			if self.game_session.ball[1] < 0:
				self.game_session.ball[1] = 0

			if self.game_session.ball[1] > self.game_session.screen_height:
				self.game_session.ball[1] = self.game_session.screen_height

			#move left paddle
			self.game_session.paddleL += self.game_session.paddleL_speed * delta_time

			#safety against paddleL moving and being out of bounds
			if self.game_session.paddleL >= self.game_session.screen_height - self.game_session.paddle_heigth or self.game_session.paddleL <= 0:
				self.game_session.paddleL_speed = 0
			if self.game_session.paddleL > self.game_session.screen_height - self.game_session.paddle_heigth:
				self.game_session.paddleL = self.game_session.screen_height - self.game_session.paddle_heigth
			if self.game_session.paddleL < 0:
				self.game_session.paddleL = 0

			#move right paddle
			self.game_session.paddleR += self.game_session.paddleR_speed * delta_time

			#safety against PaddleR moving and being out of bounds
			if self.game_session.paddleR >= self.game_session.screen_height - self.game_session.paddle_heigth or self.game_session.paddleR <= 0:
				self.game_session.paddleR_speed = 0
			if self.game_session.paddleR > self.game_session.screen_height - self.game_session.paddle_heigth:
				self.game_session.paddleR = self.game_session.screen_height - self.game_session.paddle_heigth
			if self.game_session.paddleR < 0:
				self.game_session.paddleR = 0

			#make ball bounce on paddles
			#Left Paddle
			if(self.game_session.ball[0] < 0 + self.game_session.paddle_width and (self.game_session.ball[1] >= self.game_session.paddleL - self.game_session.ball_size and self.game_session.ball[1] <= self.game_session.paddleL + self.game_session.paddle_heigth)):
				self.game_session.ball[0] = 0 + self.game_session.paddle_width
				self.game_session.passes += 1
				if self.game_session.paddleL_speed > 0:
					self.game_session.ball_speedY += self.game_session.ball_bounce_mult
				if self.game_session.paddleL_speed < 0:
					self.game_session.ball_speedY -= self.game_session.ball_bounce_mult
				self.game_session.ball_speedX *= -1
			#Right Paddle 
			if(self.game_session.ball[0] > self.game_session.screen_width - self.game_session.paddle_width - self.game_session.ball_size and (self.game_session.ball[1] + self.game_session.ball_size >= self.game_session.paddleR and self.game_session.ball[1] <= self.game_session.paddleR + self.game_session.paddle_heigth)):
				self.game_session.ball[0] = self.game_session.screen_width - self.game_session.paddle_width - self.game_session.ball_size
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
			self.game_session.nonce = (time.time() * 1000) - self.game_session.start
			print(str(accumulatedTime) + "vs" + str(tickrate))
			if (accumulatedTime >= tickrate):
				ball3 = self.game_session.ball[0]
				#print("ball moved: " + str(ball3-ball4) + " units per tick")
				ball4 = self.game_session.ball[0]
				#print("doing tick after " + str(accumulatedTime) + " ms (" + str(tickrate) + ")")
				accumulatedTime = 0
				game_update_signal.send(sender=self, 
						nonce=self.game_session.nonce, 
						paddleL=self.game_session.paddleL, 
						paddleR=self.game_session.paddleR, 
						ball_x=self.game_session.ball[0], 
						ball_y=self.game_session.ball[1], 
						Lscore=self.game_session.Lscore, 
						Rscore=self.game_session.Rscore,
						Pscore=self.game_session.Pscore,
						pac_x=self.game_session.pac[0],
						pac_y=self.game_session.pac[1])

				if self.game_session.Lscore >= self.max_score or self.game_session.Rscore >= self.max_score or self.game_session.Pscore >= self.max_score:
					print("sending game end signal")
					if self.max_player_count == 1:
						self.game_session.streaming = False
					self.game_session.end = True
					game_end_signal.send(sender=self,
							Lscore=self.game_session.Lscore,
							Rscore=self.game_session.Rscore,
							Pscore=self.game_session.Pscore)
					break
		
