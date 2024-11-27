from channels.generic.websocket import WebsocketConsumer

import pygame, sys, time


class PongGame(WebsocketConsumer):

	def connect(self):
		# This is called when the WebSocket connection is first made
		self.accept()  # Accept the connection from the client
		self.send(text_data="connected!")
		self.streaming = True  # Start streaming data

	def disconnect(self, close_code):
		# This is called when the WebSocket connection is closed
		self.streaming = False  # Stop the data stream

	def receive(self, text_data):
		# This is called when the server receives data from the client

		#recieve paddle imput here

		print(f"Received from client: {text_data}")

		if text_data == "PONG":
			print("got PONG!")
			self.pong()

	def run_function(self, params):
		# Example backend function logic
		value = params.get('value', 0)
		return f"Function executed with value: {value}"


	def send_stream_data(self):
		# This sends a continuous stream of data to the client

		#Run pong game here

		self.pong(self)

	def pong(self):
		pygame.init()

		#arbirary base values
		screen_width = 1000
		screen_height = screen_width / 2

		#create screen (needs to be handeled by fontend eventually)
		screen = pygame.display.set_mode((screen_width, screen_height))
		pygame.display.set_caption("game")

		#set timing clock for game logic
		clock = pygame.time.Clock()
		
		paddle_width = screen_width/100*0.1
		paddle_heigth = screen_height/100*20
		ball_sizex = screen_width/100*1
		ball_sizey = screen_height/100*2

		ball = pygame.Rect(0,0,ball_sizex,ball_sizey)
		paddleL = pygame.Rect(0,0,paddle_width,paddle_heigth)
		paddleR = pygame.Rect(0,0,paddle_width,paddle_heigth)

		print(ball.size)

		paddleR.centery = screen_height/2
		paddleR.centerx = screen_width - paddle_width

		paddleL.centery = screen_height/2
		paddleL.centerx = 0 + paddle_width

		ball.center = (screen_width/2,screen_height/2)

		ball_start_speedx = 2
		ball_start_speedy = 2

		ball_speedX = 0
		ball_speedY = 0
		ball_bounce_mult = 1.52
		paddleL_speed = 0
		paddleR_speed = 0

		Lscore = 0
		Rscore = 0

		gamestate = [None] * 7
		gamestate[5] = Lscore
		gamestate[6] = Rscore
		#gamestate: nonce, paddleL.y, paddleR.y, ball.x, ball.y, Lscore, Rscore

		log = open("gamedata.txt", "w")

		last_ball_speed = 0
		last_paddleR_speed = 0

		ball_speedX = ball_start_speedx
		ball_speedY = ball_start_speedy

		passes = 0

		start = int(time.time() * 1000)

		nonce = int(time.time() * 1000) - start

		hitnbr = 0
		speed = 120

		while self.streaming:
			if passes > 0 and passes % 2 == 0:
				ball_speedX += 1
				passes = 0
			#check for events (not sure how to get that from the frontend in the end)
			for event in pygame.event.get():
				if event.type == pygame.QUIT:
					pygame.quit()
					sys.exit()
				if event.type == pygame.KEYDOWN:
					if event.key == pygame.K_UP:
						paddleR_speed = -6
					if event.key == pygame.K_DOWN:
						paddleR_speed = 6
					if event.key == pygame.K_w:
						paddleL_speed = -6
					if event.key == pygame.K_s:
						paddleL_speed = 6
					if event.key == pygame.K_l:
						paddleR.y -= 1
					if event.key == pygame.K_o:
						paddleR.y += 1
					if event.key == pygame.K_t:
						speed = 6
					if event.key == pygame.K_y:
						speed = 120
				if event.type == pygame.KEYUP:
					if event.key == pygame.K_UP or event.key == pygame.K_DOWN:
						paddleR_speed = 0
				if event.type == pygame.KEYUP:
					if event.key == pygame.K_w or event.key == pygame.K_s:
						paddleL_speed = 0


			#move ball
			ball.x += ball_speedX
			ball.y += ball_speedY
			
			#make sure data stays inside playing field
			if ball.y < 0:
				ball.y = 0

			if ball.y > screen_height:
				ball.y = screen_height

			#write ball location to gamedata

			#move left paddle
			paddleL.y += paddleL_speed
			#safety against moving and being out of bounds

			if paddleL.y >= screen_height - paddle_heigth or paddleL.y <= 0:
				paddleL_speed = 0
			if paddleL.y > screen_height-paddle_heigth:
				paddleL.y = screen_height-paddle_heigth
			if paddleL.y < 0:
				paddleL.y = 0

			#move right paddle
			paddleR.y += paddleR_speed

			#safety against moving and being out of bounds
			if paddleR.y >= screen_height - paddle_heigth or paddleR.y <= 0:
				paddleR_speed = 0
			if paddleR.y > screen_height-paddle_heigth:
				paddleR.y = screen_height-paddle_heigth
			if paddleR.y < 0:
				paddleR.y = 0


			gamestate[1] = paddleL.y
			gamestate[2] = paddleR.y
			gamestate[3] = ball.x
			if gamestate[3] < 0:
				gamestate[3] = 0
			if gamestate[3] > screen_width:
				gamestate[3] = screen_width
			gamestate[4] = ball.y

			#make ball bounce on paddles
			#Left Paddle
			if(ball.x < 0 + paddle_width and (ball.y >= paddleL.y - ball_sizey and ball.y <= paddleL.y + paddle_heigth)):
				ball.x = 0 + paddle_width
				passes += 1
				if paddleL_speed > 0:
					ball_speedY += ball_bounce_mult
				if paddleL_speed < 0:
					ball_speedY -= ball_bounce_mult
				ball_speedX *= -1
			#Right Paddle
			if(ball.x > screen_width - paddle_width - ball_sizex and (ball.y + ball_sizex >= paddleR.y and ball.y <= paddleR.y + paddle_heigth)):
				ball.x = screen_width - paddle_width - ball_sizex
				passes += 1
				if paddleR_speed > 0:
					ball_speedY += ball_bounce_mult
				if paddleR_speed < 0:
					ball_speedY -= ball_bounce_mult
				ball_speedX *= -1

			#make ball bounce on top and bottom
			if ball.y <= 0 or ball.y >= screen_height - ball_sizey:
				ball_speedY *= -1
			#make ball reset if i leaves screen on x axis
			if ball.x > screen_width - ball_sizex or ball.x < 0:
				print("score!")
			if ball.x > screen_width - ball_sizex:
				Lscore += 1
				gamestate[5] = Lscore
				ball_speedX = ball_start_speedx
				print(Lscore)
				ball.x = screen_width/2
				ball.y = screen_height/2
				ball_speedY = ball_start_speedy
			if (ball.x < 0):
				Rscore += 1
				gamestate[6] = Rscore
				ball_speedX = -ball_start_speedx
				print(Rscore)
				ball.x = screen_width/2
				ball.y = screen_height/2
				ball_speedY = ball_start_speedy

		#update screen (frontend will have to handle that eventually)
			nonce = int(time.time() * 1000) - start
			gamestate[0] = nonce

			print(nonce )

			pygame.display.update()
			clock.tick(speed)
			screen.fill("black")
			pygame.draw.rect(screen,'white',ball)
			pygame.draw.rect(screen,'white',paddleL)
			pygame.draw.rect(screen,'white',paddleR)
			log.write(' '.join(str(x) for x in gamestate) + "\n")
			self.send(text_data= ' '.join(str(x) for x in gamestate) + "\n")  # Send data to client