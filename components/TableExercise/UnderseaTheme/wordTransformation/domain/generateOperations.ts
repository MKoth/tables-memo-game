import DiffMatchPatch from 'diff-match-patch';
import {
  OPERATION_TYPES,
  type DiffOp,
  type Operation,
  type OperationType,
} from './types';

const VARIANT_CHARS = 'abcdefghijklmnopqrstuvwxyz';

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateRandomString(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += VARIANT_CHARS.charAt(Math.floor(Math.random() * VARIANT_CHARS.length));
  }
  return result;
}

/**
 * Produce distractor strings the same length as `correctText`, preferring real
 * insert texts from elsewhere in the table so the choices feel plausible.
 */
export function generateWrongVariants(
  correctText: string,
  allTableOperations: Operation[],
  operationType: OperationType,
  maxVariants = 4,
): string[] {
  const wrongVariants = new Set<string>();

  allTableOperations.forEach((op) => {
    if (
      op.type === operationType &&
      op.text !== correctText &&
      op.text.length === correctText.length
    ) {
      wrongVariants.add(op.text);
    }
  });

  let guard = 0;
  while (wrongVariants.size < maxVariants - 1 && guard < 100) {
    const randomText = generateRandomString(correctText.length);
    if (randomText !== correctText) {
      wrongVariants.add(randomText);
    }
    guard += 1;
  }

  return shuffleArray([correctText, ...Array.from(wrongVariants)]).slice(0, maxVariants);
}

export function diffToOps(diffs: [number, string][]): DiffOp[] {
  let index = 0;
  const ops: DiffOp[] = [];

  for (const [op, text] of diffs) {
    if (op === 0) {
      index += text.length;
    }

    if (op === -1) {
      ops.push({ type: 'delete', index, length: text.length, text });
    }

    if (op === 1) {
      ops.push({ type: 'insert', index, text });
      index += text.length;
    }
  }

  return ops;
}

export function generateWordOperations(
  baseWord: string,
  targetWord: string,
  allTableOperations: Operation[] = [],
): Operation[] {
  const dmp = new DiffMatchPatch();
  const diff = dmp.diff_main(baseWord, targetWord);
  dmp.diff_cleanupSemantic(diff);

  const rawOps = diffToOps(diff as [number, string][]);
  const operations: Operation[] = rawOps.map((op) => {
    if (op.type === 'delete') {
      return {
        type: OPERATION_TYPES.DELETE,
        index: op.index,
        length: op.length,
        text: op.text,
      };
    }
    return {
      type: OPERATION_TYPES.INSERT,
      index: op.index,
      text: op.text,
    };
  });

  operations.forEach((op) => {
    if (op.type === OPERATION_TYPES.INSERT) {
      op.variants = generateWrongVariants(
        op.text,
        allTableOperations,
        OPERATION_TYPES.INSERT,
      );
    }
  });

  return operations;
}
