const mqtt = require("mqtt");
const { MQTT_HOST, MQTT_PORT, MQTT_TOPIC } = require("../config/env");
const Telemetry = require("../models/Telemetry");

const startMqttClient = (io) => {
  const mqttUrl = `mqtt://${MQTT_HOST}:${MQTT_PORT}`;

  const client = mqtt.connect(mqttUrl);

  client.on("connect", () => {
    console.log("MQTT Broker'a bağlandı.");

    client.subscribe(MQTT_TOPIC, (err) => {
      if (err) {
        console.error("MQTT subscribe hatası:", err.message);
        return;
      }

      console.log(`'${MQTT_TOPIC}' topic'ine abone olundu.`);
    });
  });

  client.on("message", async (_topic, message) => {
    try {
      const rawData = JSON.parse(message.toString());

      const telemetryData = {
        udi: parseInt(rawData["UDI"], 10),
        productId: rawData["Product ID"],
        type: rawData["Type"],

        airTemperature: parseFloat(rawData["Air temperature [K]"]),
        processTemperature: parseFloat(rawData["Process temperature [K]"]),
        rotationalSpeed: parseInt(rawData["Rotational speed [rpm]"], 10),
        torque: parseFloat(rawData["Torque [Nm]"]),
        toolWear: parseInt(rawData["Tool wear [min]"], 10),

        machineFailure: parseInt(rawData["Machine failure"], 10),
        twf: parseInt(rawData["TWF"], 10),
        hdf: parseInt(rawData["HDF"], 10),
        pwf: parseInt(rawData["PWF"], 10),
        osf: parseInt(rawData["OSF"], 10),
        rnf: parseInt(rawData["RNF"], 10),

        timestamp: new Date(),
      };

      await Telemetry.create(telemetryData);
      io.emit("live_data", telemetryData);
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
