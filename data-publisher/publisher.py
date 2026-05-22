import csv
import time
import json
import paho.mqtt.client as mqtt
import os


def get_required_env(name):
    value = os.environ.get(name)

    if value is None or value == "":
        raise RuntimeError(f"{name} ortam değişkeni tanımlı değil.")

    return value


def get_required_int_env(name):
    return int(get_required_env(name))


MQTT_HOST = get_required_env("MQTT_HOST")
MQTT_PORT = get_required_int_env("MQTT_PORT")
CSV_FILE = get_required_env("CSV_FILE")
MQTT_TOPIC = get_required_env("MQTT_TOPIC")
TIMESLEEP = get_required_int_env("TIMESLEEP")

client = mqtt.Client()
client.connect(MQTT_HOST, MQTT_PORT, 60)

with open(CSV_FILE, "r", encoding="utf-8-sig", newline="") as file:
    reader = csv.DictReader(file)
    for row in reader:
        payload = json.dumps(row)
        client.publish(MQTT_TOPIC, payload, qos=0, retain=False)
        time.sleep(TIMESLEEP)
    
client.disconnect()