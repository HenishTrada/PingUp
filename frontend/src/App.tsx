

import { useEffect, useRef, useState } from 'react';
import './App.css';
import ChatBox from './components/ChatBox';
import { IoSend } from "react-icons/io5";
import Navbar from './components/Navbar';
import SideBar from './components/SideBar';
import { ToastContainer, toast } from 'react-toastify';

function App() {
  const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<{ msg: string; sender: string }[]>([]);
  const [activeUsers, setActiveUsers] = useState<{ roomId: string; username: string }[]>([]);
  const [username, setUsername] = useState<string>("Guest");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);


  // When roomId changes, load messages from localStorage for that room
  useEffect(() => {
    if (roomId) {
      const storedMessages = localStorage.getItem(`chat_${roomId}`);
      setMessages(storedMessages ? JSON.parse(storedMessages) : []);
    }
  }, [roomId]);

  // Function to send chat messages over the WebSocket
  function sendMessage() {
    const socket = wsRef.current;
    const inputEl = inputRef.current;

    if (!socket) {
      toast.error("Connection not established. Please wait or reconnect.");
      return;
    }

    if (!inputEl) {
      toast.error("Message input field is not available.");
      return;
    }

    if (!roomId) {
      toast.warning("You must join or create a room before sending a message.");
      return;
    }

    const msg = inputEl.value.trim();
    if (msg === "") {
      toast.info("Cannot send an empty message.");
      return;
    }

    // All good, send the message
    socket.send(
      JSON.stringify({
        type: "chat",
        payload: { message: msg, sender: username, roomId }
      })
    );

    inputEl.value = "";
  }


  // Handle Enter key for message input
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    // Only create connection when both roomId and username are set

    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
    const wss = new WebSocket(wsUrl);

    // Close any existing connection before assigning a new one
    if (wsRef.current) {
      wsRef.current.close();
    }
    wsRef.current = wss;

    setLoading(true);

    // On WebSocket open, send the join message
    wss.onopen = () => {
      console.log("WebSocket connection established.");
      wsRef.current?.send(
        JSON.stringify({ type: "join", payload: { roomId, username } })
      );
      setLoading(false);
    };

    // Handle incoming messages from the server
    wss.onmessage = (event) => {
      try {
        const receivedMessage = JSON.parse(event.data);
        if (
          receivedMessage.type === "chat" &&
          receivedMessage.payload.roomId === roomId
        ) {
          const newMessage = {
            msg: receivedMessage.payload.message,
            sender: receivedMessage.payload.sender,
            roomId: receivedMessage.payload.roomId
          };
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages, newMessage];
            localStorage.setItem(
              `chat_${roomId}`,
              JSON.stringify(updatedMessages)
            );
            return updatedMessages;
          });
        } else if (receivedMessage.type === "users") {
          setActiveUsers(receivedMessage.payload);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    // Log any errors from the WebSocket
    wss.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    // Log when the WebSocket is closed
    wss.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    // Cleanup: close the connection on component unmount or when dependencies change
    return () => {
      wss.close();
    };
  }, [roomId, username]);



  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50  bg-opacity-80 flex items-center justify-center flex-col">
          <div className="w-12 h-12 border-4 border-t-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <span className='text-white mt-2'>Socket establishing...</span>
        </div>
      )}
      <div
        className="flex flex-col lg:flex-row justify-between lg:p-2 hide-scrollbar relative"
        style={{ height: "100dvh" }}
      >
        {/* Sidebar */}
        <div className="text-white text-lg lg:text-2xl font-medium bg-[#2d2d2d] p-4 lg:w-2/10 w-full lg:rounded-l-lg border-r-1 border-[#222222] lg:sticky top-0 z-10 fixed ">
          <Navbar username={username} setUsername={setUsername} setRoomId={setRoomId} activeUsers={activeUsers} />
          <div className='block max-lg:hidden '>
            <SideBar activeUsers={activeUsers} />
          </div>
        </div>

        {/* Chatbox */}
        <div className="flex flex-col lg:w-8/10 w-full lg:rounded-r-lg">
          <ChatBox messages={messages} roomId={roomId || ""} username={username} />

          {/* Input box */}
          <div className="flex bg-[#2c2c2c] p-2 border-t border-[#222222] fixed bottom-0 left-0 right-0 z-10 lg:relative lg:rounded-br-lg">
            <input
              type="text"
              placeholder="Type a message"
              ref={inputRef}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-white text-base p-2 focus:outline-none"
            />
            <button
              onClick={sendMessage}
              className="bg-[#1daa61] flex items-center justify-center px-3 py-3 rounded-full ml-2 flex-shrink-0 "
            >
              <IoSend />
            </button>
          </div>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default App;
