import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Layout/Header';
import { Footer } from './components/Layout/Footer';
import { ChessBoard } from './components/Board/ChessBoard';
import { EvaluationBar } from './components/Board/EvaluationBar';
import { BoardControls } from './components/Board/BoardControls';
import { MoveList } from './components/MoveList/MoveList';
import { EngineLines } from './components/Analysis/EngineLines';
import { GameReviewSummary } from './components/Analysis/GameReviewSummary';
import { GameSelector } from './components/GameImport/GameSelector';
import { ToastContainer } from './components/UI/Toast';
import { useChessGame } from './hooks/useChessGame';
import { useStockfish } from './hooks/useStockfish';
import { useGameImport } from './hooks/useGameImport';
import { useToast } from './hooks/useToast';
import { useFastGameReview } from './hooks/useFastGameReview';
import { calculateAccuracy } from './utils/accuracy';
import { identifyChess960Position } from './utils/chess960';
import type { AccuracyScore } from './types';

const REVIEW_DEPTHS = [12, 16, 18, 20, 24];

const EMPTY_ACCURACY: AccuracyScore = {
  white: null,
  black: null,
  whiteAvgCPLoss: null,
  blackAvgCPLoss: null,
};

function App() {
  const {
    game,
    currentMoveIndex,
    gameData,
    chess960,
    loadGame,
    goToMove,
    nextMove,
    previousMove,
    firstMove,
    lastMove,
    getCurrentFen,
    flipBoard,
    boardOrientation,
    replaceMoves,
  } = useChessGame();

  const {
    analyze,
    stop,
    pause,
    resume,
    isAnalyzing,
    currentEvaluation,
    bestMove,
    engineLines,
    depth,
    status: engineStatus,
    error: engineError,
  } = useStockfish();

  const {
    isLoading,
    error,
    chessComGames,
    lichessGames,
    fetchFromChessCom,
    fetchFromLichess,
    fetchLichessGameUrl,
    importPGN,
    importFEN,
    clearError,
  } = useGameImport();

  const { reviewGame, cancelReview, progress, isReviewing } = useFastGameReview();
  const { toasts, showToast, removeToast } = useToast();
  const [showImport, setShowImport] = useState(true);
  const [accuracy, setAccuracy] = useState<AccuracyScore>(EMPTY_ACCURACY);
  const [reviewDepth, setReviewDepth] = useState(12);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameData) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

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

  useEffect(() => {
    if (gameData && !isReviewing) {
      analyze(getCurrentFen(), { depth: 18, multiPv: 3 });
    }
  }, [currentMoveIndex, gameData, analyze, getCurrentFen, isReviewing]);

  useEffect(() => {
    if (engineStatus === 'error' && engineError) {
      showToast(engineError, 'error', 8000);
    }
  }, [engineStatus, engineError, showToast]);

  useEffect(() => {
    if (gameData?.moves.length) {
      setAccuracy(calculateAccuracy(gameData.moves));
    } else {
      setAccuracy(EMPTY_ACCURACY);
    }
  }, [gameData?.moves]);

  const handleReview = useCallback(async () => {
    if (!gameData) return;
    if (isReviewing) {
      await cancelReview();
      resume();
      return;
    }

    pause();
    showToast(`Starting game review at depth ${reviewDepth}...`, 'info', 2000);
    try {
      const result = await reviewGame(gameData.pgn, { depth: reviewDepth });
      if (result) {
        replaceMoves(result.moves);
        setAccuracy(result.accuracy);
        showToast('Game review completed!', 'success', 3000);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Review failed', 'error');
    } finally {
      resume();
    }
  }, [gameData, isReviewing, reviewDepth, cancelReview, pause, resume, reviewGame, replaceMoves, showToast]);

  const handleGameSelected = (pgn: string, startFen?: string) => {
    showToast('Loading game...', 'info', 2000);
    const result = loadGame(pgn, startFen);
    if (result.success) {
      setShowImport(false);
      setAccuracy(EMPTY_ACCURACY);
      showToast('Game loaded successfully!', 'success');
    } else {
      showToast(result.error || 'Failed to load game. Please check the PGN format.', 'error');
    }
  };

  const handleNewGame = () => {
    setShowImport(true);
    stop();
  };

  const chess960Position = gameData?.startFen
    ? identifyChess960Position(gameData.startFen)
    : null;

  const reviewPercent =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-chess-darker">
      <ToastContainer toasts={toasts} onClose={removeToast} />
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
              importPGN={importPGN}
              importFEN={importFEN}
              showToast={showToast}
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
          <div className="flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_656px_minmax(0,1fr)] gap-6 items-start">
            <div className="space-y-4 xl:max-w-md min-w-0 w-full">
              <div className="bg-chess-dark rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-white">Game Info</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleReview}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        isReviewing
                          ? 'bg-red-600 hover:bg-red-500 text-white'
                          : 'bg-green-600 hover:bg-green-500 text-white'
                      }`}
                    >
                      {isReviewing ? `Cancel ${reviewPercent}%` : 'Review'}
                    </button>
                    <button
                      onClick={handleNewGame}
                      className="px-3 py-1 text-sm bg-chess-darker hover:bg-opacity-80 rounded transition-colors"
                    >
                      Back
                    </button>
                  </div>
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
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="review-depth" className="text-gray-400">
                      Review depth
                    </label>
                    <select
                      id="review-depth"
                      value={reviewDepth}
                      disabled={isReviewing}
                      onChange={(event) => setReviewDepth(Number(event.target.value))}
                      title="Higher depth is more accurate and takes longer"
                      className="bg-chess-darker border border-white/10 rounded px-2 py-1 text-white disabled:opacity-50"
                    >
                      {REVIEW_DEPTHS.map((depthOption) => (
                        <option key={depthOption} value={depthOption}>
                          {depthOption}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <GameReviewSummary
                whiteAccuracy={accuracy.white}
                blackAccuracy={accuracy.black}
                whiteName={gameData.info.white}
                blackName={gameData.info.black}
                whiteElo={gameData.info.whiteElo}
                blackElo={gameData.info.blackElo}
                moves={gameData.moves}
                onCategoryClick={(category, color) => {
                  if (!gameData) return;

                  let nextIndex = -1;
                  const startIndex = currentMoveIndex + 1;

                  for (let i = startIndex; i < gameData.moves.length; i++) {
                    const move = gameData.moves[i];
                    const moveColor = i % 2 === 0 ? 'white' : 'black';
                    if (move.classification === category && moveColor === color) {
                      nextIndex = i;
                      break;
                    }
                  }

                  if (nextIndex === -1) {
                    for (let i = 0; i < startIndex; i++) {
                      const move = gameData.moves[i];
                      const moveColor = i % 2 === 0 ? 'white' : 'black';
                      if (move.classification === category && moveColor === color) {
                        nextIndex = i;
                        break;
                      }
                    }
                  }

                  if (nextIndex !== -1) {
                    goToMove(nextIndex);
                  } else {
                    showToast(`No ${category} moves found for ${color}`, 'info');
                  }
                }}
              />

              <EngineLines lines={engineLines} depth={depth} />
            </div>

            <div className="flex flex-col items-center gap-4 shrink-0 max-w-full">
              <div className="flex items-center gap-4">
                <EvaluationBar
                  evaluation={currentEvaluation}
                  status={engineStatus}
                  isAnalyzing={isAnalyzing}
                  height={600}
                />
                <ChessBoard
                  game={game}
                  fen={game.fen()}
                  orientation={boardOrientation}
                  bestMove={bestMove}
                  playedMove={
                    currentMoveIndex >= 0 ? gameData.moves[currentMoveIndex] : null
                  }
                  chess960={chess960}
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

              <div className="h-5 text-sm text-center overflow-hidden">
                {engineStatus === 'error' && (
                  <span className="text-red-400">
                    {engineError || 'Engine failed to start.'}
                  </span>
                )}
                {engineStatus === 'booting' && (
                  <span className="text-gray-400">Starting engine…</span>
                )}
                {engineStatus === 'ready' && isAnalyzing && !isReviewing && (
                  <span className="text-gray-400">Analyzing… (Depth: {depth})</span>
                )}
                {isReviewing && (
                  <span className="text-gray-400">
                    Reviewing {progress.current}/{progress.total} positions
                  </span>
                )}
              </div>
            </div>

            <div className="xl:max-w-md min-w-0 w-full">
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
