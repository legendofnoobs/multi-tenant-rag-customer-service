import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { env } from './env';
import { logger } from './logger';

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: env.ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, 'New socket connection');

    socket.on('join_workspace', (workspaceId: string) => {
      socket.join(`workspace_${workspaceId}`);
      logger.debug({ socketId: socket.id, workspaceId }, 'Socket joined workspace');
    });

    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation_${conversationId}`);
      logger.debug({ socketId: socket.id, conversationId }, 'Socket joined conversation');
    });

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, 'Socket disconnected');
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
