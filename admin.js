const { kafka } = require("./client");

async function init() {
  const admin = kafka.admin();
  console.log("Admin connecting...");
  await admin.connect();
  console.log("Admin Connection Success...");

  console.log("Creating Topic [driver-locations]");
  await admin.createTopics({
    topics: [{ topic: "driver-locations", numPartitions: 4 }], // 4 partitions for zones
  });
  console.log("Topic Created Success [driver-locations]");

  console.log("Creating Topic [booking-requests]");
  await admin.createTopics({
    topics: [{ topic: "booking-requests", numPartitions: 4 }],
  });


  console.log("Disconnecting Admin...");
  await admin.disconnect();
}

init();
