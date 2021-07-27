require('dotenv').config();

import express, { Request, Response } from 'express';
import { Socket } from 'socket.io';
import { v4 } from 'uuid';
import { Room, Message } from './types';
import cors from 'cors';
import http from 'http';

(async () => {
	const app = express();
	const server = new http.Server(app);
	const io = require('socket.io')(server, {
		cors: {
			origin: '*',
			methods: ['GET', 'POST']
		}
	});
	const rooms: Array<Room> = [];

	io.on('connection', (socket: Socket) => {
		console.log('client connected');

		socket.on('disconnect', () => {
			console.log('client disconnected');
		});

		socket.on('create-room', (room?: string) => {
			const createdRoom = room || v4();

			rooms.push({ id: createdRoom, messages: [] });

			socket.join(createdRoom);

			socket.emit('joined-room', createdRoom, []);
		});

		socket.on('join-room', (room: string) => {
			let existantRoom = rooms.find(({ id }) => id === room);

			socket.join(room);

			if (!existantRoom) {
				existantRoom = { id: room, messages: [] };
				rooms.push(existantRoom);
			}

			socket.emit('joined-room', existantRoom.id, existantRoom.messages);
		});

		socket.on('leave-room', (room: string) => {
			const existantRoom = rooms.find(({ id }) => id === room);

			socket.leave(room);

			if (existantRoom && io.sockets.clients(room) === 0) {
				const index = rooms.indexOf(existantRoom);
				rooms.splice(index, 1);
			}

			socket.emit('left-room');
		});

		socket.on('send-message', (room: string, message: Message) => {
			const existantRoom = rooms.find(({ id }) => id === room);

			if (existantRoom) {
				existantRoom.messages.push(message);
			}

			io.to(room).emit('receive-message', message);
		});
	});

	app.use(cors());
	app.use(express.json());

	app.get('/rooms', (req: Request, res: Response) => {
		try {
			if (rooms.length === 0) return res.status(404).json({ message: 'No rooms exist' });

			return res.json(rooms);
		} catch (err) {
			return res.status(500).json({ message: err.message });
		}
	});

	app.get('/messages/:room', (req: Request, res: Response) => {
		try {
			const room = rooms.find(room => room.id === req.params.room);

			if (!room) return res.status(404).json({ message: 'This room does not exist' });

			return res.json(room.messages);
		} catch (err) {
			return res.status(500).json({ message: err.message });
		}
	});

	// app.post('/create-room', (req: Request, res: Response) => {
	// 	try {
	// 		const createdRoom = req.body.room || v4();

	// 		rooms.push({ id: createdRoom, messages: [] });

	// 	} catch (err) {
	// 		return res.status(500).json({ message: err.message });
	// 	}
	// });

	app.get('*', (req: Request, res: Response) => {
		return res.status(404).json({ message: 'Route does not exist' });
	});

	server.listen(process.env.PORT || 5000);
})();
