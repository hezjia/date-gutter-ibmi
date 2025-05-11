import globals from "globals";

export default [
    {
        files: ["extension.js"],
        ignores: ["**/node_modules/**", "**/test/**"],
        languageOptions: {
            globals: {
                ...globals.commonjs,
                ...globals.node,
                ...globals.mocha,
            },
            ecmaVersion: 2022,
            sourceType: "module",
        },
        rules: {
            "no-const-assign": "warn",
            "no-this-before-super": "warn",
            "no-undef": "warn",
            "no-unreachable": "warn",
            "no-unused-vars": "warn",
            "constructor-super": "warn",
            "valid-typeof": "warn",
        },
    },
    {
        files: ["test/**/*.js"],
        ignores: ["**/node_modules/**"],
        languageOptions: {
            globals: {
                ...globals.commonjs,
                ...globals.node,
                ...globals.mocha,
            },
            ecmaVersion: 2022,
            sourceType: "module",
        },
        rules: {
            "no-const-assign": "warn",
            "no-undef": "warn",
            "no-unused-vars": "warn",
        },
    },
    {
        files: ["**/*.mjs"],
        languageOptions: {
            globals: {
                ...globals.commonjs,
                ...globals.node,
            },
            ecmaVersion: 2022,
            sourceType: "module",
        },
        rules: {
            "no-const-assign": "warn",
            "no-undef": "warn",
        },
    }
];