interface BoardControlsProps {
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLast: () => void;
  onFlip: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  currentMove: number;
  totalMoves: number;
}

export function BoardControls({
  onFirst,
  onPrevious,
  onNext,
  onLast,
  onFlip,
  canGoPrevious,
  canGoNext,
  currentMove,
  totalMoves,
}: BoardControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Navigation buttons */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onFirst}
          disabled={!canGoPrevious}
          className="px-3 py-2 bg-chess-dark hover:bg-chess-darker disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          title="First move (Home)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="px-3 py-2 bg-chess-dark hover:bg-chess-darker disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          title="Previous move (←)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="px-3 py-2 bg-chess-dark hover:bg-chess-darker disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          title="Next move (→)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={onLast}
          disabled={!canGoNext}
          className="px-3 py-2 bg-chess-dark hover:bg-chess-darker disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          title="Last move (End)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        <div className="w-px h-8 bg-gray-600 mx-2" />

        <button
          onClick={onFlip}
          className="px-3 py-2 bg-chess-dark hover:bg-chess-darker rounded transition-colors"
          title="Flip board (F)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400 min-w-[60px]">
          Move {currentMove + 1}/{totalMoves}
        </span>
        <div className="flex-1 h-2 bg-chess-darker rounded-full overflow-hidden">
          <div
            className="h-full bg-chess-green transition-all duration-200"
            style={{
              width: `${totalMoves > 0 ? ((currentMove + 1) / totalMoves) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
