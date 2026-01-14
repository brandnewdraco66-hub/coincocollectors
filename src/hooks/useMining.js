import { useEffect, useState } from "react";

export default function useMining({
  activeMining,
  setActiveMining,
  ownedInstancesRef
}) {
  const [miningStatus, setMiningStatus] = useState({});

  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now();
      const nextStatus = {};
      const finished = [];

      Object.entries(activeMining).forEach(([instanceId, data]) => {
        const instance = ownedInstancesRef.current.find(
          i => i.instanceId === instanceId
        );

        if (!instance) {
          finished.push(instanceId);
          return;
        }

        if (now >= data.endTime) {
          finished.push(instanceId);
          return;
        }

        const totalMs = data.endTime - data.startTime;
        const elapsed = now - data.startTime;

        nextStatus[instanceId] = {
          progress: Math.min(100, (elapsed / totalMs) * 100),
          secondsLeft: Math.max(
            0,
            Math.floor((data.endTime - now) / 1000)
          )
        };
      });

      setMiningStatus(nextStatus);

      if (finished.length > 0) {
        setActiveMining(prev => {
          const copy = { ...prev };
          finished.forEach(id => delete copy[id]);
          return copy;
        });
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [activeMining, setActiveMining, ownedInstancesRef]);

  const getMiningStatus = (instance) => {
    const status = activeMining[instance.instanceId];
    if (!status) return null;
    return { startedAt: status.startedAt || status.startTime };
  };

  return {
    miningStatus,
    getMiningStatus
  };
}
