import { useEffect, useRef, useState } from "react";
import "./App.css";

const WS_URL = "ws://localhost:8000/ws";

export default function App() {
  const [username, setUsername] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);

  const wsRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!username) return;

    const ws = new WebSocket(`${WS_URL}/${encodeURIComponent(username)}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setMessages((prev) => [...prev, msg]);
    };

    ws.onclose = () => setConnected(false);

    ws.onerror = () => {
      console.log("ошибка вебсокета");
    };

    return () => {
      ws.close();
    };
  }, [username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLogin = (e) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    setMessages([]);
    setUsername(name);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    const ws = wsRef.current;
    if (!trimmed || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({ text: trimmed }));
    setText("");
  };

  const handleLogout = () => {
    setUsername("");
    setConnected(false);
  };

  if (!username) {
    return (
      <div className="login">
        <form onSubmit={handleLogin} className="login-form">
          <h2>Вход в чат</h2>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Введите имя"
            autoFocus
          />
          <button type="submit">Войти</button>
        </form>
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="chat-header">
        <span>
          {username}{" "}
          <small className={connected ? "online" : "offline"}>
            {connected ? "в сети" : "нет соединения"}
          </small>
        </span>
        <button onClick={handleLogout}>Выйти</button>
      </div>

      <div className="messages">
        {messages.map((m, i) =>
          m.type === "system" ? (
            <div key={i} className="msg-system">
              {m.text}
            </div>
          ) : (
            <div
              key={i}
              className={`msg-user ${m.username === username ? "mine" : ""}`}
            >
              <div className="msg-meta">
                <b>{m.username}</b> <span>{m.timestamp}</span>
              </div>
              <div>{m.text}</div>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-form" onSubmit={sendMessage}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Сообщение..."
          autoFocus
        />
        <button type="submit" disabled={!connected}>
          Отправить
        </button>
      </form>
    </div>
  );
}
