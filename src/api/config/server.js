import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Message } from '../models/Message.js';
import { clearChatCache, logUserActivity } from '../utils/globalFeature.js';

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User ${socket.user.id} connected`);

    // Send offline messages
    const offlineMessages = await Message.find({
      recipient_id: socket.user.id,
      createdAt: { $gte: socket.user.activity_metrics?.last_login || new Date(0) }
    }).populate('sender_id', 'name');

    for (const message of offlineMessages) {
      socket.emit('message', {
        thread_id: message.thread_id,
        content: message.content,
        sender: message.sender_id.name,
        timestamp: message.timestamp
      });
      message.status.delivered = true;
      await message.save();
    }

    // Join a chat thread
    socket.on('joinThread', ({ thread_id }) => {
      socket.join(thread_id);
      socket.emit('joinedThread', { thread_id });
    });

    // Send a message
    socket.on('message', async ({ thread_id, content, recipient_id }) => {
      const message = await Message.create({
        thread_id,
        car_id: content.car_id,
        sender_id: socket.user.id,
        recipient_id,
        content: {
          text: content.text,
          media: content.media,
          type: content.type || 'text'
        },
        priority: socket.user.isProOwner
      });

      // Clear MongoDB chat cache
      await clearChatCache(thread_id);

      io.to(thread_id).emit('message', {
        thread_id,
        content: message.content,
        sender: socket.user.id,
        timestamp: message.timestamp
      });

      await logUserActivity(
        socket.user.id,
        'message_sent',
        { action: 'send_message', target_id: message._id },
        { device: socket.handshake.headers['user-agent'] }
      );
    });

    // Mark a message as read
    socket.on('markRead', async ({ message_id }) => {
      const message = await Message.findById(message_id);
      if (message && message.recipient_id.toString() === socket.user.id) {
        message.status.read = true;
        message.status.read_timestamp = new Date();
        await message.save();

        io.to(message.thread_id).emit('messageRead', { message_id });

        await logUserActivity(
          socket.user.id,
          'message_read',
          { action: 'mark_message_read', target_id: message_id },
          { device: socket.handshake.headers['user-agent'] }
        );
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.user.id} disconnected`);
    });
  });

  return io;
};
