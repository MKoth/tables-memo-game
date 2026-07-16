module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '\\.(mp3|m4a|wav|ogg)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
