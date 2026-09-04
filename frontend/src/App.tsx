import React from "react";
import { GameProvider } from "./context/GameContext";
import GameTable from "./components/GameTable";
import DealAnimation from "./components/DealAnimation";
import NotificationSlot from "./components/NotificationSlot";
import MatchEndModal from "./components/MatchEndModal";
import TrumpSelector from "./components/TrumpSelector";

export default function App() {
  return (
    <GameProvider>
      <GameTable />
      <DealAnimation />
      <NotificationSlot />
      <TrumpSelector />
      <MatchEndModal />
    </GameProvider>
  );
}
