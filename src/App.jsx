// App.jsx - Med Toast Notification, totalCNC och auto-save för CNP/CNC
import { useEffect, useState } from "react";
import Game from "./components/Game";
import Toast from "./components/Toast";
import "./index.css";

export default function App() {
  const [cnp, setCnp] = useState(0);
  const [totalCNC, setTotalCNC] = useState(0);
  const [toast, setToast] = useState(null); // { message, type }

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  // CNP and totalCNC are now managed per profile in Game.jsx

  return (
    <div className="app">
      <video className="video-background" autoPlay loop muted playsInline>
        <source src="/video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <header className="topbar">
        <div className="logo-header">
          <img src="/images/CNC.png" alt="Coin Collectors Logo" className="header-logo" />
          <h1>Coin Collectors (BETA)</h1>
        </div>

        <div className="topbar-currencies">
          <div className="currency-item">
            <span className="currency-label">CNP</span>
            <span className="currency-value">{cnp.toLocaleString()}</span>
          </div>
          <div className="currency-item">
            <span className="currency-label">CNC</span>
            <span className="currency-value">{totalCNC.toLocaleString()}</span>
          </div>
        </div>
      </header>

      <main className="game-layout">
        <Game
          cnp={cnp}
          setCnp={setCnp}
          totalCNC={totalCNC}
          setTotalCNC={setTotalCNC}
          showToast={showToast}
        />
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}