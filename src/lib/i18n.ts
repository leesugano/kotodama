/**
 * i18n do Kotodama: PT-BR é o padrão e a fonte de verdade das chaves.
 * EN e JA cobrem a UI do app (editor + prompter); o que faltar cai no PT-BR.
 *
 * O locale só muda quando gravado explicitamente em localStorage
 * (kotodama:locale) — sem auto-detect por enquanto, para o HTML do SSR
 * e o da hidratação serem sempre idênticos.
 */
export type Locale = 'pt-BR' | 'en' | 'ja'

const LOCALE_KEY = 'kotodama:locale'

const ptBR = {
  'editor.scripts': 'Roteiros',
  'editor.newScript': 'Novo roteiro',
  'editor.empty':
    'Nenhum roteiro ainda. Comece a escrever e o roteiro é salvo automaticamente.',
  'editor.deleteConfirm': 'Excluir este roteiro?',
  'editor.delete': 'Excluir',
  'editor.cancel': 'Cancelar',
  'editor.rename': 'Renomear',
  'editor.duplicate': 'Duplicar',
  'editor.newTitle': 'Novo título do roteiro',
  'editor.confirmTitle': 'Confirmar título',
  'editor.openList': 'Abrir lista de roteiros',
  'editor.closeList': 'Fechar lista de roteiros',
  'editor.close': 'Fechar',
  'editor.signIn': 'Entrar',
  'editor.signOut': 'Sair',
  'editor.placeholder': 'Cole ou digite seu roteiro',
  'editor.scriptLabel': 'Roteiro',
  'editor.word': 'palavra',
  'editor.words': 'palavras',
  'editor.wpmSuffix': 'a 140 wpm',
  'editor.startHint': 'Comece colando seu texto',
  'editor.start': 'Iniciar prompter',
  'prompter.notFound': 'Roteiro não encontrado',
  'prompter.backToEditor': 'Voltar ao editor →',
  'prompter.controls': 'Controles do prompter',
  'prompter.restart': 'Voltar ao início',
  'prompter.play': 'Reproduzir',
  'prompter.pause': 'Pausar',
  'prompter.space': 'espaço',
  'prompter.speedDown': 'Diminuir velocidade',
  'prompter.speedDownHint': 'seta para baixo',
  'prompter.speedUp': 'Aumentar velocidade',
  'prompter.speedUpHint': 'seta para cima',
  'prompter.speedLabel': 'Velocidade do scroll',
  'prompter.fontDown': 'Diminuir fonte',
  'prompter.fontUp': 'Aumentar fonte',
  'prompter.mirrorH': 'Espelhar horizontal',
  'prompter.mirrorV': 'Espelhar vertical',
  'prompter.fullscreen': 'Tela cheia',
  'prompter.exitFullscreen': 'Sair de tela cheia',
  'prompter.exit': 'Sair do prompter',
  'prompter.settings': 'Ajustes',
  'settings.presets': 'Velocidade',
  'settings.countdown': 'Contagem regressiva',
  'settings.countdownOff': 'Desligada',
  'settings.eyeLine': 'Linha-guia',
  'settings.eyeLinePosition': 'Posição da linha-guia',
  'settings.margin': 'Margens laterais',
  'preset.calm': 'Calmo',
  'preset.natural': 'Natural',
  'preset.fast': 'Rápido',
} as const

export type MessageKey = keyof typeof ptBR

const en: Partial<Record<MessageKey, string>> = {
  'editor.scripts': 'Scripts',
  'editor.newScript': 'New script',
  'editor.empty':
    'No scripts yet. Start writing and your script is saved automatically.',
  'editor.deleteConfirm': 'Delete this script?',
  'editor.delete': 'Delete',
  'editor.cancel': 'Cancel',
  'editor.rename': 'Rename',
  'editor.duplicate': 'Duplicate',
  'editor.newTitle': 'New script title',
  'editor.confirmTitle': 'Confirm title',
  'editor.openList': 'Open script list',
  'editor.closeList': 'Close script list',
  'editor.close': 'Close',
  'editor.signIn': 'Sign in',
  'editor.signOut': 'Sign out',
  'editor.placeholder': 'Paste or type your script',
  'editor.scriptLabel': 'Script',
  'editor.word': 'word',
  'editor.words': 'words',
  'editor.wpmSuffix': 'at 140 wpm',
  'editor.startHint': 'Start by pasting your text',
  'editor.start': 'Start prompter',
  'prompter.notFound': 'Script not found',
  'prompter.backToEditor': 'Back to editor →',
  'prompter.controls': 'Prompter controls',
  'prompter.restart': 'Back to start',
  'prompter.play': 'Play',
  'prompter.pause': 'Pause',
  'prompter.space': 'space',
  'prompter.speedDown': 'Decrease speed',
  'prompter.speedDownHint': 'arrow down',
  'prompter.speedUp': 'Increase speed',
  'prompter.speedUpHint': 'arrow up',
  'prompter.speedLabel': 'Scroll speed',
  'prompter.fontDown': 'Decrease font size',
  'prompter.fontUp': 'Increase font size',
  'prompter.mirrorH': 'Mirror horizontally',
  'prompter.mirrorV': 'Mirror vertically',
  'prompter.fullscreen': 'Fullscreen',
  'prompter.exitFullscreen': 'Exit fullscreen',
  'prompter.exit': 'Exit prompter',
  'prompter.settings': 'Settings',
  'settings.presets': 'Speed',
  'settings.countdown': 'Countdown',
  'settings.countdownOff': 'Off',
  'settings.eyeLine': 'Eye line',
  'settings.eyeLinePosition': 'Eye line position',
  'settings.margin': 'Side margins',
  'preset.calm': 'Calm',
  'preset.natural': 'Natural',
  'preset.fast': 'Fast',
}

const ja: Partial<Record<MessageKey, string>> = {
  'editor.scripts': '原稿',
  'editor.newScript': '新しい原稿',
  'editor.empty': 'まだ原稿がありません。書き始めると自動的に保存されます。',
  'editor.deleteConfirm': 'この原稿を削除しますか？',
  'editor.delete': '削除',
  'editor.cancel': 'キャンセル',
  'editor.rename': '名前を変更',
  'editor.duplicate': '複製',
  'editor.newTitle': '原稿の新しいタイトル',
  'editor.confirmTitle': 'タイトルを確定',
  'editor.openList': '原稿リストを開く',
  'editor.closeList': '原稿リストを閉じる',
  'editor.close': '閉じる',
  'editor.signIn': 'ログイン',
  'editor.signOut': 'ログアウト',
  'editor.placeholder': '原稿を貼り付けるか入力してください',
  'editor.scriptLabel': '原稿',
  'editor.word': '語',
  'editor.words': '語',
  'editor.wpmSuffix': '（140 wpm）',
  'editor.startHint': 'まずテキストを貼り付けてください',
  'editor.start': 'プロンプターを開始',
  'prompter.notFound': '原稿が見つかりません',
  'prompter.backToEditor': 'エディターに戻る →',
  'prompter.controls': 'プロンプターの操作',
  'prompter.restart': '最初に戻る',
  'prompter.play': '再生',
  'prompter.pause': '一時停止',
  'prompter.space': 'スペース',
  'prompter.speedDown': '速度を下げる',
  'prompter.speedDownHint': '下矢印',
  'prompter.speedUp': '速度を上げる',
  'prompter.speedUpHint': '上矢印',
  'prompter.speedLabel': 'スクロール速度',
  'prompter.fontDown': '文字を小さく',
  'prompter.fontUp': '文字を大きく',
  'prompter.mirrorH': '左右反転',
  'prompter.mirrorV': '上下反転',
  'prompter.fullscreen': '全画面表示',
  'prompter.exitFullscreen': '全画面を終了',
  'prompter.exit': 'プロンプターを終了',
  'prompter.settings': '設定',
  'settings.presets': '速度',
  'settings.countdown': 'カウントダウン',
  'settings.countdownOff': 'オフ',
  'settings.eyeLine': 'アイライン',
  'settings.eyeLinePosition': 'アイラインの位置',
  'settings.margin': '左右の余白',
  'preset.calm': 'ゆっくり',
  'preset.natural': '自然',
  'preset.fast': '速い',
}

const dictionaries: Record<Locale, Partial<Record<MessageKey, string>>> = {
  'pt-BR': ptBR,
  en,
  ja,
}

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'pt-BR'
  try {
    const stored = window.localStorage.getItem(LOCALE_KEY)
    if (stored === 'en' || stored === 'ja' || stored === 'pt-BR') return stored
  } catch {
    // storage indisponível: usa o padrão
  }
  return 'pt-BR'
}

export function setLocale(locale: Locale): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    // storage indisponível: segue sem persistir
  }
}

export function t(key: MessageKey): string {
  return dictionaries[getLocale()][key] ?? ptBR[key]
}
