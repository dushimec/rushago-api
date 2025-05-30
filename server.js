import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import morgan from 'morgan'
import { initializeSocket } from './src/api/config/server.js';
import { connectDB } from './src/api/config/config.js';
import routes from './src/api/routes/index.js';
import { errorHandler } from './src/api/middlewares/index.js';
import { setupSwaggerDocs } from './src/api/config/swagger.js';


dotenv.config();
const app = express();
app.use(cors({ origin: '*' }));
const server = createServer(app);
const io = initializeSocket(server);
app.set('io', io);

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/v1', routes);
app.use(errorHandler);
app.use(morgan('dev'));
setupSwaggerDocs(app, '/api/v1');

app.get('/', (req, res) => {
  res.send('RushaGO server is running');
});

const PORT = process.env.PORT || 15000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  server.close(() => process.exit(0));
});
