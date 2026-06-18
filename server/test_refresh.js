import roomManager from './src/managers/RoomManager.js';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("=== Running Room Refresh Flow Test ===");

  // 1. Create room (Host joins)
  const hostSocketId = "host-socket-111";
  const hostName = "Alice (Host)";
  const createResult = roomManager.createRoom(hostSocketId, hostName, null, 15);
  const roomId = createResult.roomId;
  const hostUserId = createResult.hostUserId;

  console.log("\n1. Created room:", roomId);
  console.log("Host details:", { hostSocketId, hostUserId, hostName });
  console.log("Room Users:", roomManager.getRoomUsers(roomId));
  console.log("SocketMap:", Array.from(roomManager.socketMap.entries()));

  // 2. Participant joins
  const partSocketId_old = "part-socket-222";
  const partName = "Bob";
  const joinResult = roomManager.addUserToRoom(roomId, partSocketId_old, partName, null, null);
  const partUserId = joinResult.roomUserId;

  console.log("\n2. Participant Bob joined:");
  console.log("Participant details:", { partSocketId_old, partUserId, partName });
  console.log("Room Users:", roomManager.getRoomUsers(roomId));
  console.log("SocketMap:", Array.from(roomManager.socketMap.entries()));

  // 3. Participant Bob refreshes. First, socket disconnects.
  console.log("\n3. Bob's socket disconnects. Starting grace period...");
  const socketInfo = roomManager.getSocketInfo(partSocketId_old);
  if (socketInfo) {
    roomManager.addPendingDisconnect(roomId, partSocketId_old, partUserId, (user) => {
      console.log(`[CALLBACK] Disconnect grace period expired for ${user.displayName} (ID: ${user.roomUserId})`);
    });
  }
  console.log("Pending Disconnects Map:", Array.from(roomManager.pendingDisconnects.keys()));
  console.log("Room Users:", roomManager.getRoomUsers(roomId));

  // 4. Bob's new socket connects and joins room (rejoins)
  const partSocketId_new = "part-socket-333";
  console.log("\n4. Bob re-joins with new socket ID:", partSocketId_new);
  const rejoinResult = roomManager.addUserToRoom(roomId, partSocketId_new, partName, partUserId, null);
  console.log("Rejoin Result:", rejoinResult);
  console.log("Pending Disconnects Map after rejoin:", Array.from(roomManager.pendingDisconnects.keys()));
  console.log("Room Users after rejoin:", roomManager.getRoomUsers(roomId));
  console.log("SocketMap after rejoin:", Array.from(roomManager.socketMap.entries()));

  // 5. Let's wait a moment and see if the callback is ever triggered (it shouldn't be)
  console.log("\nWaiting 2 seconds to check if any unexpected timeouts trigger...");
  await delay(2000);
  console.log("Done. Test completed.");
}

main().catch(err => console.error(err));

