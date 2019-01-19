FROM python:2.7-slim

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 9000 

CMD [ "python", "./app.py" ]
