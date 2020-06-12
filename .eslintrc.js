module.exports = {
    env: {
        commonjs: true,
        es6: true,
        node: true,
    },
    extends: 'google',
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
    },
    parserOptions: {
        ecmaVersion: 2018,
    },
    rules: {
        'indent': ['error', 4],
        'object-curly-spacing': [
            'error',
            'always',
            { objectsInObjects: true, arraysInObjects: true },
        ],
    },
};
