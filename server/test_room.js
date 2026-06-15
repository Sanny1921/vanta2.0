import roomManager from './src/managers/RoomManager.js';

console.log("--- Testing Room Limits ---");

const testLimits = [3, 5, 10, 15, 25];

for (const limit of testLimits) {
  const result = roomManager.createRoom("socket-id", "Tester", null, limit);
  const room = roomManager.getRoom(result.roomId);
  console.log(`Requested: ${limit}, Created Settings maxUsers: ${result.settings.maxUsers}, Stored room maxUsers: ${room.maxUsers}`);
}
