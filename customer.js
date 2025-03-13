const express = require("express");
const { kafka } = require("./client");
const { driversByZone, orders } = require("./storage");

const app = express();
app.use(express.json());

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "customer-group" });

async function init() {
  console.log("Connecting Producer & Consumer...");
  await producer.connect();
  await consumer.connect();
  console.log("Connected Successfully");

  await consumer.subscribe({ topics: ["driver-locations"], fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const driverInfo = JSON.parse(message.value.toString());
      const { driverId, driverName, zone } = driverInfo;

      if (driversByZone[zone]) {
        driversByZone[zone] = [...new Set([...driversByZone[zone], { driverId, driverName }])];
      } else {
        driversByZone[zone] = [{ driverId, driverName }];
      }
      
    },
  });
}

init();

/** 
 * Customer creates a booking request 
 * 
*/
app.post("/create-booking", async (req, res) => {
  const { customerId, customerName, pickupZone, destination } = req.body;

  if (!customerId || !customerName || !pickupZone || !destination) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!["north", "south", "east", "west"].includes(pickupZone.toLowerCase())) {
    return res.status(400).json({ error: "Invalid pickup zone" });
  }

  const bookingRequest = { customerId, customerName, zone: pickupZone, destination };

  await producer.send({
    topic: "booking-requests",
    messages: [
      {
        partition: ["north", "south", "east", "west"].indexOf(pickupZone.toLowerCase()),
        key: "booking-request",
        value: JSON.stringify(bookingRequest),
      },
    ],
  });

  res.status(200).json({ message: "Booking request created", bookingRequest });
});

/**
 * Customer fetches available drivers in their zone
 * 
 */
app.get("/available-drivers/:zone", (req, res) => {
  const zone = req.params.zone.toLowerCase();

  if (!["north", "south", "east", "west"].includes(zone)) {
    return res.status(400).json({ error: "Invalid zone" });
  }

  res.status(200).json({ drivers: driversByZone[zone] || [] });
});

/**
 * Fetch completed orders
 */
app.get("/orders", (req, res) => {
    res.status(200).json({ orders });
});

const PORT = 3002;
app.listen(PORT, () => console.log(`Customer API running on port ${PORT}`));
