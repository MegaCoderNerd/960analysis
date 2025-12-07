import { useState, useEffect } from 'react';
import { Header } from './components/Layout/Header';
import { Footer } from './components/Layout/Footer';
import { ChessBoard } from './components/Board/ChessBoard';
import { EvaluationBar } from './components/Board/EvaluationBar';
import { BoardControls } from './components/Board/BoardControls';
import { MoveList } from './components/MoveList/MoveList';
import { EngineLines } from './components/Analysis/EngineLines';
import { AccuracyDisplay } from './components/Analysis/AccuracyDisplay';
import { GameSelector } from './components/GameImport/GameSelector';
import { useChessGame } from './hooks/useChessGame';
import { useStockfish } from './hooks/useStockfish';
import { useGameImport } from './hooks/useGameImport';
import { calculateAccuracy } from './utils/accuracy';
import { identifyChess960Position } from './utils/chess960';

function App() {
  const {
    game,
    currentMoveIndex,
    gameData,
    loadGame,
    goToMove,
    nextMove,
    previousMove,
    firstMove,
    lastMove,
    getCurrentFen,
    flipBoard,
    boardOrientation,
  } = useChessGame();

  const {
    analyze,
    stop,
    isAnalyzing,
    currentEvaluation,
    bestMove,
    engineLines,
    depth,
  } = useStockfish();

  const {
    isLoading,
    error,
    chessComGames,
    lichessGames,
    fetchFromChessCom,
    fetchFromLichess,
    fetchLichessGameUrl,
    clearError,
  } = useGameImport();

  const [showImport, setShowImport] = useState(true);
  const [accuracy, setAccuracy] = useState({ white: 0, black: 0, whiteAvgCPLoss: 0, blackAvgCPLoss: 0 });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameData) return;

      switch (e.key) {
        case 'ArrowLeft':
          previousMove();
          break;
        case 'ArrowRight':
          nextMove();
          break;
        case 'Home':
          firstMove();
          break;
        case 'End':
          lastMove();
          break;
        case 'f':
        case 'F':
          flipBoard();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameData, nextMove, previousMove, firstMove, lastMove, flipBoard]);

  // Analyze current position when move changes
  useEffect(() => {
    if (gameData && currentMoveIndex >= 0) {
      const fen = getCurrentFen();
      analyze(fen, { depth: 18 });
    }
  }, [currentMoveIndex, gameData, analyze, getCurrentFen]);

  const handleGameSelected = (pgn: string, startFen?: string) => {
    const success = loadGame(pgn, startFen);
    if (success) {
      setShowImport(false);
      // Calculate accuracy
      if (gameData?.moves) {
        const acc = calculateAccuracy(gameData.moves);
        setAccuracy(acc);
      }
    }
  };

  const handleNewGame = () => {
    setShowImport(true);
    stop();
  };

  // Get Chess960 position number if applicable
  const chess960Position = gameData?.startFen
    ? identifyChess960Position(gameData.startFen)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-chess-darker">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {showImport ? (
          <div className="max-w-2xl mx-auto">
            <GameSelector
              onGameSelected={handleGameSelected}
              chessComGames={chessComGames}
              lichessGames={lichessGames}
              onFetchChessCom={fetchFromChessCom}
              onFetchLichess={fetchFromLichess}
              onFetchLichessUrl={fetchLichessGameUrl}
              isLoading={isLoading}
            />
            {error && (
              <div className="mt-4 p-4 bg-red-900 bg-opacity-50 rounded-lg text-red-200">
                <p className="font-semibold">Error</p>
                <p>{error}</p>
                <button
                  onClick={clearError}
                  className="mt-2 text-sm underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        ) : gameData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left sidebar - Game info and accuracy */}
            <div className="space-y-4">
              <div className="bg-chess-dark rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-white">Game Info</h2>
                  <button
                    onClick={handleNewGame}
                    className="px-3 py-1 text-sm bg-chess-darker hover:bg-opacity-80 rounded transition-colors"
                  >
                    New Game
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">Event:</span>{' '}
                    <span className="text-white">{gameData.info.event || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Date:</span>{' '}
                    <span className="text-white">{gameData.info.date}</span>
                  </div>
                  {chess960Position && (
                    <div>
                      <span className="text-gray-400">Chess960 Position:</span>{' '}
                      <span className="text-chess-green font-semibold">#{chess960Position}</span>
                    </div>
                  )}
                </div>
              </div>

              <AccuracyDisplay
                whiteAccuracy={accuracy.white}
                blackAccuracy={accuracy.black}
                whiteAvgCPLoss={accuracy.whiteAvgCPLoss}
                blackAvgCPLoss={accuracy.blackAvgCPLoss}
                whiteName={gameData.info.white}
                blackName={gameData.info.black}
              />

              <EngineLines lines={engineLines} depth={depth} />
            </div>

            {/* Center - Board */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <EvaluationBar evaluation={currentEvaluation} height={600} />
                <ChessBoard
                  game={game}
                  orientation={boardOrientation}
                  bestMove={bestMove}
                  width={600}
                  height={600}
                />
              </div>

              <BoardControls
                onFirst={firstMove}
                onPrevious={previousMove}
                onNext={nextMove}
                onLast={lastMove}
                onFlip={flipBoard}
                canGoPrevious={currentMoveIndex >= 0}
                canGoNext={currentMoveIndex < gameData.moves.length - 1}
                currentMove={currentMoveIndex}
                totalMoves={gameData.moves.length}
              />

              {isAnalyzing && (
                <div className="text-sm text-gray-400">
                  Analyzing... (Depth: {depth})
                </div>
              )}
            </div>

            {/* Right sidebar - Move list */}
            <div>
              <MoveList
                moves={gameData.moves}
                currentMoveIndex={currentMoveIndex}
                onMoveClick={goToMove}
              />
            </div>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}

export default App;
