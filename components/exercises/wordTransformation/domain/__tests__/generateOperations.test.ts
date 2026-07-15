import {
  diffToOps,
  generateWordOperations,
  type GenerateOperationsOptions,
} from '../generateOperations';
import { OPERATION_TYPES, type Operation } from '../types';

const identityShuffle = <T>(items: T[]): T[] => items;

const deterministicOptions: GenerateOperationsOptions = {
  shuffle: identityShuffle,
  randomInt: () => 0,
};

const lengthOneInsertPool: Operation[] = [
  { type: OPERATION_TYPES.INSERT, index: 0, text: 'a' },
  { type: OPERATION_TYPES.INSERT, index: 0, text: 'e' },
  { type: OPERATION_TYPES.INSERT, index: 0, text: 'i' },
];

describe('diffToOps', () => {
  it.each<[string, [number, string][], ReturnType<typeof diffToOps>]>([
    [
      'equal segment only advances the cursor',
      [[0, 'hello']],
      [],
    ],
    [
      'delete at end of shared prefix',
      [
        [0, 'habl'],
        [-1, 'ar'],
      ],
      [{ type: 'delete', index: 4, length: 2, text: 'ar' }],
    ],
    [
      'insert at end of shared prefix',
      [
        [0, 'habl'],
        [1, 'o'],
      ],
      [{ type: 'insert', index: 4, text: 'o' }],
    ],
    [
      'delete then insert at the same index',
      [
        [0, 'habl'],
        [-1, 'ar'],
        [1, 'o'],
      ],
      [
        { type: 'delete', index: 4, length: 2, text: 'ar' },
        { type: 'insert', index: 4, text: 'o' },
      ],
    ],
    [
      'multiple equal segments keep index aligned',
      [
        [0, 'ha'],
        [1, 'X'],
        [0, 'bl'],
        [-1, 'ar'],
      ],
      [
        { type: 'insert', index: 2, text: 'X' },
        { type: 'delete', index: 5, length: 2, text: 'ar' },
      ],
    ],
  ])('%s', (_label, diffs, expected) => {
    expect(diffToOps(diffs)).toEqual(expected);
  });
});

describe('generateWordOperations', () => {
  it('maps a delete-only word pair to a single delete operation', () => {
    expect(generateWordOperations('hablar', 'habl')).toEqual([
      {
        type: OPERATION_TYPES.DELETE,
        index: 4,
        length: 2,
        text: 'ar',
      },
    ]);
  });

  it('maps an insert-only word pair to a single insert operation with variants', () => {
    expect(
      generateWordOperations('habl', 'hablo', lengthOneInsertPool, deterministicOptions),
    ).toEqual([
      {
        type: OPERATION_TYPES.INSERT,
        index: 4,
        text: 'o',
        variants: ['o', 'a', 'e', 'i'],
      },
    ]);
  });

  it('maps a mixed transform to delete then insert operations', () => {
    expect(
      generateWordOperations('hablar', 'hablo', lengthOneInsertPool, deterministicOptions),
    ).toEqual([
      {
        type: OPERATION_TYPES.DELETE,
        index: 4,
        length: 2,
        text: 'ar',
      },
      {
        type: OPERATION_TYPES.INSERT,
        index: 4,
        text: 'o',
        variants: ['o', 'a', 'e', 'i'],
      },
    ]);
  });
});
