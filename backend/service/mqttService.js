const mqtt = require("mqtt");
const Telemetry = require("../models/Telemetry");

const startMqttClient = (io) => {
  const topic = process.env.MQTT_TOPIC;
  const mqttUrl = `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`;

  const client = mqtt.connect(mqttUrl);

  client.on("connect", () => {
    console.log("MQTT Broker'a bağlandı.");

    client.subscribe(topic, (err) => {
      if (err) {
        console.error("MQTT subscribe hatası:", err.message);
        return;
      }

      console.log(`'${topic}' topic'ine abone olundu.`);
    });
  });

  client.on("message", async (_topic, message) => {
    try {
      const telemetry = {
        ...JSON.parse(message.toString()),
        timestamp: new Date(),
      };

      await Telemetry.create(telemetry);
      io.emit("live_data", telemetry);
    } catch (err) {
      console.error("MQTT mesaj işleme hatası:", err.message);
    }
  });

  client.on("error", (err) => {
    console.error("MQTT Hatası:", err.message);
  });

  return client;
};

module.exports = startMqttClient;
