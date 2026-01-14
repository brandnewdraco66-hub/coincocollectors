// CollectorMiningCard.jsx - UPPDATERAD VERSION (2026-01-05) – Fixad av Grok
// Special premium design för Starter Collector med Binance Chain-logo
// Bättre knappar med ikoner endast för Starter
// All original logik, props och struktur bevarad – ingenting borttaget

import React, { useState, useEffect } from "react";

export default function CollectorMiningCard({
  instance,
  template,
  miningStatus,        // { startedAt } | null
  progress,            // optional 0–1 (kan komma från Game.jsx)
  isStarter,
  isLoggedIn,
  cnp,
  upgradeCost,
  onActivate,
  onUpgrade,
  onSell,
  onCollect,
  BOOST_MULTIPLIER = 1,
  boostedCollectors = [],
  boostEndTime = 0,
  getIncomePerHour = () => 0,
  getIncomePerCycle = () => 0,
  formatNumber = v => v,
  formatMiningTime = v => v,
  formatElapsedTime = v => v,
  getBoostTimeLeft = () => ""
}) {
  if (!template) {
    return (
      <div className="collector-card glass fade-in" style={{ padding: '20px', color: 'red' }}>
        <h3>Error: Collector template not found</h3>
        <p>Collector ID: {instance?.collectorId || 'unknown'}</p>
        <p>Instance ID: {instance?.instanceId || 'unknown'}</p>
      </div>
    );
  }

  const [tick, setTick] = useState(0);
  const [localLastClaimTime, setLocalLastClaimTime] = useState(null);
  const [showSellConfirm, setShowSellConfirm] = useState(false);

  useEffect(() => {
    // Load persisted lastClaimTime from localStorage, prioritizing it over backend data
    const stored = localStorage.getItem(`lastClaimTime_${instance.instanceId}`);
    if (stored) {
      setLocalLastClaimTime(parseInt(stored));
    } else if (miningStatus?.lastClaimAt) {
      setLocalLastClaimTime(miningStatus.lastClaimAt);
    }
  }, [instance.instanceId, miningStatus?.lastClaimAt]);

  useEffect(() => {
    if (!miningStatus?.startedAt) return;

    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [miningStatus?.startedAt, miningStatus?.lastClaimAt]);

  const isMining = Boolean(miningStatus?.startedAt);

  // 🔁 Progress: använd prop om den finns, annars räkna lokalt
  const computedProgress = isMining
    ? Math.min(
        (Date.now() - miningStatus.startedAt) / template.miningTime,
        1
      )
    : 0;

  const finalProgress =
    typeof progress === "number" ? progress : computedProgress;

  const clampedProgress = Math.min(Math.max(finalProgress, 0), 1);

  const secondsLeft = isMining
    ? Math.max(
        0,
        Math.ceil(
          ((1 - clampedProgress) * template.miningTime) / 1000
        )
      )
    : 0;

  const isBoosted =
    boostEndTime > Date.now() &&
    boostedCollectors.includes(instance.instanceId);

  const currentIncome = instance.currentIncome || 0;
  const multiplier = isBoosted ? BOOST_MULTIPLIER : 1;
  const effectiveIncome = currentIncome * multiplier;

  // Calculate accumulated since last claim (or since start if never claimed)
  const lastClaimTime = localLastClaimTime || miningStatus?.lastClaimAt || miningStatus?.startedAt || Date.now();
  const now = Date.now();
  const accumulatedCNP = isMining && lastClaimTime
    ? Math.max(0, ((now - lastClaimTime) / 1000) * effectiveIncome)
    : 0;

  return (
    <div className={`collector-card-dashboard glass fade-in ${isStarter ? 'starter-special' : ''}`}>
      {showSellConfirm ? (
        // Sell confirmation popup
        <div className="sell-confirm-popup">
          <h3 className="sell-confirm-title">Are you sure you want to sell this collector?</h3>
          <p className="sell-confirm-subtitle">You will get {formatNumber(Math.floor(template.baseCost / 2))} CNP back</p>
          <div className="sell-confirm-buttons">
            <button
              className="btn-sell-confirm-yes"
              onClick={() => {
                onSell();
                setShowSellConfirm(false);
              }}
            >
              YES
            </button>
            <button
              className="btn-sell-confirm-no"
              onClick={() => setShowSellConfirm(false)}
            >
              NO
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Special header för Starter med Binance Chain-logo */}
          {isStarter && (
            <div className="starter-header">
              <img
                src="/images/BN.png" // Din Binance Chain-logo här
                alt="Binance Chain"
                className="binance-chain-logo-starter"
              />
              <h2 className="collector-name-dashboard starter-title">
                STARTER COIN COLLECTOR
              </h2>
              <p className="collector-quote-dashboard starter-quote">
                "Your journey to riches begins here!"
              </p>
            </div>
          )}

          {/* Vanlig header för andra collectors */}
          {!isStarter && (
            <p className="collector-quote-dashboard">
              {template.quote || template.description || `"${template.name} quote"`}
            </p>
          )}

          {/* Bild + stats sida vid sida */}
          <div className="collector-main-dashboard">
            <div className="collector-image-wrapper">
              <img
                src={template.image || "/images/placeholder.jpg"}
                alt={template.name}
                className="collector-image-dashboard"
              />
            </div>

            {isStarter ? (
              <div className="collector-stats-dashboard starter-layout">
                <div className="collector-stat-dashboard">
                  <span className="collector-stat-label">Mining time</span>
                  <span className="collector-stat-value">{formatMiningTime(template.miningTime / 1000)}</span>
                </div>
                <div className="collector-stat-dashboard">
                  <span className="collector-stat-label">Per hour</span>
                  <span className="collector-stat-value">
                    {formatNumber(getIncomePerHour(instance.currentIncome, isBoosted ? BOOST_MULTIPLIER : 1))} CNP
                  </span>
                </div>
                <div className="collector-stat-dashboard">
                  <span className="collector-stat-label">Upgrade cost</span>
                  <span className="collector-stat-value">{formatNumber(upgradeCost)} CNP</span>
                </div>
                <div className="collector-stat-dashboard">
                  <span className="collector-stat-label">Claimable</span>
                  <span className="collector-stat-value">{formatNumber(Math.floor(accumulatedCNP))} CNP</span>
                </div>
              </div>
            ) : (
              <div className="collector-stats-dashboard">
                <div className="collector-stat-dashboard">
                  <span className="collector-stat-label">Level</span>
                  <span className="collector-stat-value">{instance.level} / {template.maxLevel || 50}</span>
                </div>
                <div className="collector-stat-dashboard">
                  <span className="collector-stat-label">Per hour</span>
                  <span className="collector-stat-value">
                    {formatNumber(getIncomePerHour(instance.currentIncome, isBoosted ? BOOST_MULTIPLIER : 1))} CNP
                  </span>
                </div>
                <div className="collector-stat-dashboard">
                  <span className="collector-stat-label">Per cycle</span>
                  <span className="collector-stat-value">
                    {formatNumber(getIncomePerCycle(instance.currentIncome, template.miningTime, isBoosted ? BOOST_MULTIPLIER : 1))} CNP
                  </span>
                </div>
                <div className="collector-stat-dashboard">
                  <span className="collector-stat-label">Mining time</span>
                  <span className="collector-stat-value">{formatMiningTime(template.miningTime / 1000)}</span>
                </div>
                <div className="collector-stat-dashboard">
                  <span className="collector-stat-label">Upgrade cost</span>
                  <span className="collector-stat-value">{formatNumber(upgradeCost)} CNP</span>
                </div>
                <div className="collector-stat-dashboard">
                  <span className="collector-stat-label">Collectable</span>
                  <span className="collector-stat-value">{formatNumber(Math.floor(accumulatedCNP))} CNP</span>
                </div>
              </div>
            )}
          </div>

          {/* Namn för icke-Starter */}
          {!isStarter && (
            <h3 className="collector-name-dashboard">{template.name}</h3>
          )}

          {/* Progress bar */}
          <div className="progress-container-dashboard">
            <div
              className="progress-bar-dashboard"
              style={{ width: `${isMining ? Math.max(clampedProgress * 100, 5) : 5}%` }}
            />
          </div>

          {/* Ready / Mining text */}
          <p className="progress-text-dashboard">
            {isMining
              ? `Ready: ${formatNumber(Math.floor(accumulatedCNP))} CNP`
              : "Idle"}
          </p>

          {/* Knappar längst ner */}
          <div className="collector-actions-dashboard">
            <div className="collector-actions-row">
              {!isMining ? (
                <button
                  className="btn-activate-dashboard"
                  onClick={onActivate}
                  disabled={!isLoggedIn}
                >
                  {isStarter && <span className="btn-icon">⚡</span>}
                  ACTIVATE
                </button>
              ) : (
                <button
                  className="btn-activate-dashboard"
                  onClick={() => {
                    const now = Date.now();
                    setLocalLastClaimTime(now);
                    localStorage.setItem(`lastClaimTime_${instance.instanceId}`, now.toString());
                    setTick(prev => prev + 1);
                    onCollect();
                  }}
                  disabled={!isLoggedIn || accumulatedCNP < 0.01}
                >
                  {isStarter && <span className="btn-icon">💰</span>}
                  COLLECT
                  <span className="collect-amount-dashboard">
                    {accumulatedCNP >= 1 ? formatNumber(Math.floor(accumulatedCNP)) : accumulatedCNP.toFixed(2)} CNP
                  </span>
                </button>
              )}

              {!isStarter && (
                <button
                  className="btn-upgrade-dashboard"
                  onClick={onUpgrade}
                >
                  UPGRADE
                </button>
              )}
            </div>

            {!isStarter && (
              <div className="collector-actions-row">
                <button
                  className="btn-sell-dashboard"
                  onClick={() => setShowSellConfirm(true)}
                >
                  SELL
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}