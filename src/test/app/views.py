from django.http import HttpResponse
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

# Simple game state
block_position = {'y': 200}  # Initial position (y-coordinate)

@csrf_exempt
def move_block(request):
    global block_position
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            direction = data.get('direction')
            if direction == 'up':
                block_position['y'] = max(0, block_position['y'] - 10)  # Move up (prevent going out of bounds)
            elif direction == 'down':
                block_position['y'] = min(450, block_position['y'] + 10)  # Move down (prevent going out of bounds)
            return JsonResponse({'newPosition': block_position['y']})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Invalid request'}, status=400)

def test_view(request):
    return HttpResponse("<html>Hello, World!</html>")