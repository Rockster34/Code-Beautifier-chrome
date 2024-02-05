const MODE_LANGUAGE_MAP = {
    css: {
        name: 'CSS',
        types: ['text/css'],
    },
    less: {
        name: 'LESS',
        types: ['text/x-less'],
    },
    scss: {
        name: 'SCSS',
        types: ['text/x-scss'],
    },
    sass: {
        name: 'SASS',
        types: ['text/x-sass'],
    },
    md: {
        name: 'Markdown',
        types: ['text/markdown', 'text/x-markdown'],
    },
    js: {
        name: 'JavaScript',
        types: ['text/javascript', 'application/javascript', 'application/x-javascript', 'text/ecmascript', 'application/ecmascript'],
    },
    jsx: {
        name: 'JSX',
        types: ['text/jsx', 'text/typescript-jsx'],
    },
    ts: {
        name: 'TypeScript',
        types: ['text/typescript', 'application/typescript'],
    },
    json: {
        name: 'JSON',
        types: ['application/json', 'application/x-json', 'application/manifest+json', 'application/ld+json'],
    },
};

export default MODE_LANGUAGE_MAP;
