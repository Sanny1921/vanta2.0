import messageManager from './managers/MessageManager.js';

const roomId = 'test-room';
const msgText = messageManager.createMessage(
  roomId,
  'user1',
  'User 1',
  'Hello text',
  60 * 1000,
  false,
  'text'
);

const msgVoice = messageManager.createMessage(
  roomId,
  'user1',
  'User 1',
  '[Voice Message]',
  60 * 1000,
  false,
  'voice',
  '/audio.webm',
  15
);

console.log('Text message type:', msgText.type);
console.log('Text message expires in (sec):', (msgText.expiresAt - msgText.createdAt) / 1000);

console.log('Voice message type:', msgVoice.type);
console.log('Voice message expires in (sec):', (msgVoice.expiresAt - msgVoice.createdAt) / 1000);
