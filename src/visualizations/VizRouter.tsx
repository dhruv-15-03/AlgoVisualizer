import type { Dataset } from '@/types/dataset';
import type { TraceEvent, AlgorithmFamily } from '@/types/trace';
import { KMeansViz } from './KMeansViz';
import { LinRegViz } from './LinRegViz';
import { LogRegViz } from './LogRegViz';
import { DTreeViz } from './DTreeViz';
import { BoundaryViz } from './BoundaryViz';
import { ClusterViz } from './ClusterViz';
import { ProjectionViz } from './ProjectionViz';
import { MLPViz } from './MLPViz';
import { ForestViz } from './ForestViz';
import { PolyRegViz } from './PolyRegViz';
import { CNNViz } from './CNNViz';
import { RLViz } from './RLViz';

interface VizRouterProps {
  family: AlgorithmFamily;
  dataset: Dataset;
  events: TraceEvent[];
  currentStep: number;
}

export function VizRouter({ family, dataset, events, currentStep }: VizRouterProps) {
  const props = { dataset, events, currentStep };
  switch (family) {
    case 'kmeans':
      return <KMeansViz {...props} />;
    case 'linreg':
      return <LinRegViz {...props} />;
    case 'polyreg':
      return <PolyRegViz {...props} />;
    case 'logreg':
      return <LogRegViz {...props} />;
    case 'dtree':
      return <DTreeViz {...props} />;
    case 'boundary':
      return <BoundaryViz {...props} />;
    case 'cluster':
      return <ClusterViz {...props} />;
    case 'projection':
      return <ProjectionViz {...props} />;
    case 'mlp':
      return <MLPViz {...props} />;
    case 'forest':
      return <ForestViz {...props} />;
    case 'cnn':
      return <CNNViz {...props} />;
    case 'rl':
      return <RLViz {...props} />;
    default:
      return (
        <div className="grid h-full place-items-center text-sm text-ink-400">
          No visualization for family <span className="ml-1 font-mono">{family}</span>.
        </div>
      );
  }
}
