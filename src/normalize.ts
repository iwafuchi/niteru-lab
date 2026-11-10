// 文字（\p{L}、長音記号 ー を含む）と数字（\p{N}）以外。
// 空白・句読点・括弧・記号・絵文字がここに当たる。
// 結合文字（\p{M}）も取り除く。仮名の濁点などは NFKC で前の文字と合成されて残り、
// 単独で残るのは絵文字の異体字セレクタ（U+FE0F）など見た目を変えるための文字だけのため
const NON_TEXT = /[^\p{L}\p{N}]/gu;

/**
 * 比較の前に表記ゆれをそろえる。
 * NFKC で全角・半角や結合文字をそろえ、英字を小文字にし、空白と記号を取り除く。
 * ひらがな・カタカナ・漢字の違いは残す（読みへの変換は別の処理で行う）
 */
export function normalize(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(NON_TEXT, "");
}
