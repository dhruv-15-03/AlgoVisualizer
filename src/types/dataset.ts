export interface Dataset {
  id: string;
  name: string;
  description: string;
  /** Feature matrix, shape [nSamples, nFeatures]. For image datasets, each row is a flattened image of length height*width. */
  X: number[][];
  /** Target vector for supervised algos; null for unsupervised demos. */
  y: number[] | null;
  featureNames: string[];
  /** For classification: human-readable class labels. */
  classNames?: string[];
  /** 'classification' | 'regression' | 'clustering' | 'reinforcement'. */
  task: 'classification' | 'regression' | 'clustering' | 'reinforcement';
  source: string;
  /** Present only for image datasets — tells the viz layer to render rows as images. */
  imageShape?: { height: number; width: number };
}

export interface DatasetInfo {
  id: string;
  name: string;
  description: string;
  task: Dataset['task'];
  samples: number;
  features: number;
  classes: number | null;
  source: string;
  imageShape?: { height: number; width: number };
}
