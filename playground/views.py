from django.shortcuts import render
from django.http import HttpResponse

import pygame,sys,time

# Create your views here.
def calculate():
	x = 1
	y = 2
	return x

def say_hello(request):
	x = calculate()
	return HttpResponse('Hello World')

def test(request):
	return render(request, './rest.html')
