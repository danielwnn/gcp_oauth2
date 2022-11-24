FROM python:3.9.15-alpine
WORKDIR /app
COPY . /app
RUN pip install -r requirements.txt
EXPOSE $APP_PORT
CMD [ "python3", "app.py"]