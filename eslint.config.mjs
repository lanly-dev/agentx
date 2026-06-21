import typescriptEslint from 'typescript-eslint'

export default [{
  files: ['**/*.ts']
}, {
  plugins: {
    '@typescript-eslint': typescriptEslint.plugin
  },

  languageOptions: {
    parser: typescriptEslint.parser,
    ecmaVersion: 2022,
    sourceType: 'module'
  },

  rules: {
    '@typescript-eslint/naming-convention': ['warn', {
      selector: 'import',
      format: ['camelCase', 'PascalCase']
    }],

    'comma-dangle': ['error', 'never'],
    'eol-last': ['error', 'always'],
    'no-throw-literal': 'warn',
    'quote-props': ['error', 'as-needed'],
    'constructor-super': 'warn',
    'no-const-assign': 'warn',
    'no-this-before-super': 'warn',
    'no-undef': 'warn',
    'no-unreachable': 'warn',
    'no-unused-vars': 'warn',
    'valid-typeof': 'warn',
    curly: ['error', 'multi-or-nest'],
    eqeqeq: 'error',
    quotes: ['error', 'single', { allowTemplateLiterals: true }],
    semi: ['error', 'never']
  }
}]
