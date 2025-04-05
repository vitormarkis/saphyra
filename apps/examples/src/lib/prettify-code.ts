import prettier from "prettier"
import parserBabel from "prettier/plugins/babel"
import parserESTree from "prettier/plugins/estree"

type FormatScriptProps = {
  script: string
}

export function formatScript({ script }: FormatScriptProps) {
  return prettier.format(script, {
    parser: "babel",
    plugins: [parserBabel, parserESTree],
    printWidth: 80,
    // embeddedLanguageFormatting: "auto",
    arrowParens: "avoid",
    trailingComma: "es5",
    tabWidth: 2,
    useTabs: false,
    semi: false,
    singleQuote: false,
    proseWrap: "never",
  })
}
