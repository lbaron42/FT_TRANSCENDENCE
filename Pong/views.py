from django.shortcuts import render
from django.http import HttpResponse

import pygame,sys,time

# Create your views here.

def Pong(request):
	return render(request, './Pong/pongDplay.html')
