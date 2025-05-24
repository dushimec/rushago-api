// Example implementation of messageController
export const getMessages = (req, res) => {
  res.status(200).json({ message: "Get all messages" });
};

export const createMessage = (req, res) => {
  res.status(201).json({ message: "Message created successfully" });
};

export const deleteMessage = (req, res) => {
  res.status(200).json({ message: "Message deleted successfully" });
};
