type Message = {
	user: string;
	content: string;
};

type Room = {
	id: string;
	messages: Array<Message>;
};

export type { Message, Room };
