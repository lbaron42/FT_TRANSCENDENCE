from channels.generic.websocket import WebsocketConsumer

from multiprocessing.shared_memory import SharedMemory

from channels.db import database_sync_to_async
from asgiref.sync import async_to_sync

import time, threading ,mmap, os

class PongGame(WebsocketConsumer):

	sharedMemSize = 100

	def connect(self):
		# This is called when the WebSocket connection is first made
		self.accept()  # Accept the connection from the client
		self.streaming = True  # Start streaming data

		self.inputData = os.open('input', os.O_RDWR | os.O_CREAT)
		os.ftruncate(self.inputData, self.sharedMemSize)
		os.write(self.inputData, b'\x00' * self.sharedMemSize)

		self.WriteToInputData = mmap.mmap(self.inputData, self.sharedMemSize, access=mmap.ACCESS_WRITE)
		self.ReadFromInputData = mmap.mmap(self.inputData, self.sharedMemSize, access=mmap.ACCESS_READ)


	def disconnect(self, close_code):
		# This is called when the WebSocket connection is closed
		self.streaming = False  # Stop the data stream

	def receive(self, text_data):
		# This is called when the server receives data from the client

		#initiate pong game on button press here
		if text_data == "PONG":
			print("got PONG!")
			text_data = "0,0"
			self.gameThread = threading.Thread(target= self.pong)
			self.gameThread.daemon = True
			self.gameThread.start()

		self.WriteToInputData[0:len(text_data)] = text_data.encode()

	pongot = 0

	#arbirary base values
	screen_width = 1000
	screen_height = screen_width / 2

	#game element sizes
	paddle_width = screen_width/100*0.1
	paddle_heigth = screen_height/100*20
	ball_sizex = screen_width/100*1
	ball_sizey = screen_height/100*2

	#game element location variables
	ball = [0,0]
	paddleL = 0
	paddleR = 0

	#ball speed reset value
	ball_start_speedx = 2
	ball_start_speedy = 2

	#used ball speed value (gets calculated while playing)
	ball_speedX = ball_start_speedx
	ball_speedY = ball_start_speedy

	#ball speed increase value
	ball_bounce_mult = 1.52

	#passes (used to calculate when to speed up ball)
	passes = 0
	
	#used paddle speed value (gets calculated while playing)
	paddleL_speed = 0
	paddleR_speed = 0

	#Scores
	Lscore = 0
	Rscore = 0

	#gamestate frames
	#gamestate: nonce, paddleL.y, paddleR.y, ball.x, ball.y, Lscore, Rscore
	gamestate = [None] * 7
	gamestate[5] = Lscore
	gamestate[6] = Rscore

	packedData = 0

	#replat setup
	log = open("gamedata.txt", "w")

	#nonce calculation
	start = int(time.time() * 1000)
	nonce = int(time.time() * 1000) - start



	def pong(self):

		#set timing clock rate for game logic
		tickrate = 1/120
		iterationStartT = time.time()

		while (self.streaming):

			#gameclock logic
			duration = time.time() - iterationStartT
			sleeptime = tickrate-duration
			if sleeptime > 0:
				time.sleep(sleeptime)
			iterationStartT = time.time()

			#increase ball speed in x direction every two passes
			if self.passes > 0 and self.passes % 2 == 0:
				self.ball_speedX += 1
				self.passes = 0

			#check for events from fontend
			input = self.ReadFromInputData[0:3].decode().split(',')
			if (len(input) >= 2) :
				if input[0] == '0':
					self.paddleL_speed = 0
				if input[0] == '1':
					self.paddleL_speed = -6
				if input[0] == '2':
					self.paddleL_speed = 6
				if input[1] == '0':
					self.paddleR_speed = 0
				if input[1] == '1':
					self.paddleR_speed = -6
				if input[1] == '2':
					self.paddleR_speed = 6

			#move ball
			self.ball[0] += self.ball_speedX
			self.ball[1] += self.ball_speedY

			#make sure data stays inside playing field
			if self.ball[1] < 0:
				self.ball[1] = 0

			if self.ball[1] > self.screen_height:
				self.ball[1] = self.screen_height

			#move left paddle
			self.paddleL += self.paddleL_speed

			#safety against moving and being out of bounds
			if self.paddleL >= self.screen_height - self.paddle_heigth or self.paddleL <= 0:
				self.paddleL_speed = 0
			if self.paddleL > self.screen_height - self.paddle_heigth:
				self.paddleL = self.screen_height - self.paddle_heigth
			if self.paddleL < 0:
				self.paddleL = 0

			#move right paddle
			self.paddleR += self.paddleR_speed

			#safety against moving and being out of bounds
			if self.paddleR >= self.screen_height - self.paddle_heigth or self.paddleR <= 0:
				self.paddleR_speed = 0
			if self.paddleR > self.screen_height - self.paddle_heigth:
				self.paddleR = self.screen_height - self.paddle_heigth
			if self.paddleR < 0:
				self.paddleR = 0

			# Pack the data into a single integer
			self.packedData = (
				(int(self.nonce) << (9 + 9 + 9 + 10 + 7 + 7)) |
				(int(self.paddleL) << (9 + 9 + 10 + 7 + 7)) |
				(int(self.paddleR) << (9 + 10 + 7 + 7)) |
				(int(self.ball[0]) << (10 + 7 + 7)) |
				(int(self.ball[1]) << (7 + 7)) |
				(int(self.Lscore) << 7) |
				int(self.Rscore)
			)

			#fill gamestate data (this is sent to frontend and saved)
			self.gamestate[1] = int(self.paddleL)
			self.gamestate[2] = int(self.paddleR)
			self.gamestate[3] = int(self.ball[0])
			#correct impossible ball locations for frontend
			if self.gamestate[3] < 0:
				self.gamestate[3] = 0
			if self.gamestate[3] > self.screen_width:
				self.gamestate[3] = self.screen_width
			self.gamestate[4] = int(self.ball[1])

			#make ball bounce on paddles
			#Left Paddle
			if(self.ball[0] < 0 + self.paddle_width and (self.ball[1] >= self.paddleL - self.ball_sizey and self.ball[1] <= self.paddleL + self.paddle_heigth)):
				self.ball[0] = 0 + self.paddle_width
				self.passes += 1
				if self.paddleL_speed > 0:
					self.ball_speedY += self.ball_bounce_mult
				if self.paddleL_speed < 0:
					self.ball_speedY -= self.ball_bounce_mult
				self.ball_speedX *= -1
			#Right Paddle 
			if(self.ball[0] > self.screen_width - self.paddle_width - self.ball_sizex and (self.ball[1] + self.ball_sizex >= self.paddleR and self.ball[1] <= self.paddleR + self.paddle_heigth)):
				self.ball[0] = self.screen_width - self.paddle_width - self.ball_sizex
				self.passes += 1
				if self.paddleR_speed > 0:
					self.ball_speedY += self.ball_bounce_mult
				if self.paddleR_speed < 0:
					self.ball_speedY -= self.ball_bounce_mult
				self.ball_speedX *= -1

			#make ball bounce on top and bottom
			if self.ball[1] <= 0 or self.ball[1] >= self.screen_height - self.ball_sizey:
				self.ball_speedY *= -1

			#make ball reset if i leaves screen on x axis
			if self.ball[0] > self.screen_width - self.ball_sizex:
				self.Lscore += 1
				self.gamestate[5] = self.Lscore
				self.ball_speedX = self.ball_start_speedx
				self.ball[0] = self.screen_width/2
				self.ball[1] = self.screen_height/2
				self.ball_speedY = self.ball_start_speedy
			if (self.ball[0] < 0):
				self.Rscore += 1
				self.gamestate[6] = self.Rscore
				self.ball_speedX = - self.ball_start_speedx
				self.ball[0] = self.screen_width/2
				self.ball[1] = self.screen_height/2
				self.ball_speedY = self.ball_start_speedy

			#update nonce
			nonce = int(time.time() * 1000) - self.start
			self.gamestate[0] = nonce

			#write gamestate and send gamestate to frontend
			#self.log.write(' '.join(str(x) for x in self.gamestate) + "\n")
			(self.send)(text_data= ' '.join(str(x) for x in self.gamestate) + "\n")  # Send data to client