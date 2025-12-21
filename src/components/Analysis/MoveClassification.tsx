import type { MoveClassification } from '../../types';
import {
  getMoveClassificationColor,
  getMoveClassificationIcon,
  getMoveClassificationLabel,
} from '../../utils/moveClassification';

interface MoveClassificationProps {
  classification: MoveClassification;
  centipawnLoss?: number;
}

export function MoveClassificationBadge({
  classification,
  centipawnLoss,
}: MoveClassificationProps) {
  const color = getMoveClassificationColor(classification);
  const icon = getMoveClassificationIcon(classification);
  const label = getMoveClassificationLabel(classification);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${color} bg-opacity-20`}>
      <span className="text-lg">{icon}</span>
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{label}</span>
        {centipawnLoss !== undefined && centipawnLoss > 0 && (
          <span className="text-xs opacity-75">-{centipawnLoss.toFixed(0)} cp</span>
        )}
      </div>
    </div>
  );
}
