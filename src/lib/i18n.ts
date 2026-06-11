/**
 * Kotodama i18n: English is the default locale and the source of truth for
 * keys. PT-BR and JA cover the app UI (editor + prompter); missing keys fall
 * back to English.
 *
 * The locale only changes when explicitly stored in localStorage
 * (kotodama:locale) — no auto-detect for now, so the SSR HTML and the
 * hydration HTML are always identical.
 */
export type Locale = 'en' | 'pt-BR' | 'ja'

const LOCALE_KEY = 'kotodama:locale'

const en = {
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
  'editor.untitled': 'Untitled',
  'editor.copySuffix': '(copy)',
  'install.cta': 'Install Kotodama',
  'install.dismiss': 'Dismiss install prompt',
  'time.now': 'now',
  'time.minutesAgo': '{n}min ago',
  'time.hoursAgo': '{n}h ago',
  'time.yesterday': 'yesterday',
  'time.daysAgo': '{n} days ago',
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
  'prompter.voice': 'Voice tracking',
  'prompter.camera': 'Camera',
  'prompter.micDenied': 'Microphone access was denied',
  'prompter.cameraDenied': 'Camera access was denied',
  'prompter.voiceUnavailable':
    'Voice tracking failed — check your connection and try again',
  'settings.presets': 'Speed',
  'settings.countdown': 'Countdown',
  'settings.countdownOff': 'Off',
  'settings.eyeLine': 'Eye line',
  'settings.eyeLinePosition': 'Eye line position',
  'settings.margin': 'Side margins',
  'settings.voiceLang': 'Speech language',
  'settings.voiceLangAuto': 'Auto — {lang}',
  'settings.voiceUnsupported':
    'Speech recognition is not supported in this browser',
  'preset.calm': 'Calm',
  'preset.natural': 'Natural',
  'preset.fast': 'Fast',
} as const

export type MessageKey = keyof typeof en

const ptBR: Partial<Record<MessageKey, string>> = {
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
  'editor.untitled': 'Sem título',
  'editor.copySuffix': '(cópia)',
  'install.cta': 'Instalar o Kotodama',
  'install.dismiss': 'Dispensar convite de instalação',
  'time.now': 'agora',
  'time.minutesAgo': 'há {n}min',
  'time.hoursAgo': 'há {n}h',
  'time.yesterday': 'ontem',
  'time.daysAgo': 'há {n} dias',
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
  'prompter.voice': 'Acompanhar voz',
  'prompter.camera': 'Câmera',
  'prompter.micDenied': 'O acesso ao microfone foi negado',
  'prompter.cameraDenied': 'O acesso à câmera foi negado',
  'prompter.voiceUnavailable':
    'O acompanhamento de voz falhou — verifique a conexão e tente de novo',
  'settings.presets': 'Velocidade',
  'settings.countdown': 'Contagem regressiva',
  'settings.countdownOff': 'Desligada',
  'settings.eyeLine': 'Linha-guia',
  'settings.eyeLinePosition': 'Posição da linha-guia',
  'settings.margin': 'Margens laterais',
  'settings.voiceLang': 'Idioma da fala',
  'settings.voiceLangAuto': 'Automático — {lang}',
  'settings.voiceUnsupported':
    'O reconhecimento de voz não é suportado neste navegador',
  'preset.calm': 'Calmo',
  'preset.natural': 'Natural',
  'preset.fast': 'Rápido',
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
  'editor.untitled': '無題',
  'editor.copySuffix': '（コピー）',
  'install.cta': 'Kotodamaをインストール',
  'install.dismiss': 'インストールの案内を閉じる',
  'time.now': 'たった今',
  'time.minutesAgo': '{n}分前',
  'time.hoursAgo': '{n}時間前',
  'time.yesterday': '昨日',
  'time.daysAgo': '{n}日前',
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
  'prompter.voice': '音声に追従',
  'prompter.camera': 'カメラ',
  'prompter.micDenied': 'マイクへのアクセスが拒否されました',
  'prompter.cameraDenied': 'カメラへのアクセスが拒否されました',
  'prompter.voiceUnavailable':
    '音声トラッキングに失敗しました — 接続を確認してもう一度お試しください',
  'settings.presets': '速度',
  'settings.countdown': 'カウントダウン',
  'settings.countdownOff': 'オフ',
  'settings.eyeLine': 'アイライン',
  'settings.eyeLinePosition': 'アイラインの位置',
  'settings.margin': '左右の余白',
  'settings.voiceLang': '音声の言語',
  'settings.voiceLangAuto': '自動 — {lang}',
  'settings.voiceUnsupported': 'このブラウザは音声認識に対応していません',
  'preset.calm': 'ゆっくり',
  'preset.natural': '自然',
  'preset.fast': '速い',
}

const dictionaries: Record<Locale, Partial<Record<MessageKey, string>>> = {
  en,
  'pt-BR': ptBR,
  ja,
}

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  try {
    const stored = window.localStorage.getItem(LOCALE_KEY)
    if (stored === 'en' || stored === 'ja' || stored === 'pt-BR') return stored
  } catch {
    // storage unavailable: use the default
  }
  return 'en'
}

export function setLocale(locale: Locale): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    // storage unavailable: continue without persisting
  }
}

export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  let message = dictionaries[getLocale()][key] ?? en[key]
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      message = message.replaceAll(`{${name}}`, String(value))
    }
  }
  return message
}
