FROM python:3.13.0-slim-bookworm

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

RUN python manage.py migrate

CMD ["python", "manage.py", "runserver", "0.0.0.0:8001"]