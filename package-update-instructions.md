# 後端套件安裝說明

為了支援即時通知功能，需要安裝以下套件：

```bash
cd Project/backend
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

這些套件用於：
- @nestjs/websockets: NestJS WebSocket 支援
- @nestjs/platform-socket.io: Socket.IO 平台適配器
- socket.io: WebSocket 伺服器實現