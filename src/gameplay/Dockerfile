FROM python:3.13.0-slim-bookworm

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

ENV GAMEPLAY_SECRET_KEY=$GAMEPLAY_SECRET_KEY
ENV MICROSERVICE_SECRET_TOKEN=$MICROSERVICE_SECRET_TOKEN

RUN python manage.py makemigrations
RUN python manage.py migrate

# CMD ["daphne", "-b", "0.0.0.0", "-p", "8001", "PongBackend.asgi:application"]
