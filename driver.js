const express = require("express");
const { kafka } = require("./client");
const { bookingsByZone, driversByZone, orders } = require("./storage");

const app = express();
app.use(express.json());

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "driver-group" });

async function init() {
  console.log("Connecting Producer & Consumer...");
  await producer.connect();
  await consumer.connect();
  console.log("Connected Successfully");

  await consumer.subscribe({ topics: ["booking-requests"], fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const bookingRequest = JSON.parse(message.value.toString());
      const zone = bookingRequest.zone || bookingRequest.pickupZone;  // Fix here

      if (!zone) {
        console.error("Received booking request without a zone:", bookingRequest);
        return;
      }

      if (bookingsByZone[zone]) {
        bookingsByZone[zone].push(bookingRequest);
      }

      console.log(`New Booking for ${zone}:`, bookingRequest);
      /**
       * Send FCM Push Notification
       */
    },
  });
}

init();

/**
 * Driver updates their location
 * 
 */
app.post("/update-location", async (req, res) => {
  const { driverId, driverName, zone } = req.body;

  if (!driverId || !driverName || !zone) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!["north", "south", "east", "west"].includes(zone.toLowerCase())) {
    return res.status(400).json({ error: "Invalid zone" });
  }

  driversByZone[zone] = [...new Set([...driversByZone[zone], { driverId, driverName }])];

  await producer.send({
    topic: "driver-locations",
    messages: [
      {
        partition: ["north", "south", "east", "west"].indexOf(zone.toLowerCase()),
        key: "driver-update",
        value: JSON.stringify({ driverId, driverName, zone }),
      },
    ],
  });

  res.status(200).json({ message: "Location updated", driverId, driverName, zone });
});

/**
 * Driver fetches booking requests in their zone
 * 
 */
app.get("/booking-requests/:zone", (req, res) => {
  const zone = req.params.zone.toLowerCase();

  if (!["north", "south", "east", "west"].includes(zone)) {
    return res.status(400).json({ error: "Invalid zone" });
  }

  res.status(200).json({ bookings: bookingsByZone[zone] || [] });
});

/**
 * Driver accepts a booking request
 */
app.post("/accept-booking", async (req, res) => {
    const { driverId, driverName, zone, customerId } = req.body;
  
    if (!driverId || !driverName || !zone || !customerId) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    const zoneBookings = bookingsByZone[zone] || [];
    const bookingIndex = zoneBookings.findIndex(b => b.customerId === customerId);
  
    if (bookingIndex === -1) {
      return res.status(404).json({ error: "Booking request not found" });
    }
  
    const booking = zoneBookings.splice(bookingIndex, 1)[0]; // Remove from list
  
    await producer.send({
      topic: "ride-accepted",
      messages: [
        {
          key: "ride-accept",
          value: JSON.stringify({ ...booking, driverId, driverName, status: "accepted" }),
        },
      ],
    });
  
    res.status(200).json({ message: "Booking accepted", booking });
});
  
/**
 * Driver completes the ride
 */
app.post("/complete-ride", async (req, res) => {
    const { driverId, driverName, customerId } = req.body;
  
    if (!driverId || !driverName || !customerId) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    const completedOrder = {
      driverId,
      driverName,
      customerId,
      status: "completed",
      timestamp: new Date(),
    };
  
    orders.push(completedOrder);
  
    res.status(200).json({ message: "Ride completed", order: completedOrder });
});
  
/**
 * Fetch completed orders
 */
app.get("/orders", (req, res) => {
    res.status(200).json({ orders });
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Driver API running on port ${PORT}`));
