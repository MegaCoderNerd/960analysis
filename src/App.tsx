import { useState, useEffect, useCallback, useRef } from 'react';
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
import { calculateAccuracy } from './utils/accuracy';
import { identifyChess960Position } from './utils/chess960';
import { classifyMove, calculateCentipawnLoss } from './utils/moveClassification';
import type { AnalyzedMove } from './types';

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
    updateMove,
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
    importPGN,
    importFEN,
    clearError,
  } = useGameImport();

  const { toasts, showToast, removeToast } = useToast();
  const [showImport, setShowImport] = useState(true);
  const [accuracy, setAccuracy] = useState({ white: 0, black: 0, whiteAvgCPLoss: 0, blackAvgCPLoss: 0 });


  // Game Review State
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(-1); // -1 = start pos, 0 = after move 0, etc.
  const [reviewData, setReviewData] = useState<{ eval: number; bestMove: string | null }[]>([]);

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

  // Analyze current position when move changes or game loads
  useEffect(() => {
    if (gameData && !isReviewing) {
      const fen = getCurrentFen();
      analyze(fen, { depth: 18 });
    }
  }, [currentMoveIndex, gameData, analyze, getCurrentFen, isReviewing]);

  // Game Review Logic
  const startReview = useCallback(() => {
    if (!gameData) return;
    setIsReviewing(true);
    setReviewIndex(-1); // Start with initial position
    setReviewData([]);
    goToMove(-1); // Go to start
    showToast('Starting game review...', 'info', 2000);
  }, [gameData, goToMove, showToast]);


  // Trigger analysis for review step
  useEffect(() => {
    if (!isReviewing || !gameData) return;
    
    // Ensure board is at the right move
    if (currentMoveIndex !== reviewIndex) {
      goToMove(reviewIndex);
      return; // Wait for move update
    }

    // If we are not analyzing, start analysis for this position
    // But we need to make sure we haven't already analyzed it.
    // We can check reviewData length.
    // reviewIndex starts at -1. reviewData index 0 corresponds to reviewIndex -1 (start pos).
    // So if reviewData.length === reviewIndex + 1, we need to analyze.
    
    if (!isAnalyzing && reviewData.length === reviewIndex + 1) {
      const fen = getCurrentFen();
      analyze(fen, { depth: 15 }); // Lower depth for faster review
    }
  }, [isReviewing, reviewIndex, currentMoveIndex, gameData, isAnalyzing, reviewData.length, analyze, getCurrentFen, goToMove]);

  // Handle analysis completion during review
  useEffect(() => {
    if (!isReviewing || !gameData) return;

    // If analysis just finished (isAnalyzing became false) AND we have a result
    // AND we are waiting for this result (reviewData.length === reviewIndex + 1)
    // Wait, this effect runs when isAnalyzing changes.
    // If isAnalyzing is false, and we have currentEvaluation...
    
    if (!isAnalyzing && currentEvaluation !== null && reviewData.length === reviewIndex + 1) {
      // Save result
      const newReviewData = [...reviewData, { eval: currentEvaluation, bestMove }];
      setReviewData(newReviewData);
      
      // If this was not the start position (reviewIndex > -1), we can classify the move that led here
      if (reviewIndex > -1) {
        const moveIndex = reviewIndex; // The move we just made to get here
        // We need:
        // 1. Eval before move (from reviewData[reviewIndex]) -> This is best move score for side to move
        // 2. Eval after move (currentEvaluation) -> This is score for opponent
        
        const prevPosData = reviewData[reviewIndex]; // Data for position BEFORE the move
        const bestEvalBefore = prevPosData.eval;
        const currentEval = currentEvaluation;
        
        // Calculate classification
        // Note: currentEval is from opponent's perspective.
        // So actual score of the move is -currentEval.
        
        const classification = classifyMove(
          -currentEval, // Actual score of the move
          bestEvalBefore, // Use bestEvalBefore as previousEval
          bestEvalBefore, // Best possible score
          false, // isBookMove (todo)
          moveIndex + 1
        );
        
        const cpLoss = calculateCentipawnLoss(-currentEval, bestEvalBefore, bestEvalBefore);
        
        updateMove(moveIndex, {
          evaluation: -currentEval, // Store from perspective of player who moved
          classification,
          centipawnLoss: cpLoss,
          bestMove: prevPosData.bestMove || undefined
        });
      }
      
      // Move to next position
      if (reviewIndex < gameData.moves.length - 1) {
        setReviewIndex(prev => prev + 1);
      } else {
        // Finished
        setIsReviewing(false);
        showToast('Game review completed!', 'success', 3000);
        // Trigger accuracy update
        // We need to wait for the last state update to propagate?
        // calculateAccuracy reads from 'moves'. updateMove updates 'moves'.
        // We can just call it with the updated moves if we had them, but we don't have the full list here easily.
        // We can rely on the effect below or just set a flag.
      }
    }
  }, [isAnalyzing, isReviewing, currentEvaluation, bestMove, reviewData, reviewIndex, gameData, updateMove, showToast]);

  // Update accuracy when moves change
  useEffect(() => {
    if (gameData?.moves.length) {
       const acc = calculateAccuracy(gameData.moves);
       setAccuracy(acc);
    }
  }, [gameData?.moves]);

  const handleGameSelected = (pgn: string, startFen?: string) => {
    showToast('Loading game...', 'info', 2000);
    
    const success = loadGame(pgn, startFen);
    if (success) {
      setShowImport(false);
      showToast('Game loaded successfully!', 'success');
    } else {
      showToast('Failed to load game. Please check the PGN format.', 'error');
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
          <div className="flex flex-col xl:grid xl:grid-cols-[minmax(300px,1fr)_auto_minmax(300px,1fr)] gap-6">
            {/* Left sidebar - Game info and accuracy */}
            <div className="space-y-4 xl:max-w-md">
              <div className="bg-chess-dark rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-white">Game Info</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={startReview}
                      disabled={isReviewing}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        isReviewing
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-500 text-white'
                      }`}
                    >
                      {isReviewing ? `${Math.round(((reviewIndex + 2) / ((gameData?.moves.length || 0) + 1)) * 100)}%` : 'Review'}
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
                </div>
              </div>

              <GameReviewSummary
                whiteAccuracy={accuracy.white}
                blackAccuracy={accuracy.black}
                whiteName={gameData.info.white}
                blackName={gameData.info.black}
                moves={gameData.moves}
                onCategoryClick={(category, color) => {
                  if (!gameData) return;
                  
                  // Find next move with this classification and color
                  // Start searching from current move + 1
                  let nextIndex = -1;
                  const startIndex = currentMoveIndex + 1;
                  
                  // Search forward
                  for (let i = startIndex; i < gameData.moves.length; i++) {
                    const move = gameData.moves[i];
                    const isWhite = i % 2 === 0;
                    const moveColor = isWhite ? 'white' : 'black';
                    
                    if (move.classification === category && moveColor === color) {
                      nextIndex = i;
                      break;
                    }
                  }
                  
                  // If not found, wrap around and search from beginning
                  if (nextIndex === -1) {
                    for (let i = 0; i < startIndex; i++) {
                      const move = gameData.moves[i];
                      const isWhite = i % 2 === 0;
                      const moveColor = isWhite ? 'white' : 'black';
                      
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

            {/* Center - Board */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <EvaluationBar evaluation={currentEvaluation} height={600} />
                <ChessBoard
                  game={game}
                  fen={game.fen()}
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
            <div className="xl:max-w-md">
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
