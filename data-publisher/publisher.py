import csv
import time
import json
import paho.mqtt.client as mqtt
import os

MQTT_HOST = os.environ.get("MQTT_HOST")
MQTT_PORT = int(os.environ.get("MQTT_PORT"))
CSV_FILE = os.environ.get("CSV_FILE")
MQTT_TOPIC = os.environ.get("MQTT_TOPIC")
TIMESLEEP = int(os.environ.get("TIMESLEEP"))

client = mqtt.Client()
client.connect(MQTT_HOST, MQTT_PORT, 60)

with open(CSV_FILE, "r") as file:
    reader = csv.DictReader(file)
    for row in reader:
        payload = json.dumps(row)
        client.publish(MQTT_TOPIC, payload, qos=0, retain=False)
        time.sleep(TIMESLEEP)
    
client.disconnect()