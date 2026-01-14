// Shop.jsx – FIXAD VERSION 2026-01-04 v2
import { useState } from "react";

const formatNumber = (num) => {
  if (num === undefined || num === null) return "0";
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (abs >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 100_000) return (num / 1_000).toFixed(0) + "k";
  if (abs >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return num.toLocaleString();
};

export default function Shop({
  cnp,
  collectors,
  setCnp,
  setOwnedInstances,
  showToast,
  signer,
  walletAddress,
  provider,
  onBuySuccess, // ny callback för att synka till backend om du har en
  ownedInstances,
  collectorCap = 25,
}) {
  const [buyAmounts, setBuyAmounts] = useState({});
  const [isProcessing, setIsProcessing] = useState({});
  const [showBuyConfirm, setShowBuyConfirm] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState(null);

  const getUpgradeCost = (collector) => {
  if (!collector.upgradeBaseCost) return "N/A";
  return formatNumber(Math.floor(collector.upgradeBaseCost));
};

  const buyCollectors = async (id, amount) => {
    if (amount <= 0) return;

    // Check collector limit and adjust amount if necessary
    const currentCount = ownedInstances.length;
    if (currentCount >= 25) {
      showToast("You have reached the maximum collector limit (25). You cannot buy more collectors.", "error");
      return;
    }

    const maxCanBuy = 25 - currentCount;
    const actualAmount = Math.min(amount, maxCanBuy);

    if (actualAmount !== amount) {
      showToast(`You can only buy ${actualAmount} more collector(s) to reach the limit of 25.`, "info");
    }

    setIsProcessing((prev) => ({ ...prev, [id]: true }));

    try {
      const collectorTemplate = collectors.find((c) => c.id === id);
      if (!collectorTemplate) throw new Error("Collector not found");

      const baseCost = collectorTemplate.baseCost;
      const discountPercent = Math.min(50, Math.floor(actualAmount / 5) * 5);
      const discountedCostPer = Math.round(baseCost * (1 - discountPercent / 100));
      const totalCost = discountedCostPer * actualAmount;

      showToast("Checking balance...", "info");
      if (cnp < totalCost) {
        showToast(
          `Not enough CNP! You have ${formatNumber(cnp)} CNP.`,
          "error"
        );
        return;
      }

      showToast("Processing purchase...", "info");

      // Deduct CNP from player's balance
      setCnp(prev => prev - totalCost);

      // SKAPA INSTANSERNA FÖRST
      const newInstances = [];
      for (let i = 0; i < actualAmount; i++) {
        const instanceId = `${id}-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        newInstances.push({
          instanceId,
          collectorId: id,
          level: 1,
          currentIncome: collectorTemplate.incomePerSecond,
        });
      }

      // UPPDATERA STATE via callback (don't duplicate here)
      setBuyAmounts((prev) => ({ ...prev, [id]: 1 }));

      // Om du har en backend-synk – anropa callback
      if (typeof onBuySuccess === "function") {
        onBuySuccess(newInstances);
      }

      showToast(
        `${actualAmount} × ${collectorTemplate.name} purchased successfully!`,
        "success"
      );
    } catch (error) {
      console.error(error);
      let message = "Something went wrong. Please try again.";
      if (error.message?.includes("user rejected") || error.code === 4001) {
        message = "Transaction cancelled.";
      }
      showToast(message, "error");
    } finally {
      setIsProcessing((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleImageError = (e) => {
    e.target.src = "https://via.placeholder.com/300?text=Collector";
  };

  const changeAmount = (id, delta) => {
    setBuyAmounts((prev) => {
      const current = prev[id] || 1;
      const newAmount = Math.max(1, current + delta);
      return { ...prev, [id]: newAmount };
    });
  };

  const formatTime = (seconds) => {
    const totalMinutes = Math.floor(seconds / 60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = (totalMinutes / 60).toFixed(1).replace(/\.0$/, "");
    return `${hours} h`;
  };

  const getIncomePerHour = (baseIncome) => formatNumber(baseIncome);
  const getIncomePerCycle = (baseIncome, miningTime) =>
    formatNumber(baseIncome * (miningTime / 1000) / 3600);

  return (
    <div className="shop glass fade-in">
      <h2 className="collector-header glow-border">Shop – Collectors</h2>
      <p className="shop-subtitle">Bulk discount: 5% per 5 items (max 50%)</p>

      {ownedInstances.length >= collectorCap && (
        <div className="max-collectors-notice">
          <p>⚠️ You have reached the maximum collector limit ({collectorCap}). You cannot buy more collectors.</p>
        </div>
      )}

      <div className="shop-grid">
        {collectors
          .filter((c) => c.baseCost > 0)
          .map((c) => {
            if (c.unlockAt && cnp < c.unlockAt) {
              return (
                <div key={c.id} className="shop-card-locked">
                  <div className="locked-overlay">🔒</div>
                  <p>Unlock at {formatNumber(c.unlockAt)} CNP</p>
                </div>
              );
            }

            const amount = buyAmounts[c.id] || 1;
            const discountPercent = Math.min(50, Math.floor(amount / 5) * 5);
            const discountedCostPer = Math.round(
              c.baseCost * (1 - discountPercent / 100)
            );
            const totalCost = discountedCostPer * amount;
            const isThisProcessing = isProcessing[c.id];

            const incomePerHour = getIncomePerHour(c.baseIncome || 1);
            const incomePerCycle = getIncomePerCycle(c.baseIncome || 1, c.miningTime);

            return (
              <div
                key={c.id}
                className="shop-card-new glass fade-in"
                style={{ position: "relative" }}
              >
                <div className="animated-quote">
                  "{c.quote || "No quote available"}"
                </div>

                <div className="collector-main">
                  <div className="collector-portrait">
                    <img src={c.image} alt={c.name} onError={handleImageError} />
                    <div className="collector-name-bar">{c.name}</div>
                  </div>

                  <div className="collector-stats">
                    <div>
                      Per hour <strong>{incomePerHour}</strong> CNP
                    </div>
                    <div>
                      Collects <strong>{incomePerCycle}</strong> CNP per cycle
                    </div>
                    <div>
                      Mining time <strong>{formatTime(c.miningTime / 1000)}</strong>
                    </div>
                    <div>
                      Upgrade Cost <strong>{getUpgradeCost(c)}</strong> CNP
                    </div>
                  </div>
                </div>

                <div className="buy-controls-shop">
                  <button
                    className="amount-btn minus"
                    onClick={() => changeAmount(c.id, -1)}
                    disabled={isThisProcessing}
                  >
                    -
                  </button>

                  <span className="price-display">
                    {amount}x {formatNumber(totalCost)} CNP
                  </span>

                  <button
                    className="amount-btn plus"
                    onClick={() => changeAmount(c.id, 1)}
                    disabled={isThisProcessing || (ownedInstances.length + amount) >= collectorCap}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (ownedInstances.length >= collectorCap) {
                      showToast(`You have reached the maximum collector limit (${collectorCap}). You cannot buy more collectors.`, "error");
                      return;
                    }
                    if (cnp < totalCost) {
                      showToast(
                        `Not enough CNP! You have ${formatNumber(cnp)} CNP.`,
                        "error"
                      );
                      return;
                    }
                    setPendingPurchase({ id: c.id, amount, collector: c, totalCost });
                    setShowBuyConfirm(true);
                  }}
                  disabled={isThisProcessing || amount <= 0}
                  className={`buy-btn-full ${
                    isThisProcessing ? "processing" : ""
                  }`}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    cursor: isThisProcessing ? "not-allowed" : "pointer",
                    opacity: isThisProcessing ? 0.8 : 1,
                  }}
                >
                  {isThisProcessing ? (
                    <>
                      <span
                        className="spinner"
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid #fff",
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                          display: "inline-block",
                        }}
                      ></span>
                      Processing...
                    </>
                  ) : (
                    "BUY WITH CNP"
                  )}
                </button>

                {discountPercent > 0 && (
                  <div className="discount-label">-{discountPercent}% OFF</div>
                )}
              </div>
            );
          })}

      {/* === NYTT: Empty slots i Shop === */}
      {Array.from({ length: 2 }, (_, i) => (
        <div key={`shop-empty-${i}`} className="empty-collector-slot glass">
          <h3>Coming Soon</h3>
          <p>New collector drops every sunday</p>
        </div>
      ))}
      </div>

      {/* Buy confirmation modal */}
      {showBuyConfirm && pendingPurchase && (
        <div className="buy-confirm-modal-overlay">
          <div className="buy-confirm-modal">
            <h2 className="buy-confirm-title">Confirm Purchase</h2>
            <div className="buy-confirm-content">
              <div className="buy-confirm-collector">
                <img
                  src={pendingPurchase.collector.image}
                  alt={pendingPurchase.collector.name}
                  className="buy-confirm-image"
                  onError={(e) => e.target.src = "https://via.placeholder.com/100?text=Collector"}
                />
                <div className="buy-confirm-details">
                  <h4>{pendingPurchase.amount}x {pendingPurchase.collector.name}</h4>
                  <p className="buy-confirm-quote">"{pendingPurchase.collector.quote}"</p>
                  <div className="buy-confirm-stats">
                    <div>Cost: <strong>{formatNumber(pendingPurchase.totalCost)} CNP</strong></div>
                    <div>Per Hour: <strong>{getIncomePerHour(pendingPurchase.collector.baseIncome)} CNP</strong></div>
                    <div>Mining Time: <strong>{formatTime(pendingPurchase.collector.miningTime / 1000)}</strong></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="buy-confirm-buttons">
              <button
                className="btn-buy-confirm-yes"
                onClick={() => {
                  buyCollectors(pendingPurchase.id, pendingPurchase.amount);
                  setShowBuyConfirm(false);
                  setPendingPurchase(null);
                }}
              >
                YES
              </button>
              <button
                className="btn-buy-confirm-no"
                onClick={() => {
                  setShowBuyConfirm(false);
                  setPendingPurchase(null);
                }}
              >
                NO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS utan jsx global – injicerar globalt */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
